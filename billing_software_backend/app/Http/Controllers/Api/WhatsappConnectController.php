<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppConnection;
use App\Models\WhatsAppMessage;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WhatsappConnectController extends Controller
{
    // ── GET CONNECTION STATUS (FOR REACT POLLING) ──
    public function getStatus(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = $request->input('company_id', $request->query('company_id'));

        if (empty($company_id)) {
            return response()->json([
                "status" => false,
                "message" => "company_id is required."
            ]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection) {
            return response()->json([
                "status" => true,
                "connected" => false,
                "data" => [
                    "status" => "disconnected",
                    "qr" => null,
                    "phone" => null,
                    "name" => null
                ]
            ]);
        }

        // live status from node service, fallback to db status
        try {
            if ($whatsapp->isConfigured()) {
                $remote = $whatsapp->status($connection->session_id);
                $state = $remote['state'] ?? null;

                if ($state && !empty($state['status'])) {
                    return response()->json([
                        "status" => true,
                        "connected" => $state['status'] === 'ready',
                        "data" => [
                            "status" => $state['status'],
                            "qr" => $state['qr'] ?? null,
                            "phone" => $state['phone'] ?? $connection->phone_number,
                            "name" => $state['name'] ?? $connection->display_name
                        ]
                    ]);
                }
            }
        } catch (\Exception $e) {
            // node service down - report db status
        }

        return response()->json([
            "status" => true,
            "connected" => $connection->status === 'ready',
            "data" => [
                "status" => $connection->status,
                "qr" => null,
                "phone" => $connection->phone_number,
                "name" => $connection->display_name
            ]
        ]);
    }

    // ── CONNECT (GENERATE QR) ──
    public function connect(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = $request->input('company_id');
        $user_id = $request->input('user_id');

        if (empty($company_id)) {
            return response()->json([
                "status" => false,
                "message" => "company_id is required."
            ]);
        }

        if (!$whatsapp->isConfigured()) {
            return response()->json([
                "status" => false,
                "message" => "WhatsApp service is not configured."
            ]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection) {
            $connection = WhatsAppConnection::create([
                'company_id' => $company_id,
                'user_id' => $user_id,
                'session_id' => 'company_' . $company_id . '_' . Str::random(8),
                'status' => 'initializing'
            ]);
        } else {
            $connection->status = 'initializing';
            $connection->save();
        }

        try {
            $result = $whatsapp->connect($connection->session_id);
        } catch (\Exception $e) {
            $connection->status = 'disconnected';
            $connection->save();

            return response()->json([
                "status" => false,
                "message" => "WhatsApp service is not reachable. Start the whatsapp-service (node src/server.js).",
                "data" => $e->getMessage()
            ]);
        }

        return response()->json([
            "status" => true,
            "message" => "Connecting to WhatsApp. Scan the QR code.",
            "data" => [
                "session_id" => $connection->session_id,
                "result" => $result
            ]
        ]);
    }

    // ── DISCONNECT ──
    public function disconnect(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = $request->input('company_id');

        if (empty($company_id)) {
            return response()->json([
                "status" => false,
                "message" => "company_id is required."
            ]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection) {
            return response()->json([
                "status" => false,
                "message" => "WhatsApp is not connected."
            ]);
        }

        try {
            if ($whatsapp->isConfigured()) {
                $whatsapp->disconnect($connection->session_id);
            }
        } catch (\Exception $e) {
            // still mark disconnected in db
        }

        $connection->status = 'disconnected';
        $connection->phone_number = null;
        $connection->display_name = null;
        $connection->disconnected_at = now();
        $connection->save();

        return response()->json([
            "status" => true,
            "message" => "WhatsApp disconnected successfully."
        ]);
    }

    // ── SEND TEXT MESSAGE ──
    public function sendMessage(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = $request->input('company_id');
        $phone = $request->input('phone', '');
        $message = $request->input('message', '');
        $replyToInput = $request->input('reply_to_message_id');

        if (empty($company_id)) {
            return response()->json([
                "status" => false,
                "message" => "company_id is required."
            ]);
        }

        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) === 10) {
            $phone = "91" . $phone;
        }

        if (empty($phone) || empty($message)) {
            return response()->json([
                "status" => false,
                "message" => "Valid phone and message are required."
            ]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection || $connection->status !== 'ready') {
            return response()->json([
                "status" => false,
                "message" => "WhatsApp is not connected. Connect it from Settings > WhatsApp."
            ]);
        }

        // Resolve the message being replied to so the recipient sees a real
        // WhatsApp quoted reply (and so the chat history persists the link).
        $original = null;
        $replyTo = null;
        if (!empty($replyToInput)) {
            $original = WhatsAppMessage::where('id', $replyToInput)
                ->orWhere('whatsapp_message_id', $replyToInput)
                ->first();

            if ($original) {
                $replyTo = [
                    'id' => $original->whatsapp_message_id ?: null,
                    'from_me' => $original->direction === 'outgoing',
                    'remote_jid' => $this->chatJidForQuote($original->chat_id),
                    'text' => $this->quoteTextFor($original),
                ];
            }
        }

        try {
            $result = $whatsapp->sendMessage($connection->session_id, $phone, $message, $replyTo);
        } catch (\Exception $e) {
            return response()->json([
                "status" => false,
                "message" => "Failed to send message.",
                "data" => $e->getMessage()
            ]);
        }

        $msg = WhatsAppMessage::create([
            'connection_id' => $connection->id,
            'company_id' => $company_id,
            'whatsapp_message_id' => $result['result']['id'] ?? null,
            'customer_phone' => $phone,
            'chat_id' => $phone . '@c.us',
            'direction' => 'outgoing',
            'message_type' => 'text',
            'message' => $message,
            'reply_to_message_id' => $original ? $original->id : null,
            'status' => 'sent',
            'sent_at' => now()
        ]);

        return response()->json([
            "status" => true,
            "message" => "Message sent successfully.",
            "data" => array_merge(is_array($result) ? $result : ['result' => $result], [
                'id' => $msg->id,
                'whatsapp_message_id' => $msg->whatsapp_message_id,
                'reply_to_message_id' => $msg->reply_to_message_id
            ])
        ]);
    }

    // ── HELPERS FOR WHATSAPP QUOTED REPLIES ──
    private function chatJidForQuote(?string $chatId): ?string
    {
        $chatId = (string) $chatId;
        if (preg_match('/@s\.whatsapp\.net$/i', $chatId)) {
            return $chatId;
        }
        if (preg_match('/@c\.us$/i', $chatId)) {
            return preg_replace('/@c\.us$/i', '@s.whatsapp.net', $chatId);
        }
        return null;
    }

    private function quoteTextFor(WhatsAppMessage $m): string
    {
        $media = (string) $m->media_name;
        if ($m->message_type === 'document' && $media !== '') {
            $inv = preg_replace('/\.pdf$/i', '', $media);
            return $inv !== '' ? $inv : $media;
        }
        $text = trim((string) $m->message);
        return $text !== '' ? $text : ($media !== '' ? $media : 'Message');
    }

    // ── SEND INVOICE PDF VIA WHATSAPP ──
    public function sendInvoice(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = $request->input('company_id');
        $invoice_no = $request->input('invoice_no', '');
        $phone = $request->input('phone', '');
        $pdf_base64 = $request->input('pdf_base64', '');
        $filename = $request->input('filename', '');
        $caption = $request->input('caption', '');

        if (empty($company_id)) {
            return response()->json([
                "status" => false,
                "message" => "company_id is required."
            ]);
        }

        $invoice = \App\Models\Invoice::where('invoice_no', $invoice_no)->first();

        if ($invoice && empty($phone)) {
            $phone = $invoice->customer_phone;
        }

        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) === 10) {
            $phone = "91" . $phone;
        }

        if (empty($phone)) {
            return response()->json([
                "status" => false,
                "message" => "Valid customer phone number is required."
            ]);
        }

        if (empty($pdf_base64)) {
            return response()->json([
                "status" => false,
                "message" => "PDF file is required."
            ]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection || $connection->status !== 'ready') {
            return response()->json([
                "status" => false,
                "message" => "WhatsApp is not connected. Connect it from Settings > WhatsApp."
            ]);
        }

        if (empty($filename)) {
            $filename = ($invoice_no ?: 'invoice') . '.pdf';
        }

        if (empty($caption)) {
            $customer_name = $invoice->customer_name ?? '';
            $amount = $invoice ? "₹" . number_format((float)$invoice->total_amount, 2) : '';

            $caption = "Hello {$customer_name} 👋\n\n"
                . "Please find your invoice attached.\n\n"
                . "Invoice: {$invoice_no}\n"
                . ($amount ? "Amount: {$amount}\n\n" : "\n")
                . "Thank you for your business.";
        }

        try {
            $result = $whatsapp->sendDocumentBase64(
                $connection->session_id,
                $phone,
                $pdf_base64,
                'application/pdf',
                $filename,
                $caption
            );
        } catch (\Exception $e) {
            return response()->json([
                "status" => false,
                "message" => "Failed to send invoice via WhatsApp.",
                "data" => $e->getMessage()
            ]);
        }

        $msg = WhatsAppMessage::create([
            'connection_id' => $connection->id,
            'company_id' => $company_id,
            'whatsapp_message_id' => $result['result']['id'] ?? null,
            'customer_phone' => $phone,
            'chat_id' => $phone . '@c.us',
            'direction' => 'outgoing',
            'message_type' => 'document',
            'message' => $caption,
            'media_name' => $filename,
            'status' => 'sent',
            'sent_at' => now()
        ]);

        return response()->json([
            "status" => true,
            "message" => "Invoice sent successfully via WhatsApp.",
            "data" => array_merge(is_array($result) ? $result : ['result' => $result], [
                'id' => $msg->id,
                'whatsapp_message_id' => $msg->whatsapp_message_id
            ])
        ]);
    }

    // ── SEND ANY DOCUMENT / PHOTO / FILE VIA WHATSAPP (FROM CHAT UI) ──
    public function sendFile(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = intval($request->input('company_id', 0));
        $phone      = preg_replace('/[^0-9]/', '', (string) $request->input('phone', ''));
        $base64     = (string) $request->input('file_base64', '');
        $mimetype   = (string) $request->input('mimetype', 'application/octet-stream');
        $filename   = (string) $request->input('filename', '');
        $caption    = (string) $request->input('caption', '');

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id is required."]);
        }

        if (strlen($phone) === 10) {
            $phone = "91" . $phone;
        }

        if (empty($phone) || empty($base64)) {
            return response()->json(["status" => false, "message" => "Valid phone and file are required."]);
        }

        if (empty($filename)) {
            $extMap = [
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp',
                'image/gif'  => 'gif',
                'application/pdf' => 'pdf'
            ];
            $ext = $extMap[$mimetype] ?? 'dat';
            $filename = 'file-' . time() . '.' . $ext;
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection || $connection->status !== 'ready') {
            return response()->json([
                "status"  => false,
                "message" => "WhatsApp is not connected."
            ]);
        }

        try {
            $result = $whatsapp->sendDocumentBase64(
                $connection->session_id,
                $phone,
                $base64,
                $mimetype,
                $filename,
                $caption
            );
        } catch (\Exception $e) {
            return response()->json([
                "status"  => false,
                "message" => "Failed to send file via WhatsApp.",
                "data"    => $e->getMessage()
            ]);
        }

        // log with the REAL whatsapp message type
        $type = str_starts_with($mimetype, 'image/') ? 'image' : 'document';

        $msg = WhatsAppMessage::create([
            'connection_id'       => $connection->id,
            'company_id'          => $company_id,
            'whatsapp_message_id' => $result['result']['id'] ?? null,
            'customer_phone'      => $phone,
            'chat_id'             => $phone . '@c.us',
            'direction'           => 'outgoing',
            'message_type'        => $type,
            'message'             => $caption,
            'media_name'          => $filename,
            'status'              => 'sent',
            'sent_at'             => now()
        ]);

        return response()->json([
            "status"  => true,
            "message" => "File sent successfully via WhatsApp.",
            "data"    => [
                "id" => $msg->id,
                "whatsapp_message_id" => $msg->whatsapp_message_id
            ]
        ]);
    }

    // ── HELPERS FOR CHAT ──
    private function previewFor($row): string
    {
        if ($row->message_type === 'document') {
            $invoice_no = preg_replace('/\.pdf$/i', '', (string) $row->media_name);
            return $invoice_no !== '' ? $invoice_no : 'Document';
        }

        if ($row->message_type === 'image') {
            return (string) $row->media_name !== '' ? $row->media_name : 'Photo';
        }

        $text = trim((string) $row->message);
        return $text !== '' ? mb_substr($text, 0, 60) : 'Message';
    }

    // ── WHATSAPP CHAT CONTACT LIST — ONLY CUSTOMERS FROM BILLING SYSTEM ──
    public function getChats(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        // Only phones that have real message history AND match a known customer
        // or invoice in the billing system. This prevents unknown WhatsApp
        // contacts from appearing in the application's contact list.
        $phonesWithHistory = DB::table('whatsapp_messages as wm')
            ->where('wm.company_id', $company_id)
            ->where(function ($q) {
                $q->whereNull('wm.is_deleted')->orWhere('wm.is_deleted', 0);
            })
            ->where(function ($query) {
                $query->whereExists(function ($sub) {
                    $sub->select(DB::raw(1))
                        ->from('customers as c')
                        ->whereRaw('RIGHT(wm.customer_phone, 10) = RIGHT(c.phone, 10)');
                })->orWhereExists(function ($sub) {
                    $sub->select(DB::raw(1))
                        ->from('invoices as i')
                        ->whereRaw('RIGHT(wm.customer_phone, 10) = RIGHT(i.customer_phone, 10)');
                });
            })
            ->groupBy('wm.customer_phone')
            ->pluck('wm.customer_phone');

        if ($phonesWithHistory->isEmpty()) {
            return response()->json(["status" => true, "data" => []]);
        }

        // last message per phone (greatest-per-group)
        $lastIds = DB::table('whatsapp_messages')
            ->select('customer_phone', DB::raw('MAX(id) as last_id'))
            ->where('company_id', $company_id)
            ->where(function ($q) {
                $q->whereNull('is_deleted')->orWhere('is_deleted', 0);
            })
            ->whereIn('customer_phone', $phonesWithHistory)
            ->groupBy('customer_phone');

        $rows = DB::table('whatsapp_messages as wm')
            ->joinSub($lastIds, 'last', function ($join) {
                $join->on('wm.id', '=', 'last.last_id');
            })
            ->leftJoin('customers as c', function ($join) {
                $join->on(DB::raw('RIGHT(wm.customer_phone, 10)'), '=', DB::raw('RIGHT(c.phone, 10)'));
            })
            ->whereIn('wm.customer_phone', $phonesWithHistory)
            ->where('wm.company_id', $company_id)
            ->orderByDesc('wm.id')
            ->get([
                'wm.id',
                'wm.customer_phone',
                DB::raw('COALESCE(NULLIF(c.name, ""), wm.customer_phone) as customer_name'),
                'c.phone as customer_raw_phone',
                'wm.direction',
                'wm.message_type',
                'wm.message',
                'wm.media_name',
                'wm.status',
                'wm.created_at'
            ]);

        // unread incoming counts per phone
        $unreads = DB::table('whatsapp_messages')
            ->where('company_id', $company_id)
            ->where('direction', 'incoming')
            ->where('status', 'received')
            ->where(function ($q) {
                $q->whereNull('is_deleted')->orWhere('is_deleted', 0);
            })
            ->whereIn('customer_phone', $phonesWithHistory)
            ->groupBy('customer_phone')
            ->pluck(DB::raw('COUNT(*)'), 'customer_phone');

        $data = [];
        foreach ($rows as $row) {
            $data[] = [
                'phone'         => $row->customer_phone,
                'name'          => $row->customer_name,
                'raw_phone'     => $row->customer_raw_phone,
                'preview'       => $this->previewFor($row),
                'last_direction'=> $row->direction,
                'last_type'     => $row->message_type,
                'last_status'   => $row->status,
                'last_time'     => $row->created_at,
                'unread'        => isset($unreads[$row->customer_phone]) ? (int) $unreads[$row->customer_phone] : 0
            ];
        }

        return response()->json(["status" => true, "data" => $data]);
    }

    // ── SINGLE CUSTOMER CHAT HISTORY (CHRONOLOGICAL) ──
    public function getMessages(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $phone = preg_replace('/[^0-9]/', '', (string) $request->input('phone', $request->query('phone', '')));

        if (!$company_id || !$phone) {
            return response()->json(["status" => false, "message" => "company_id and phone required"]);
        }

        // Safety net: only allow viewing messages for known customers
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
            return response()->json(["status" => true, "data" => []]);
        }

        $messages = DB::table('whatsapp_messages as wm')
            ->leftJoin('customers as c', function ($join) {
                $join->on(DB::raw('RIGHT(wm.customer_phone, 10)'), '=', DB::raw('RIGHT(c.phone, 10)'));
            })
            ->where('wm.company_id', $company_id)
            ->where('wm.customer_phone', $phone)
            ->where(function ($q) {
                $q->whereNull('wm.is_deleted')
                  ->orWhere('wm.is_deleted', 0)
                  ->orWhere('wm.is_deleted', 2);
            })
            ->orderBy('wm.id')
            ->get([
                'wm.id',
                'wm.whatsapp_message_id',
                'wm.customer_phone',
                'wm.direction',
                'wm.message_type',
                'wm.message',
                'wm.media_name',
                'wm.reply_to_message_id',
                'wm.is_edited',
                'wm.is_deleted',
                'wm.status',
                'wm.created_at',
                DB::raw('COALESCE(NULLIF(c.name, ""), wm.customer_phone) as customer_name')
            ]);

        // attach invoice info to document messages via media_name = "{invoice_no}.pdf"
        $invoiceNos = [];
        foreach ($messages as $m) {
            if ($m->message_type === 'document' && $m->media_name) {
                $inv = preg_replace('/\.pdf$/i', '', $m->media_name);
                if ($inv !== '') {
                    $invoiceNos[] = $inv;
                }
            }
        }

        $invoices = [];
        if (!empty($invoiceNos)) {
            $invRows = DB::table('invoices')
                ->whereIn('invoice_no', array_unique($invoiceNos))
                ->get(['invoice_no', 'total_amount', 'paid_amount', 'balance_amount', 'due_date', 'payment_status']);

            foreach ($invRows as $ir) {
                $invoices[$ir->invoice_no] = $ir;
            }
        }

        $data = [];
        foreach ($messages as $m) {
            $item = [
                'id'                  => $m->id,
                'whatsapp_message_id' => $m->whatsapp_message_id,
                'direction'           => $m->direction,
                'type'                => $m->message_type,
                'text'                => $m->message,
                'status'              => $m->status,
                'time'                => $m->created_at,
                'reply_to_message_id' => $m->reply_to_message_id,
                'edited'              => (bool) $m->is_edited,
                'is_deleted'          => intval($m->is_deleted ?? 0),
                'customer_name'       => $m->customer_name,
                'invoice'             => null
            ];

            // any media message carries its real filename
            if (!empty($m->media_name)) {
                $item['filename'] = $m->media_name;
            }

            if ($m->message_type === 'document' && $m->media_name) {
                $inv_no = preg_replace('/\.pdf$/i', '', $m->media_name);
                $item['invoice'] = isset($invoices[$inv_no]) ? [
                    'invoice_no'     => $invoices[$inv_no]->invoice_no,
                    'total_amount'   => $invoices[$inv_no]->total_amount,
                    'paid_amount'    => $invoices[$inv_no]->paid_amount,
                    'balance_amount' => $invoices[$inv_no]->balance_amount,
                    'due_date'       => $invoices[$inv_no]->due_date,
                    'payment_status' => $invoices[$inv_no]->payment_status
                ] : ['invoice_no' => $inv_no];
            }

            $data[] = $item;
        }

        return response()->json(["status" => true, "data" => $data]);
    }

    // ── UPDATE / EDIT OUTGOING MESSAGE — DISABLED ──
    // WhatsApp message editing is intentionally not supported. If an old client
    // still calls this route, respond 404 so no message can ever be modified.
    public function updateMessage(Request $request)
    {
        return response()->json(
            ["status" => false, "message" => "Message editing is not supported."],
            404
        );
    }

    // ── DELETE A MESSAGE ──
    public function deleteMessage(Request $request, WhatsAppService $whatsapp)
    {
        $company_id = intval($request->input('company_id', 0));
        $message_id = $request->input('message_id', '');
        $delete_for = $request->input('delete_for', 'everyone');

        if (!$company_id || empty($message_id)) {
            return response()->json(["status" => false, "message" => "company_id and message_id are required"]);
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();

        if (!$connection) {
            return response()->json(["status" => false, "message" => "WhatsApp is not connected."]);
        }

        // Resolve by DB id (preferred) or whatsapp_message_id
        $msg = WhatsAppMessage::where('company_id', $company_id)
            ->where(function ($q) use ($message_id) {
                $q->where('id', $message_id)
                  ->orWhere('whatsapp_message_id', $message_id);
            })
            ->first();

        if (!$msg) {
            return response()->json(["status" => false, "message" => "Message not found."]);
        }

        if ($delete_for === 'everyone') {
            // Delete for everyone: sync deletion to WhatsApp via Baileys
            if ($connection->status === 'ready' && !empty($msg->whatsapp_message_id)) {
                try {
                    $whatsapp->deleteMessage(
                        $connection->session_id,
                        $msg->customer_phone,
                        $msg->whatsapp_message_id,
                        $msg->direction === 'outgoing'
                    );
                } catch (\Exception $e) {
                    // If live delete fails, still mark deleted locally
                }
            }
            // is_deleted = 2 → "deleted for everyone" (shows placeholder in UI)
            $msg->is_deleted = 2;
        } else {
            // Delete for me: hide from current user only, do NOT sync to WhatsApp
            // is_deleted = 1 → "deleted for me" (hidden from view)
            $msg->is_deleted = 1;
        }

        $msg->save();

        return response()->json([
            "status" => true,
            "message" => "Message deleted successfully.",
            "data" => [
                "id" => $msg->id,
                "is_deleted" => $msg->is_deleted
            ]
        ]);
    }

    // ── MARK INCOMING MESSAGES AS READ WHEN CHAT IS OPENED ──
    public function markRead(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        $phone = preg_replace('/[^0-9]/', '', (string) $request->input('phone', ''));

        if (!$company_id || !$phone) {
            return response()->json(["status" => false, "message" => "company_id and phone required"]);
        }

        DB::table('whatsapp_messages')
            ->where('company_id', $company_id)
            ->where('customer_phone', $phone)
            ->where('direction', 'incoming')
            ->where('status', 'received')
            ->update(['status' => 'read', 'updated_at' => now()]);

        return response()->json(["status" => true, "message" => "Marked as read"]);
    }
}
