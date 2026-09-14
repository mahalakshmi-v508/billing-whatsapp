<?php

namespace App\Services;

use Illuminate\Support\Carbon;

/**
 * E-Way Bill Gateway adapter.
 *
 * Sandbox implementation. The authentication + EWB generation are simulated
 * locally so the full flow works end-to-end without live credentials.
 *
 * To go live, replace the bodies of `authenticate()` and `generateEwb()` with
 * real HTTPS calls to your GSP (e.g. Adequare) or the direct NIC gateway
 * (token exchange -> submit EWB -> receive official 12-digit EWB number).
 */
class EwayBillGateway
{
    /**
     * Validate configuration and authenticate with the gateway.
     *
     * @return array{success:bool,message:string,latency_ms:int}
     */
    public static function authenticate(array $settings): array
    {
        $missing = [];
        foreach (['gstin', 'ewb_username', 'gsp_client_id'] as $key) {
            if (empty($settings[$key] ?? null)) {
                $missing[] = $key;
            }
        }

        if (count($missing) > 0) {
            return [
                'success' => false,
                'message' => 'Missing required configuration: ' . implode(', ', $missing) . '.',
                'latency_ms' => 0,
            ];
        }

        // Sandbox: simulate a successful token exchange.
        return [
            'success' => true,
            'message' => 'Connection successful (sandbox gateway) — '
                . (($settings['api_provider'] ?? '') === 'Direct NIC Gateway'
                    ? 'NIC OAuth2 client-credentials scheme'
                    : 'Adequare GSP token scheme'),
            'latency_ms' => random_int(90, 180),
        ];
    }

    /**
     * Generate an E-Way Bill for the given payload.
     *
     * Sandbox mode returns a realistic-looking system EWB number. Live mode
     * should submit the payload to the gateway and return the official number.
     *
     * @return array{success:bool,ewb_number:string,valid_upto:Carbon,message:string}
     */
    public static function generateEwb(array $payload): array
    {
        $stateCode = preg_replace('/[^0-9]/', '', (string)($payload['from_gstin'] ?? '00'));
        $stateCode = str_pad(substr($stateCode, 0, 2), 2, '0', STR_PAD_LEFT);
        $invoiceId = intval($payload['invoice_id'] ?? 0);

        // Format: <state code><yymmdd><invoiceId zero-padded> -> 13 digit sandbox EWB number.
        $ewbNumber = $stateCode . now()->format('ymd') . str_pad($invoiceId, 5, '0', STR_PAD_LEFT);

        return [
            'success' => true,
            'ewb_number' => $ewbNumber,
            'valid_upto' => self::computeValidity(
                (string)($payload['vehicle_type'] ?? 'Regular'),
                $payload['distance_km'] ?? null
            ),
            'message' => 'E-Way Bill generated in sandbox mode.',
        ];
    }

    /**
     * Validity period per GST e-way bill rules.
     *
     * - Regular vehicle: 1 day per 200 km (minimum 1 day).
     * - Over Dimensional Cargo: 1 day per 20 km (minimum 1 day).
     * - No distance provided: default 15 days (matches default "other" mode).
     */
    public static function computeValidity(string $vehicleType, $distanceKm, ?Carbon $from = null): Carbon
    {
        $base = $from ?: now();
        $distance = (float)$distanceKm;

        if ($distance <= 0) {
            return $base->copy()->addDays(15);
        }

        $perDayKm = $vehicleType === 'Over Dimensional Cargo' ? 20 : 200;
        $days = max(1, (int)ceil($distance / $perDayKm));

        return $base->copy()->addDays($days);
    }
}