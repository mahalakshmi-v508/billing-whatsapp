<?php

namespace App\Exceptions;

use Exception;

/**
 * Raised when the Laravel backend cannot get a usable answer from the Node
 * whatsapp-service (offline, wrong token, unconfigured, or it returned an
 * error). Keeping this distinct from generic exceptions lets the controller
 * report the REAL reason instead of hiding a failed logout behind a
 * "disconnected" database row.
 */
class WhatsAppServiceException extends Exception
{
    public function __construct(
        string $message,
        public readonly string $reason = 'service_unavailable',
        public readonly ?int $statusCode = null,
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
