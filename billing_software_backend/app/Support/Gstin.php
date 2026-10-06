<?php

namespace App\Support;

use App\Models\Customer;

class Gstin
{
    public static function normalize(?string $gstin): string
    {
        return strtoupper(trim($gstin ?? ''));
    }

    public static function isValid(string $gstin): bool
    {
        return preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/', $gstin) === 1;
    }

    public static function belongsToAnotherCustomer(string $gstin, ?int $customerId = null): bool
    {
        return Customer::whereRaw('UPPER(TRIM(gst_no)) = ?', [$gstin])
            ->when($customerId, fn ($query) => $query->where('id', '!=', $customerId))
            ->exists();
    }
}
