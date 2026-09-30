<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the terminal 'logged_out' state to whatsapp_connections.status.
 *
 * A manual logout is materially different from a transient 'disconnected':
 *   * it is durable — the Baileys session is terminated and the stored
 *     credentials are invalidated, so the device must never be restored;
 *   * WhatsAppInternalController::validateSessions() refuses to hand these
 *     session ids back to the Node service on restart, which is what stops a
 *     logged-out device from being silently re-linked.
 *
 * The Node service already emits status=logged_out on a loggedOut disconnect,
 * so before this migration that write could not be stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('whatsapp_connections')) {
            return;
        }

        $allowed = [
            'disconnected',
            'initializing',
            'qr_ready',
            'authenticated',
            'ready',
            'auth_failure',
            'reconnecting',
            'logged_out',
        ];

        DB::statement(
            "ALTER TABLE `whatsapp_connections` MODIFY `status` ENUM('" .
            implode("','", $allowed) .
            "') NOT NULL DEFAULT 'disconnected'"
        );
    }

    public function down(): void
    {
        if (!Schema::hasTable('whatsapp_connections')) {
            return;
        }

        DB::statement(
            "ALTER TABLE `whatsapp_connections` MODIFY `status` ENUM(" .
            "'disconnected','initializing','qr_ready','authenticated','ready'," .
            "'auth_failure','reconnecting') NOT NULL DEFAULT 'disconnected'"
        );
    }
};
