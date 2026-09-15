<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Sandbox adapter for the E-Way Bill gateway (e.g. Adequate GSP / NIC).
 *
 * The live NIC/Adequate GSP integration can be dropped in inside this class
 * later without touching controllers or routes. For now every call runs
 * against a local sandbox so the whole flow is testable end-to-end.
 */
class EwayBillGateway
{
    /**
     * Simulated authentication against the GSP. Returns a sandboxable token.
     *
     * @return array{success: bool, message: string, latency_ms: int, token: string}
     */
    public function authenticate(): array
    {
        $start = microtime(true);
        $latency = (int) round((microtime(true) - $start) * 1000);

        return [
            'success' => true,
            'message' => 'Connection successful (sandbox gateway)',
            'latency_ms' => max(1, $latency),
            'token' => 'sandbox-' . bin2hex(random_bytes(8)),
        ];
    }

    /**
     * Generates a sandbox E-Way Bill number.
     * Format: <state code><YYMMDD><invoice id padded to 5 digits> (13 digits).
     *
     * @param int|float $invoiceId
     * @param string    $fromGstin Seller GSTIN (used to derive state code)
     * @param string    $docNumber Optional document number fallback for padding
     * @return string
     */
    public function generateEwb($invoiceId, string $fromGstin = '', string $docNumber = ''): string
    {
        $stateCode = '33';
        if (strlen($fromGstin) >= 2 && ctype_digit(substr($fromGstin, 0, 2))) {
            $stateCode = substr($fromGstin, 0, 2);
        }

        $now = Carbon::now();

        $identifier = intval($invoiceId);
        if ($identifier <= 0) {
            $digits = preg_replace('/[^0-9]/', '', $docNumber);
            $identifier = intval(substr($digits, -5));
        }

        return $stateCode . $now->format('ymd') . str_pad((string) $identifier, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Computes the valid-upto timestamp for an E-Way Bill based on distance.
     *
     * Regular goods: 200 kms per day of validity.
     * Over Dimensional Cargo (ODC): 20 kms per day.
     * Minimum 1 day; when no distance is provided, 15 days validity is used.
     *
     * @param string $supplyType
     * @param float  $distanceKm
     * @param string $vehicleType
     * @return Carbon
     */
    public function computeValidity(string $supplyType, $distanceKm, string $vehicleType = 'Regular'): Carbon
    {
        $distance = floatval($distanceKm);
        $now = Carbon::now();

        if ($distance <= 0) {
            return $now->copy()->addDays(15);
        }

        $isOdc = stripos($vehicleType, 'ODC') !== false || stripos($supplyType, 'ODC') !== false;
        $perDay = $isOdc ? 20 : 200;
        $days = max(1, (int) ceil($distance / $perDay));

        return $now->copy()->addDays($days);
    }
}