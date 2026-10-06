<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $guarded = [];

    // The migration only creates `created_at`; updated_at is disabled so
    // append-only rows are never mutated.
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Icon/label hints consumed by the frontend badge renderers.
     */
    public function actionColor(): string
    {
        return match ($this->action) {
            'create', 'login' => 'emerald',
            'update', 'restore' => 'blue',
            'delete', 'cancel', 'reject' => 'rose',
            'export', 'print' => 'amber',
            default => 'slate',
        };
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}