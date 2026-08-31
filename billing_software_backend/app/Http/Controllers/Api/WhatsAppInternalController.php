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
            WhatsAppEvent::create([
                'connection_id' => $connection->id,
                'event' => $eventName ?? ($payload['status'] ?? 'unknown'),
                'payload' => json_encode($payload)
            ]);
        } catch (\Exception $e) {
            // ignore logging errors
        }

        // incoming message from customer
        if (($payload['event'] ?? null) === 'message' && !empty($payload['message'])) {

            $msg = $payload['message'];

            $from = $msg['from'] ?? '';

            // prefer the real phone digits resolved by the node service —
            // WhatsApp LID addresses (<digits>@lid) are NOT customer phones
            $phone = preg_replace('/[^0-9]/', '', (string) ($msg['phone'] ?? ''));

            if ($phone === '') {
                $phone = preg_replace('/[^0-9]/', '', str_replace(['@c.us', '@lid'], '', $from));
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

                WhatsAppMessage::create([
                    'connection_id' => $connection->id,
                    'company_id' => $connection->company_id,
                    'whatsapp_message_id' => $msg['id'] ?? null,
                    'customer_phone' => $phone,
                    'chat_id' => $from,
                    'direction' => 'incoming',
                    'message_type' => $msg['type'] ?? 'text',
                    'message' => $msg['body'] ?? '',
                    'media_name' => $msg['media_name'] ?? null,
                    'status' => 'received'
                ]);
            }
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
}
