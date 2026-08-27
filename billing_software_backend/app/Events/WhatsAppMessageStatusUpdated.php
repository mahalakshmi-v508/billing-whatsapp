<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppMessageStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $whatsapp_message_id,
        public int $status,
        public ?string $delivered_at = null,
        public ?string $read_at = null
    ) {}

    public function broadcastOn(): array
    {
        return ['whatsapp-chat'];
    }

    public function broadcastAs(): string
    {
        return '.message-status';
    }

    public function broadcastWith(): array
    {
        return [
            'whatsapp_message_id' => $this->whatsapp_message_id,
            'status' => $this->status,
            'delivered_at' => $this->delivered_at,
            'read_at' => $this->read_at,
        ];
    }
}
