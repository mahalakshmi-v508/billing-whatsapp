<?php

namespace App\Services;

use App\Exceptions\WhatsAppServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
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

    public function baseUrl(): string
    {
        return $this->url;
    }

    private function request()
    {
        return Http::withToken($this->token)
            ->acceptJson()
            ->timeout(120);
    }

    /**
     * Translate a transport/HTTP failure into a WhatsAppServiceException that
     * names the real cause, so callers never have to guess (or swallow) it.
     */
    private function call(string $method, string $path, array $payload = []): Response
    {
        try {
            return $this->request()->{$method}($this->url . $path, $payload);
        } catch (ConnectionException $e) {
            throw new WhatsAppServiceException(
                'WhatsApp service is not reachable at ' . $this->url .
                '. Start the whatsapp-service (node src/server.js).',
                'service_offline',
                null,
                0,
                $e
            );
        } catch (\Throwable $e) {
            throw new WhatsAppServiceException(
                'WhatsApp service request failed: ' . $e->getMessage(),
                'service_error',
                null,
                0,
                $e
            );
        }
    }

    /**
     * Resolve a response to JSON, raising a typed exception on failure.
     * 401 means the shared internal token does not match the service's .env.
     */
    private function json(Response $response, string $what): array
    {
        if ($response->failed()) {

            $status = $response->status();
            $body = $response->json();

            $message = is_array($body) && !empty($body['message'])
                ? $body['message']
                : 'WhatsApp service returned HTTP ' . $status . ' for ' . $what . '.';

            $reason = match (true) {
                $status === 401 => 'unauthorized',
                $status === 503 => 'service_token_not_configured',
                default => 'service_error',
            };

            throw new WhatsAppServiceException($message, $reason, $status);
        }

        return $response->json() ?? [];
    }

    /**
     * Liveness probe. Never throws — it reports whether the service can be
     * reached and whether it is correctly configured, which is a different
     * fact from whether a WhatsApp account is connected.
     */
    public function health(): array
    {
        if (!$this->isConfigured()) {
            return [
                'reachable' => false,
                'configured' => false,
                'detail' => 'WHATSAPP_SERVICE_URL is not set in the Laravel .env.',
            ];
        }

        try {
            $response = Http::acceptJson()->timeout(5)->get($this->url . '/health');
        } catch (\Throwable $e) {
            return [
                'reachable' => false,
                'configured' => true,
                'detail' => 'No response from ' . $this->url . ' (' . $e->getMessage() . ').',
            ];
        }

        if ($response->failed()) {
            return [
                'reachable' => false,
                'configured' => true,
                'detail' => 'WhatsApp service returned HTTP ' . $response->status() . ' on /health.',
            ];
        }

        $body = $response->json() ?? [];

        return [
            'reachable' => true,
            'configured' => (bool) ($body['token_configured'] ?? false),
            'service' => $body['service'] ?? 'whatsapp-service',
            'status' => $body['status'] ?? 'running',
            'detail' => null,
        ];
    }

    public function connect(string $sessionId)
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/connect', ['session_id' => $sessionId]),
            'connect'
        );
    }

    public function status(string $sessionId)
    {
        return $this->json(
            $this->call('get', '/api/whatsapp/status/' . $sessionId),
            'status'
        );
    }

    public function sendMessage(string $sessionId, string $phone, string $message, ?array $replyTo = null)
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/send', [
                'session_id' => $sessionId,
                'phone' => $phone,
                'message' => $message,
                'reply_to' => $replyTo
            ]),
            'send'
        );
    }

    public function sendDocumentBase64(
        string $sessionId,
        string $phone,
        string $base64,
        string $mimetype = 'application/pdf',
        string $filename = 'document.pdf',
        string $caption = ''
    ) {
        return $this->json(
            $this->call('post', '/api/whatsapp/send-document', [
                'session_id' => $sessionId,
                'phone' => $phone,
                'base64' => $base64,
                'mimetype' => $mimetype,
                'filename' => $filename,
                'caption' => $caption
            ]),
            'send-document'
        );
    }

    public function sendImageBase64(
        string $sessionId,
        string $phone,
        string $base64,
        string $mimetype = 'image/jpeg',
        string $caption = ''
    ) {
        return $this->json(
            $this->call('post', '/api/whatsapp/send-image', [
                'session_id' => $sessionId,
                'phone' => $phone,
                'base64' => $base64,
                'mimetype' => $mimetype,
                'caption' => $caption
            ]),
            'send-image'
        );
    }

    public function deleteMessage(
        string $sessionId,
        string $phone,
        ?string $id,
        bool $fromMe = true
    ) {
        return $this->json(
            $this->call('post', '/api/whatsapp/delete', [
                'session_id' => $sessionId,
                'phone' => $phone,
                'id' => $id,
                'from_me' => $fromMe
            ]),
            'delete'
        );
    }

    /**
     * Terminate the Baileys session and unlink the device from the WhatsApp
     * account. This is the only call that may legitimately clear a connected
     * session, and it fails loudly if the service cannot do it.
     */
    public function logout(string $sessionId): array
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/logout', ['session_id' => $sessionId]),
            'logout'
        );
    }

    public function disconnect(string $sessionId)
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/disconnect', ['session_id' => $sessionId]),
            'disconnect'
        );
    }

    public function getProfilePicture(string $sessionId, string $phone)
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/profile-picture', [
                'session_id' => $sessionId,
                'phone' => $phone
            ]),
            'profile-picture'
        );
    }

    public function sendReadReceipts(string $sessionId, string $phone, array $ids)
    {
        return $this->json(
            $this->call('post', '/api/whatsapp/read-receipts', [
                'session_id' => $sessionId,
                'phone' => $phone,
                'ids' => $ids
            ]),
            'read-receipts'
        );
    }
}
