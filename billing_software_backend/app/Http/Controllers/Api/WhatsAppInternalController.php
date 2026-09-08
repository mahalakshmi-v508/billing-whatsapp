<?php

namespace App\Http\Controllers\Api;

use App\Events\WhatsAppMessageStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\WhatsAppConnection;
use App\Models\WhatsAppEvent;
use App\Models\WhatsAppMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WhatsAppInternalController extends Controller
{
    // ── RECEIVE EVENTS FROM NODE WHATSAPP SERVICE ──
    public function event(Request $request)
    {
        // internal token check
        $expected = config('services.whatsapp.token');
        $given = $request->header('X-Internal-Token');

        if (empty($given) && str_starts_with($request->header('Authorization', ''), 'Bearer ')) {
            $given = substr($request->header('Authorization'), 7);
        }

        if (!empty($expected) && $given !== $expected) {
            return response()->json([
                "status" => false,
                "message" => "Unauthorized"
            ], 401);
        }

        $payload = $request->all();
        unset($payload['session_id']);
        $eventName = $payload['event'] ?? null;

        $connection = WhatsAppConnection::where(
            'session_id',
            $request->input('session_id')
        )->first();

        // delivery / read receipt updates — process BEFORE connection check
        // because message_ack is matched by whatsapp_message_id, not connection
        if ($eventName === 'message_ack' && !empty($payload['message']['id'])) {

            $waMsgId = $payload['message']['id'];
            $ack = intval($payload['message']['ack'] ?? 0);

            $msgModel = WhatsAppMessage::where('whatsapp_message_id', $waMsgId)->first();

            $deliveredAt = null;
            $readAt = null;

            if ($msgModel) {
                $now = now();

                if ($ack >= 3) {
                    $msgModel->status = 'read';
                    $msgModel->read_at = $msgModel->read_at ?? $now;
                    $msgModel->delivered_at = $msgModel->delivered_at ?? $now;
                } elseif ($ack >= 2) {
                    if ($msgModel->status !== 'read') {
                        $msgModel->status = 'delivered';
                        $msgModel->delivered_at = $msgModel->delivered_at ?? $now;
                    }
                } elseif ($ack >= 1 && $msgModel->status === 'pending') {
                    $msgModel->status = 'sent';
                }

                $msgModel->save();

                $deliveredAt = $msgModel->delivered_at ? $msgModel->delivered_at->toDateTimeString() : null;
                $readAt = $msgModel->read_at ? $msgModel->read_at->toDateTimeString() : null;
            }

            // Always broadcast status update event for realtime Echo listeners
            event(new WhatsAppMessageStatusUpdated(
                whatsapp_message_id: $waMsgId,
                status: $ack,
                delivered_at: $deliveredAt,
                read_at: $readAt
            ));

            return response()->json([
                "status" => true
            ]);
        }

        if (!$connection) {
            // Orphaned session (folder exists on disk but DB row was deleted).
            // Return success to prevent Node.js from retrying.
            return response()->json([
                "status" => true,
                "message" => "Connection not found — ignored"
            ]);
        }

        // log event for debugging (skip ack spam)
        try {
            $logPayload = $payload;
            if (is_array($logPayload) && isset($logPayload['message']) && is_array($logPayload['message'])) {
                unset($logPayload['message']['media_base64']);
            }
            WhatsAppEvent::create([
                'connection_id' => $connection->id,
                'event' => $eventName ?? ($payload['status'] ?? 'unknown'),
                'payload' => json_encode($logPayload)
            ]);
        } catch (\Exception $e) {
            // ignore logging errors
        }

        // incoming message from customer
        if (($payload['event'] ?? null) === 'message' && !empty($payload['message'])) {
            $msg = $payload['message'];

            $from = $msg['from'] ?? '';
            $lidFrom = $msg['lid_from'] ?? '';

            // prefer the real phone digits resolved by the node service —
            // WhatsApp LID addresses (<digits>@lid) are NOT customer phones
            $phone = preg_replace('/[^0-9]/', '', (string) ($msg['phone'] ?? ''));

            // If Node could not resolve a real phone yet (e.g. LID mapping not
            // cached after a restart), recover it from prior events for the same
            // LID chat. whatsapp_events persists the original payload which held
            // both "lid_from" and the resolved "phone". The history may contain
            // stale LID-digit values, so only accept a candidate that matches a
            // real known customer/invoice (never trust an unvalidated number).
            if ($phone === '') {
                $chatIdentity = $lidFrom ?: $from;

                if (str_ends_with($chatIdentity, '@lid') && $chatIdentity !== '') {
                    $candidates = WhatsAppEvent::where('connection_id', $connection->id)
                        ->where('event', 'message')
                        ->orderByDesc('id')
                        ->get(['payload'])
                        ->map(function ($row) use ($chatIdentity) {
                            $p = json_decode($row->payload, true);
                            $m = $p['message'] ?? [];
                            $lid = $m['lid_from'] ?? ($m['from'] ?? '');
                            $ph = preg_replace('/[^0-9]/', '', (string) ($m['phone'] ?? ''));
                            return ($lid === $chatIdentity) ? $ph : '';
                        })
                        ->filter(fn ($ph) => strlen($ph) >= 10)
                        ->values();

                    foreach ($candidates as $candidatePhone) {
                        $candidateLast10 = substr($candidatePhone, -10);
                        if (strlen($candidateLast10) === 10 && (
                            DB::table('customers')
                                ->whereRaw('RIGHT(phone, 10) = ?', [$candidateLast10])
                                ->exists()
                            || DB::table('invoices')
                                ->whereRaw('RIGHT(customer_phone, 10) = ?', [$candidateLast10])
                                ->exists()
                        )) {
                            $phone = $candidatePhone;
                            break;
                        }
                    }
                }

                // As a secondary source, reuse a phone already stored for this
                // exact chat identity (used when the chat was recorded as @s.whatsapp.net).
                if ($phone === '' && $chatIdentity !== '') {
                    $knownChatPhone = WhatsAppMessage::where('chat_id', $chatIdentity)
                        ->whereNotNull('customer_phone')
                        ->where('customer_phone', '!=', '')
                        ->orderByDesc('id')
                        ->value('customer_phone');

                    if ($knownChatPhone) {
                        $phone = preg_replace('/[^0-9]/', '', (string) $knownChatPhone);
                    }
                }
            }

            // As a final fallback only for a real @s.whatsapp.net / @c.us user JID,
            // strip the domain. Never use @lid digits as a phone number.
            if ($phone === '' && preg_match('/@(?:s\.whatsapp\.net|c\.us)$/', $from)) {
                $phone = preg_replace('/[^0-9]/', '', str_replace(['@c.us', '@s.whatsapp.net'], '', $from));
            }

            // skip own messages
            if (!($msg['fromMe'] ?? false)) {

                // Only store message if the sender is a known customer
                // or has an existing invoice in the billing system.
                // This prevents unknown WhatsApp contacts from appearing
                // in the application's contact list.
                $last10 = substr($phone, -10);

                $knownPhone = strlen($last10) === 10 && (
                    DB::table('customers')
                        ->whereRaw('RIGHT(phone, 10) = ?', [$last10])
                        ->exists()
                    || DB::table('invoices')
                        ->whereRaw('RIGHT(customer_phone, 10) = ?', [$last10])
                        ->exists()
                );

                if (!$knownPhone) {
                    // Unknown number — event is already logged in whatsapp_events above.
                    // Do NOT create a whatsapp_messages record for it.
                    return response()->json([
                        "status" => true
                    ]);
                }

                // Avoid creating duplicate rows if literature services re-deliver
                // the same upsert (notify + append) or resend on reconnect.
                $waMessageId = $msg['id'] ?? null;

                if ($waMessageId) {
                    $exists = WhatsAppMessage::where('whatsapp_message_id', $waMessageId)
                        ->where('direction', 'incoming')
                        ->exists();

                    if ($exists) {
                        return response()->json([
                            "status" => true
                        ]);
                    }
                }

                // Persist incoming media (image/video/document) that the Node
                // service downloaded, so the dashboard can render a real preview.
                // Mirrors the outgoing storage convention under public/uploads.
                $msgType = $msg['type'] ?? 'text';
                $mediaUrl = null;
                $mimeType = null;

                if (!empty($msg['media_base64'])) {
                    $mediaBytes = base64_decode((string) $msg['media_base64'], true);
                    $mimeType = $msg['media_mimetype'] ?? null;
                    $mediaExt = $msg['media_ext'] ?? null;

                    if ($mediaBytes !== false && $mediaBytes !== '') {
                        $mediaUrl = $this->storeMedia(
                            $connection->company_id,
                            (string) ($msg['media_name'] ?? ''),
                            $mimeType,
                            $mediaExt,
                            $mediaBytes
                        );
                    }
                }

                WhatsAppMessage::create([
                    'connection_id' => $connection->id,
                    'company_id' => $connection->company_id,
                    'whatsapp_message_id' => $waMessageId,
                    'customer_phone' => $phone,
                    'chat_id' => $from,
                    'direction' => 'incoming',
                    'message_type' => $msgType,
                    'message' => $msg['body'] ?? '',
                    'media_name' => $msg['media_name'] ?? null,
                    'mime_type' => $mimeType,
                    'media_url' => $mediaUrl,
                    'status' => 'received'
                ]);
            }
        }

        // opponent deleted a message for everyone
        if (($payload['event'] ?? null) === 'delete' && !empty($payload['message']['id'])) {

            $dm = $payload['message'];
            $delId = $dm['id'];

            // Mark the EXISTING incoming message deleted in place. Never insert a
            // new/blank row — the original bubble must become the placeholder.
            $updated = WhatsAppMessage::where('whatsapp_message_id', $delId)
                ->where('direction', 'incoming')
                ->where('is_deleted', '!=', 2)
                ->update(['is_deleted' => 2, 'updated_at' => now()]);

            if ($updated) {
                \Log::info("WA delete sync: incoming message {$delId} marked deleted");
            } else {
                \Log::warning("WA delete sync: original incoming message {$delId} NOT found — no blank row created (remote_jid=" . ($dm['remoteJid'] ?? 'null') . ")");
            }

            $connection->save();

            return response()->json([
                "status" => true
            ]);
        }

        // connection status updates
        $status = $payload['status'] ?? null;

        if ($status) {
            $connection->status = $status;
        }

        if ($request->input('phone_number')) {
            $connection->phone_number = $request->input('phone_number');
        }

        if ($request->input('display_name')) {
            $connection->display_name = $request->input('display_name');
        }

        if ($status === 'qr_ready') {
            $connection->last_qr_at = now();
        }

        if ($status === 'ready') {
            $connection->connected_at = now();
        }

        if ($status === 'disconnected') {
            $connection->disconnected_at = now();
        }

        $connection->save();

        return response()->json([
            "status" => true
        ]);
    }

    // ── VALIDATE SESSIONS — Node service calls this at startup to skip orphaned folders ──
    public function validateSessions(Request $request)
    {
        $expected = config('services.whatsapp.token');
        $given = $request->header('X-Internal-Token');

        if (empty($given) && str_starts_with($request->header('Authorization', ''), 'Bearer ')) {
            $given = substr($request->header('Authorization'), 7);
        }

        if (!empty($expected) && $given !== $expected) {
            return response()->json(["status" => false, "message" => "Unauthorized"], 401);
        }

        $sessionIds = $request->input('session_ids', []);

        $existing = WhatsAppConnection::whereIn('session_id', $sessionIds)
            ->pluck('session_id')
            ->toArray();

        return response()->json([
            "status" => true,
            "valid_sessions" => $existing
        ]);
    }

    // Store a decoded incoming media file under public/uploads/whatsapp/{company_id}
    // and return the web-relative path (uploads convention). Returns null on failure.
    private function storeMedia(int $companyId, string $filename, ?string $mimetype, ?string $mediaExt, string $bytes): ?string
    {
        $ext = null;

        if (is_string($mediaExt) && $mediaExt !== '') {
            $candidate = strtolower(ltrim($mediaExt, '.'));
            if (preg_match('/^[a-z0-9]{1,10}$/i', $candidate)) {
                $ext = $candidate;
            }
        }

        if ($ext === null && is_string($mimetype) && $mimetype !== '') {
            $cleanMime = strtolower(trim(explode(';', $mimetype)[0]));
            $extMap = [
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp',
                'image/gif'  => 'gif',
                'image/bmp'  => 'bmp',
                'video/mp4'  => 'mp4',
                'application/pdf' => 'pdf',
                'application/msword' => 'doc',
                'text/plain' => 'txt',
            ];
            $ext = $extMap[$cleanMime] ?? null;
        }

        if ($ext === null || !preg_match('/^[a-z0-9]{1,10}$/i', $ext)) {
            $ext = 'dat';
        }

        $dir = public_path('uploads/whatsapp/' . intval($companyId));
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }

        if ($filename === '' || $filename === null) {
            $filename = 'media';
        }
        $safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
        if ($safeBase === '' || $safeBase === '_') {
            $safeBase = 'media';
        }
        $safeBase = substr($safeBase, 0, 80);
        $name = $safeBase . '-' . substr(uniqid('', true), -8) . '.' . $ext;

        if (file_put_contents($dir . '/' . $name, $bytes) === false) {
            return null;
        }

        return 'uploads/whatsapp/' . intval($companyId) . '/' . $name;
    }
}
