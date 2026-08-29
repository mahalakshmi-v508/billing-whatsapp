<?php

namespace App\Http\Controllers\Api;

use App\Events\WhatsAppMessageStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\WhatsAppMessage;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    public function updateStatus(Request $request)
    {
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

        $messageId = $request->input('message_id');
        $ack = intval($request->input('status', 0));

        if (empty($messageId) || $ack < 0) {
            return response()->json([
                "status" => false,
                "message" => "message_id and status are required"
            ], 422);
        }

        $msg = WhatsAppMessage::where('whatsapp_message_id', $messageId)->first();

        if (!$msg) {
            return response()->json([
                "status" => false,
                "message" => "Message not found"
            ], 404);
        }

        $now = now()->toDateTimeString();
        $statusString = $msg->status;
        $deliveredAt = $msg->delivered_at;
        $readAt = $msg->read_at;

        if ($ack >= 3) {
            $statusString = 'read';
            $readAt = $readAt ?? $now;
            $deliveredAt = $deliveredAt ?? $now;
        } elseif ($ack >= 2) {
            if ($statusString !== 'read') {
                $statusString = 'delivered';
                $deliveredAt = $deliveredAt ?? $now;
            }
        } elseif ($ack >= 1) {
            if ($statusString === 'pending') {
                $statusString = 'sent';
            }
        }

        $msg->status = $statusString;
        $msg->delivered_at = $deliveredAt;
        $msg->read_at = $readAt;
        $msg->save();

        event(new WhatsAppMessageStatusUpdated(
            whatsapp_message_id: $messageId,
            status: $ack,
            delivered_at: $deliveredAt,
            read_at: $readAt
        ));

        return response()->json([
            "status" => true,
            "message" => "Status updated",
            "data" => [
                "whatsapp_message_id" => $messageId,
                "status" => $ack,
            ]
        ]);
    }
}
