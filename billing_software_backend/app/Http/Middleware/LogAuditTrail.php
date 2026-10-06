<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Global audit trail.
 *
 * Registered on the `api` middleware group so every POST/PUT/PATCH/DELETE request
 * is captured without any controller having to opt in. Works in two phases:
 *
 *   1. Before $next() - resolve the acting user, infer the module + action from
 *      the URI and snapshot the record's current state.
 *   2. After  $next() - if the action actually succeeded, write the trail row.
 *
 * Deliberate exclusions are high-volume machine traffic (WhatsApp webhooks,
 * internal service callbacks, report "recently viewed" pings). Those would add
 * thousands of meaningless rows a day without representing a user action.
 */
class LogAuditTrail
{
    /** Path prefixes that are machine-driven, not user actions. */
    private const EXCLUDED_PREFIXES = [
        'api/internal/',
        'internal/',
        'whatsapp/message-status',
        'api/audit-log',
        'audit-log',
        '_debugbar',
    ];

    /**
     * Endpoints that fire on mere page views, keystrokes or automated checks and
     * would otherwise flood the trail with thousands of meaningless rows.
     */
    private const EXCLUDED_ENDPOINTS = [
        'report/record_view',
        'dashboard/get_dashboard',
        'ai/smart_suggest',
        'ai/detect_anomaly',
    ];

    /** Actions that modify an existing record, so the "after" state must be
     * re-read from the DB instead of trusting the sparse HTTP response payload. */
    private const RECORD_KEEPING_ACTIONS = [
        'update', 'toggle', 'approve', 'reject', 'cancel', 'mark_paid', 'submit',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->shouldSkip($request)) {
            return $next($request);
        }

        // ── Phase 1: capture pre-action state ────────────────────────────────
        try {
            $action = AuditLogger::resolveAction($request);
            $record = AuditLogger::resolveRecord($request, $action['group']);
            $requestPayload = AuditLogger::snapshotRequest($request);

            $request->attributes->set(AuditLogger::SNAPSHOT_ATTR, [
                'record' => $record,
                'payload' => $requestPayload,
            ]);
        } catch (Throwable $e) {
            $request->attributes->set(AuditLogger::SNAPSHOT_ATTR, null);
        }

        // ── Phase 2: run the action, then record the outcome ───────────────
        $response = $next($request);

        try {
            $this->writeEntry($request, $response);
        } catch (Throwable $e) {
            // Never let auditing surface as an application error.
        }

        return $response;
    }

    private function writeEntry(Request $request, Response $response): void
    {
        $companyId = AuditLogger::companyId($request);

        if (!AuditLogger::isEnabled($request, $companyId)) {
            return;
        }

        // A rejected action must not appear in the trail as if it happened.
        if ($response->getStatusCode() >= 400 || !self::looksSuccessful($response)) {
            return;
        }

        $snapshot = $request->attributes->get(AuditLogger::SNAPSHOT_ATTR) ?: [];
        $action = AuditLogger::resolveAction($request);
        $record = $snapshot['record'] ?? AuditLogger::resolveRecord($request, $action['group']);

        $actor = AuditLogger::actor($request);
        $verb = $action['action'];

        // What went in vs what came back.
        $oldValues = $record['snapshot'] ?? null;
        $newValues = AuditLogger::snapshotResponse($response);

        if ($verb === 'create') {
            // Endpoints that return no id need a post-write lookup so the trail
            // row still points at the record it describes.
            $record = AuditLogger::resolveRecordAfter($request, $action['group'], $record);
        }

        if ($verb === 'delete') {
            // The row is gone; the pre-action snapshot is the whole story.
            $newValues = null;
        } elseif ($verb === 'create') {
            // Nothing existed before the write.
            $oldValues = null;
            if (!$newValues) {
                $newValues = $snapshot['payload'] ?? null;
            }
        } elseif (in_array($verb, self::RECORD_KEEPING_ACTIONS, true) && !empty($record['record_id'])) {
            // Updates must compare the record against its own post-write state.
            // Snapshotting only the response payload makes every field it omits
            // look like it was "removed", so re-read the row for a true
            // before/after pair with identical keys.
            $fresh = AuditLogger::refreshRecord($request, $action['group'], $record);
            if ($fresh && $fresh['snapshot'] !== null) {
                $newValues = $fresh['snapshot'];
                $record = $fresh;
            } elseif ($oldValues === null) {
                $newValues = $snapshot['payload'] ?? null;
            }
        } elseif ($oldValues === null && $newValues === null) {
            // Settings-style writes with nothing identifiable: keep the payload
            // so the change is at least traceable to a set of fields.
            $newValues = $snapshot['payload'] ?? null;
        }

        // Settings endpoints have no single target record.
        $context = [
            'user_id'      => $actor['user_id'],
            'user_name'    => $actor['user_name'],
            'user_role'    => $actor['user_role'],
            'module'       => $action['module'],
            'action'       => $verb,
            'record_type'  => $record['record_type'] ?? null,
            'record_id'    => $record['record_id'] ?? null,
            'record_label' => $record['record_label'] ?? null,
        ];

        AuditLogger::record($request, $context, $oldValues, $newValues);
    }

    /**
     * This API reports business failures with HTTP 200 and
     * `{"status": false, "message": "..."}`, so a status code check alone would
     * log actions that never actually happened.
     */
    private static function looksSuccessful(Response $response): bool
    {
        $contentType = (string) $response->headers->get('Content-Type');

        if (!str_contains($contentType, 'json')) {
            return true;
        }

        $decoded = json_decode((string) $response->getContent(), true);

        if (is_array($decoded) && array_key_exists('status', $decoded)) {
            return (bool) $decoded['status'];
        }

        return true;
    }

    private function shouldSkip(Request $request): bool
    {
        if (!$request->isMethod('POST', 'PUT', 'PATCH', 'DELETE')) {
            return true;
        }

        $path = '/' . trim($request->path(), '/');

        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if (str_starts_with($path, '/' . trim($prefix, '/'))) {
                return true;
            }
        }

        // path() still includes the "api" prefix, so normalise before comparing.
        $normalized = trim(preg_replace('#(^|/)api(/|$)#', '$1', trim($request->path(), '/')), '/');

        return in_array($normalized, self::EXCLUDED_ENDPOINTS, true);
    }
}