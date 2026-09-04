<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    private string $url;
    private string $token;

    public function __construct()
    {
        $this->url = rtrim(config('services.whatsapp.url', ''), '/');
        $this->token = config('services.whatsapp.token', '');
    }

    public function isConfigured(): bool
    {
        return !empty($this->url);
    }

    private function request()
    {
        return Http::withToken($this->token)
            ->acceptJson()
            ->timeout(120);
    }

    public function connect(string $sessionId)
    {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/connect", [
                'session_id' => $sessionId
            ])
            ->throw()
            ->json();
    }

    public function status(string $sessionId)
    {
        return $this->request()
            ->get("{$this->url}/api/whatsapp/status/{$sessionId}")
            ->throw()
            ->json();
    }

    public function sendMessage(string $sessionId, string $phone, string $message, ?array $replyTo = null)
    {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/send", [
                'session_id' => $sessionId,
                'phone' => $phone,
                'message' => $message,
                'reply_to' => $replyTo
            ])
            ->throw()
            ->json();
    }

    public function sendDocumentBase64(
        string $sessionId,
        string $phone,
        string $base64,
        string $mimetype = 'application/pdf',
        string $filename = 'document.pdf',
        string $caption = ''
    ) {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/send-document", [
                'session_id' => $sessionId,
                'phone' => $phone,
                'base64' => $base64,
                'mimetype' => $mimetype,
                'filename' => $filename,
                'caption' => $caption
            ])
            ->throw()
            ->json();
    }

    public function sendImageBase64(
        string $sessionId,
        string $phone,
        string $base64,
        string $mimetype = 'image/jpeg',
        string $caption = ''
    ) {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/send-image", [
                'session_id' => $sessionId,
                'phone' => $phone,
                'base64' => $base64,
                'mimetype' => $mimetype,
                'caption' => $caption
            ])
            ->throw()
            ->json();
    }

    public function deleteMessage(
        string $sessionId,
        string $phone,
        ?string $id,
        bool $fromMe = true
    ) {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/delete", [
                'session_id' => $sessionId,
                'phone' => $phone,
                'id' => $id,
                'from_me' => $fromMe
            ])
            ->throw()
            ->json();
    }

    public function disconnect(string $sessionId)
    {
        return $this->request()
            ->post("{$this->url}/api/whatsapp/disconnect", [
                'session_id' => $sessionId
            ])
            ->throw()
            ->json();
    }
}
