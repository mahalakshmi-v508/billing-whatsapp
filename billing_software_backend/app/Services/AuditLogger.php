<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Brand;
use App\Models\CashierRequest;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Models\CompanySetting;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\EwayBill;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Subcategory;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\Ticket;
use App\Models\User;
use App\Models\WhatsAppMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Audit trail recorder.
 *
 * The HTTP layer (App\Http\Middleware\LogAuditTrail) resolves *who*, *where* and
 * *what kind of action* is happening and hands it here. Controllers never need to
 * call this, which is why every one of the ~250 API endpoints is covered without
 * touching a single controller.
 *
 * Every method is wrapped in try/catch on purpose: an audit failure must never
 * break the business action the user actually asked for.
 */
class AuditLogger
{
    /** Request attribute used to hand the pre-controller snapshot back to the middleware. */
    public const SNAPSHOT_ATTR = '_audit_before_snapshot';

    /** Request attribute holding the request-scoped enable/disable memo. */
    private const ENABLED_ATTR = '_audit_enabled';

    /** Request attribute caching the hidden-modules list for this request. */
    private const HIDDEN_ATTR = '_audit_hidden_modules';

    /**
     * URI prefix => [model class, label column, fallback lookup columns, human label].
     *
     * The fallback columns let us snapshot records that are addressed by a natural
     * key instead of the primary key (e.g. `invoice_no`).
     */
    /**
     * Human display names. Keyed by the lower-cased URI group with dashes
     * normalised to underscores so `credit_note` / `credit-note` both match.
     */
    private const MODULE_NAMES = [
        'customer' => 'Customer',
        'supplier' => 'Supplier',
        'supplier_product' => 'Supplier Product',
        'product' => 'Product',
        'category' => 'Category',
        'subcategory' => 'Subcategory',
        'brand' => 'Brand',
        'invoice' => 'Invoice',
        'credit_note' => 'Credit Note',
        'debit_note' => 'Debit Note',
        'purchase' => 'Purchase',
        'expense' => 'Expense',
        'company' => 'Company',
        'admin' => 'Admin',
        'cashier' => 'Cashier',
        'cashierrequest' => 'Cashier Request',
        'companyrequest' => 'Company Request',
        'auth' => 'User & Access',
        'tickets' => 'Helpdesk Ticket',
        'ticket' => 'Helpdesk Ticket',
        'eway_bill' => 'E-Way Bill',
        'eway_bill_settings' => 'E-Way Bill Settings',
        'whatsapp' => 'WhatsApp',
        'settings' => 'Settings',
        'invoice_settings' => 'Invoice Settings',
        'transaction_messages' => 'WhatsApp & SMS Alerts',
        'credit' => 'Credit Settings',
        'ai' => 'AI Assistant',
        'dashboard' => 'Dashboard',
        'report' => 'Report',
    ];

    private const RECORD_MAP = [
        // [model, label column, lookup columns, human label]
        // Lookup columns are tried in order: primary key first, then the natural
        // keys that identify a record when the endpoint has just created it.
        'customer'          => [Customer::class, 'name', ['id', 'customer_id', 'phone'], 'Customer'],
        'supplier'          => [Supplier::class, 'name', ['id', 'supplier_id', 'phone', 'email'], 'Supplier'],
        'supplier_product'  => [SupplierProduct::class, null, ['id', 'supplier_product_id', 'product_code'], 'Supplier Product'],
        'product'           => [Product::class, 'product_name', ['id', 'product_id', 'product_code', 'barcode'], 'Product'],
        'category'          => [Category::class, 'name', ['id', 'category_id', 'name'], 'Category'],
        'subcategory'       => [Subcategory::class, 'name', ['id', 'subcategory_id', 'name'], 'Subcategory'],
        'brand'             => [Brand::class, 'name', ['id', 'brand_id', 'name'], 'Brand'],
        'invoice'           => [Invoice::class, 'invoice_no', ['id', 'invoice_id', 'invoice_no'], 'Invoice'],
        'credit_note'       => [CreditNote::class, 'invoice_no', ['id', 'credit_note_id', 'invoice_no'], 'Credit Note'],
        'debit_note'        => [DebitNote::class, 'invoice_no', ['id', 'debit_note_id', 'invoice_no'], 'Debit Note'],
        'purchase'          => [Purchase::class, 'purchase_no', ['id', 'purchase_id', 'purchase_no'], 'Purchase'],
        'expense'           => [Expense::class, null, ['id', 'expense_id'], 'Expense'],
        'company'           => [Company::class, 'company_name', ['id', 'company_id'], 'Company'],
        'admin'             => [User::class, 'name', ['id', 'admin_id', 'user_id', 'email'], 'Admin'],
        'cashier'           => [User::class, 'name', ['id', 'cashier_id', 'user_id', 'email'], 'Cashier'],
        'auth'              => [User::class, 'name', ['id', 'user_id', 'email'], 'User'],
        'tickets'           => [Ticket::class, 'ticket_no', ['id', 'ticket_id', 'ticket_no'], 'Ticket'],
        'eway-bill'         => [EwayBill::class, 'invoice_no', ['id', 'eway_bill_id', 'invoice_no'], 'E-Way Bill'],
        'whatsapp'          => [WhatsAppMessage::class, null, ['id', 'message_id'], 'WhatsApp Message'],
        'settings'          => [null, null, [], 'Settings'],
        'invoice-settings'  => [null, null, [], 'Invoice Settings'],
        'eway-bill/settings' => [null, null, [], 'E-Way Bill Settings'],
        'transaction-messages' => [null, null, [], 'WhatsApp & SMS Alerts'],
        'credit'            => [null, null, [], 'Credit Settings'],
        'CashierRequest'    => [CashierRequest::class, null, ['id', 'request_id'], 'Cashier Request'],
        'CompanyRequest'    => [CompanyRequest::class, null, ['id', 'request_id'], 'Company Request'],
        'ai'                => [null, null, [], 'AI Assistant'],
        'dashboard'         => [null, null, [], 'Dashboard'],
    ];

    /** Fields whose values must never be written to the trail. */
    private const SECRET_FIELDS = [
        'password', 'new_password', 'old_password', 'confirm_password', 'owner_password',
        'password_confirmation', 'token', 'active_token', 'api_token', 'otp', 'otp_code',
        'secret', 'api_key', 'access_token', 'authorization', 'client_secret',
    ];

    /** Volume guard: never let a runaway loop fill the table within one minute. */
    private const WRITE_LIMIT_PER_MINUTE = 60;

    /**
     * Company-scoped on/off switch, read from the `audit_log` slice of the
     * existing company_settings JSON blob. Memoised per request so a single
     * request never hits the settings table twice.
     */
    public static function isEnabled(Request $request, ?int $companyId = null): bool
    {
        if ($request->attributes->get(self::ENABLED_ATTR) !== null) {
            return (bool) $request->attributes->get(self::ENABLED_ATTR);
        }

        $enabled = true;

        try {
            $companyId = $companyId ?: self::companyId($request);

            // No tenant context -> keep logging so actions are never lost, but
            // the row lands with a null company_id and can be cleaned up later.
            if ($companyId) {
                $settings = CompanySetting::where('company_id', $companyId)->value('settings');
                if (is_array($settings) && array_key_exists('audit_log', $settings)) {
                    $enabled = (bool) ($settings['audit_log']['enabled'] ?? true);
                }
            }
        } catch (Throwable $e) {
            // Settings table missing / DB down: never block the action.
            $enabled = true;
        }

        $request->attributes->set(self::ENABLED_ATTR, $enabled);

        return $enabled;
    }

    /**
     * Modules the company chose to hide from the audit log. Reads the
     * `audit_log` slice of the same company_settings blob used by
     * isEnabled(). A hidden module is (a) no longer recorded by the middleware
     * and (b) excluded from every audit query so it never shows up on the page.
     *
     * Values are normalised (trimmed, lower-cased) so labels saved with any
     * casing — e.g. the plural page names an older Settings build stored —
     * still match the record rows.
     */
    public static function hiddenModules(?int $companyId): array
    {
        if (!$companyId) {
            return [];
        }

        try {
            $settings = CompanySetting::where('company_id', $companyId)->value('settings');
            if (!is_array($settings)) {
                return [];
            }

            $auditLog = $settings['audit_log'] ?? [];
            if (!is_array($auditLog)) {
                return [];
            }

            // The Settings UI saves camelCase `hiddenModules`; older builds
            // stored snake_case `hidden_modules`. Merge both so no previously
            // saved list is ever dropped.
            $hidden = array_merge(
                is_array($auditLog['hiddenModules'] ?? null) ? $auditLog['hiddenModules'] : [],
                is_array($auditLog['hidden_modules'] ?? null) ? $auditLog['hidden_modules'] : []
            );

            $normalised = array_map(
                fn ($m) => mb_strtolower(trim((string) $m)),
                $hidden
            );

            return array_values(array_unique(array_filter($normalised, fn ($m) => $m !== '')));
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * Whether the resolved URI module should be skipped, memoised per request so
     * a single request never reads the settings table twice.
     */
    public static function isModuleHidden(Request $request, string $module, ?int $companyId = null): bool
    {
        if ($module === '') {
            return false;
        }

        if (!$request->attributes->has(self::HIDDEN_ATTR)) {
            $hidden = self::hiddenModules($companyId ?: self::companyId($request));
            $request->attributes->set(self::HIDDEN_ATTR, $hidden);
        }

        return in_array(
            mb_strtolower(trim($module)),
            $request->attributes->get(self::HIDDEN_ATTR, []),
            true
        );
    }

    /** Case-insensitive lookup of a URI group in RECORD_MAP. */
    private static function findMapKey(string $group): ?string
    {
        $needle = str_replace('-', '_', strtolower($group));
        foreach (array_keys(self::RECORD_MAP) as $key) {
            if (str_replace('-', '_', strtolower($key)) === $needle) {
                return $key;
            }
        }
        return null;
    }

    /** Resolve the acting company from the trusted header, then the payload. */
    public static function companyId(Request $request): ?int
    {
        $candidates = [
            $request->header('X-Company-Id'),
            $request->input('company_id'),
            $request->input('companyid'),
            $request->query('company_id'),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate !== null && $candidate !== '' && ctype_digit((string) $candidate)) {
                $id = (int) $candidate;
                if ($id > 0) {
                    return $id;
                }
            }
        }

        return null;
    }

    /**
     * Resolve the acting user.
     *
     * The API has no server-side session (auth is a client-side localStorage
     * contract), so the SPA forwards identity on X-User-* headers. Payload fields
     * are only a fallback for endpoints that already carry them.
     */
    public static function actor(Request $request): array
    {
        $id = $request->header('X-User-Id');
        if ($id === null || !ctype_digit((string) $id)) {
            $id = $request->input('user_id') ?: $request->input('admin_id') ?: $request->input('id');
        }

        return [
            'user_id'   => ctype_digit((string) $id) && (int) $id > 0 ? (int) $id : null,
            'user_name' => self::text($request->header('X-User-Name') ?: $request->input('name')),
            'user_role' => self::text($request->header('X-User-Role') ?: $request->input('role')),
        ];
    }

    /**
     * Turn the request URI into a human module label and a verb.
     *
     * e.g. "customer/create_customer"  => module "Customer",    action "create"
     *      "invoice/mark_as_paid"      => module "Invoice",     action "mark_as_paid"
     *      "purchase/save_draft"       => module "Purchase",    action "create"
     */
    public static function resolveAction(Request $request): array
    {
        // The path still carries the "api" prefix at this point, so drop it and
        // any placeholder/numeric segments (e.g. tickets/{id}/status).
        $segments = array_values(array_filter(
            explode('/', trim($request->path(), '/')),
            fn ($segment) => $segment !== '' && $segment !== 'api'
        ));

        $meaningful = array_values(array_filter(
            $segments,
            fn ($segment) => !preg_match('/^\{.*\}$/', $segment) && !ctype_digit($segment)
        ));

        $group = $meaningful[0] ?? 'general';
        $rest = array_slice($meaningful, 1);

        $mapKey = self::findMapKey($group);

        // Prefer the matched map key (normalises casing), else prettify the raw group.
        $module = self::prettyModule($mapKey ?? $group);

        // Longest, most specific segments first: `expense/category/delete` must
        // not be read as just "delete" — it is a sub-entity action.
        $module = self::refineModule($module, $rest);

        // Pick the verb from the rightmost segment that actually is one. For
        // `expense/category/delete` the trailing "delete" is the action, while
        // for `tickets/{id}/status` the only remaining segment is the verb.
        $verb = 'update';
        foreach (array_reverse($rest) as $segment) {
            if (self::isVerbSegment(strtolower($segment))) {
                $verb = $segment;
                break;
            }
        }

        // `tickets/{id}/comments` is a verb we don't recognise as such.
        if ($verb === 'update' && count($rest) > 1 && !self::isVerbSegment(strtolower($rest[0]))) {
            $verb = end($rest);
        } elseif ($verb === 'update' && $rest) {
            $verb = $rest[0];
        }

        $action = self::normalizeAction($verb, $request);

        // `settings/save` is a configuration change, not a record creation. Matched on
        // the verb so `eway-bill/create` still counts as creating a bill.
        if ($action === 'create'
            && in_array($group, self::SETTINGS_GROUPS, true)
            && in_array(strtolower($verb), ['save', 'update', 'settings', 'save_settings'], true)) {
            $action = 'update';
        }

        return [
            'module'   => $module,
            'action'   => $action,
            'group'    => $group,
            'sub_path' => implode('/', $rest),
        ];
    }

    /** Map a raw URI verb onto a canonical audit action. */
    private static function normalizeAction(string $verb, Request $request): string
    {
        $verb = strtolower(str_replace('-', '_', $verb));

        // Explicit REST verbs used by the helpdesk routes.
        if ($request->isMethod('DELETE')) {
            return 'delete';
        }

        return match (true) {
            str_contains($verb, 'delete'), str_contains($verb, 'remove') => 'delete',
            str_contains($verb, 'create'), str_contains($verb, 'add'), str_contains($verb, 'save') => 'create',
            str_contains($verb, 'update'), str_contains($verb, 'edit'), str_contains($verb, 'change') => 'update',
            str_contains($verb, 'toggle') => 'toggle',
            str_contains($verb, 'approve') => 'approve',
            str_contains($verb, 'reject') => 'reject',
            str_contains($verb, 'cancel') => 'cancel',
            str_contains($verb, 'payment'), str_contains($verb, 'pay'), str_contains($verb, 'collect') => 'payment',
            str_contains($verb, 'login') => 'login',
            str_contains($verb, 'logout') => 'logout',
            str_contains($verb, 'send') => 'send',
            str_contains($verb, 'export'), str_contains($verb, 'download') => 'export',
            str_contains($verb, 'print') => 'print',
            str_contains($verb, 'submit') => 'submit',
            $verb === 'move' => 'update',
            str_contains($verb, 'mark') => self::normalizeMark(substr($verb, 4)),
            str_contains($verb, 'status') => 'update',
            str_contains($verb, 'comment') => 'comment',
            $verb === '' || $verb === 'index' || $verb === 'get' => 'update',
            default => $verb,
        };
    }

    /**
     * `expense/category/delete` -> "Expense Category", because the second
     * segment names a sub-entity rather than the action. Segments that are
     * themselves verbs are ignored.
     *
     * The parent prefix is always kept, so `expense/category` stays
     * "Expense Category" rather than collapsing to the bare "Category".
     */
    private static function refineModule(string $module, array $rest): string
    {
        // Need two segments for the first one to be a sub-entity rather than the verb.
        if (count($rest) < 2) {
            return $module;
        }

        $candidate = strtolower($rest[0]);
        if (self::isVerbSegment($candidate)) {
            return $module;
        }

        $key = str_replace('-', '_', $candidate);
        $label = self::MODULE_NAMES[$key]
            ?? ucwords(str_replace(['-', '_'], ' ', $candidate));

        // Already carries the parent name (e.g. "Helpdesk Ticket" + "ticket").
        if (strcasecmp($label, $module) === 0 || strcasecmp($label, $module . ' ' . $label) === 0) {
            return $module;
        }

        return trim($module . ' ' . $label);
    }

    /** URI groups that hold configuration, where "save" means update not create. */
    private const SETTINGS_GROUPS = [
        'settings', 'invoice-settings', 'invoice_settings', 'eway-bill',
        'transaction-messages', 'transaction_messages', 'credit',
    ];

    /** `mark_as_paid` -> "mark_paid"; `mark_as_xxx` keeps the verb as-is. */
    private static function normalizeMark(string $suffix): string
    {
        $suffix = self::trimUnderscores(strtolower($suffix));
        if ($suffix === '') {
            return 'update';
        }
        return str_replace(' ', '_', $suffix) === 'as_paid' ? 'mark_paid' : 'update';
    }

    /** Strip leading/trailing separators left behind by prefix slicing. */
    private static function trimUnderscores(string $value): string
    {
        return trim(str_replace(['_', '-'], ' ', $value));
    }

    /** Verbs that describe the action itself, never a sub-entity. */
    private static function isVerbSegment(string $segment): bool
    {
        return (bool) preg_match(
            '/^(create|add|update|edit|delete|remove|save|get|list|toggle|approve|reject|cancel'
            . '|payment|pay|send|export|download|print|submit|status|detail|record_view|copilot'
            . '|smart_suggest|detect_anomaly|generate_product_info|move|comments?|logs?)$/i',
            $segment
        );
    }

    private static function prettyModule(string $key): string
    {
        $key = str_replace('-', '_', strtolower($key));

        if (isset(self::MODULE_NAMES[$key])) {
            return self::MODULE_NAMES[$key];
        }

        return ucwords(str_replace(['-', '_'], ' ', $key));
    }

    /**
     * Resolve and sanitise the target record so updates/deletes keep a
     * "before" snapshot even after the row is gone.
     */
    public static function resolveRecord(Request $request, string $group): ?array
    {
        try {
            $mapKey = self::findMapKey($group);
            if (!$mapKey) {
                return null;
            }

            [$modelClass, $labelColumn, $lookupColumns, $label] = self::RECORD_MAP[$mapKey];

            // Path parameters (helpdesk /{id} routes) take precedence over the body.
            $id = $request->route('id') ?: $request->input('id');
            if (!$id) {
                foreach ($lookupColumns as $column) {
                    $value = $request->input($column);
                    if ($value !== null && $value !== '' && !is_array($value)) {
                        $id = $value;
                        break;
                    }
                }
            }

            $record = null;
            $recordId = null;

            if ($modelClass && $id !== null && $id !== '' && !is_array($id)) {
                $record = $modelClass::query()->find($id);

                // Not found by PK - retry against the natural keys.
                if (!$record) {
                    foreach ($lookupColumns as $column) {
                        $value = $request->input($column);
                        if ($value === null || $value === '' || is_array($value)) {
                            continue;
                        }
                        $record = $modelClass::query()->where($column, $value)->first();
                        if ($record) {
                            break;
                        }
                    }
                }
                $recordId = $record?->getKey();
            } elseif ($id !== null && $id !== '' && !is_array($id)) {
                $recordId = $id;
            }

            $recordLabel = null;
            if ($record) {
                $recordLabel = $labelColumn ? ($record->{$labelColumn} ?? null) : null;
                if (!$recordLabel) {
                    // Fall back to something human-readable rather than a bare id.
                    foreach (['name', 'product_name', 'title', 'company_name', 'invoice_no', 'purchase_no', 'ticket_no', 'product_code', 'code', 'phone', 'email'] as $candidate) {
                        if (!empty($record->{$candidate})) {
                            $recordLabel = (string) $record->{$candidate};
                            break;
                        }
                    }
                }
            }

            return [
                'record_type'  => $modelClass ? class_basename($modelClass) : $label,
                'record_id'    => $recordId,
                'record_label' => self::text($recordLabel) ?? ($recordId !== null ? '#' . $recordId : null),
                'snapshot'     => $record ? self::sanitize($record->attributesToArray()) : null,
            ];
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Second-chance lookup for `create` actions.
     *
     * Many endpoints reply with just `{"status":true,"message":"..."}` and no
     * primary key, so the pre-action pass cannot know the new row's id. Once the
     * write has happened we can match on the natural keys that were sent
     * (phone, invoice_no, code, ...) to recover the identifier.
     */
    public static function resolveRecordAfter(Request $request, string $group, ?array $existing = null): ?array
    {
        // Pre-action resolution already succeeded (update/delete case).
        if (!empty($existing['record_id'])) {
            return $existing;
        }

        try {
            $mapKey = self::findMapKey($group);
            if (!$mapKey) {
                return $existing;
            }

            [$modelClass, $labelColumn, $lookupColumns, $label] = self::RECORD_MAP[$mapKey];
            if (!$modelClass) {
                return $existing;
            }

            $record = null;
            foreach ($lookupColumns as $column) {
                $value = $request->input($column);
                if ($value === null || $value === '' || is_array($value)) {
                    continue;
                }
                $record = $modelClass::query()
                    ->where($column, $value)
                    ->orderByDesc('id')
                    ->first();
                if ($record) {
                    break;
                }
            }

            if (!$record) {
                return $existing;
            }

            $recordLabel = $labelColumn ? ($record->{$labelColumn} ?? null) : null;
            if (!$recordLabel) {
                foreach (['name', 'product_name', 'title', 'company_name', 'invoice_no', 'purchase_no', 'ticket_no', 'product_code', 'code', 'phone', 'email'] as $candidate) {
                    if (!empty($record->{$candidate})) {
                        $recordLabel = (string) $record->{$candidate};
                        break;
                    }
                }
            }

            return [
                'record_type'  => class_basename($modelClass),
                'record_id'    => $record->getKey(),
                'record_label' => self::text($recordLabel) ?? ('#' . $record->getKey()),
                'snapshot'     => $existing['snapshot'] ?? null,
            ];
        } catch (Throwable $e) {
            return $existing;
        }
    }

    /**
     * Re-read a resolved record after a successful write.
     *
     * Updates must diff the record against its own post-write state, not a
     * sparse echo of the HTTP response, otherwise every field that the response
     * omits looks like it was "removed". This returns a fresh snapshot with the
     * same key set as the pre-action one so the before/after comparison is exact.
     *
     * Never throws. Falls back to the existing resolution when the row cannot
     * be found again.
     */
    public static function refreshRecord(Request $request, string $group, ?array $existing): ?array
    {
        if (!$existing || empty($existing['record_id'])) {
            return $existing;
        }

        try {
            $mapKey = self::findMapKey($group);
            if (!$mapKey) {
                return $existing;
            }

            [$modelClass, $labelColumn, $lookupColumns, $label] = self::RECORD_MAP[$mapKey];
            if (!$modelClass) {
                return $existing;
            }

            $record = $modelClass::query()->find($existing['record_id']);
            if (!$record) {
                // Row is gone (soft-deleted or removed mid-flight): keep the
                // before-state so the diff degrades gracefully instead of lying.
                return $existing;
            }

            $recordLabel = $labelColumn ? ($record->{$labelColumn} ?? null) : null;
            if (!$recordLabel) {
                foreach (['name', 'product_name', 'title', 'company_name', 'invoice_no', 'purchase_no', 'ticket_no', 'product_code', 'code', 'phone', 'email'] as $candidate) {
                    if (!empty($record->{$candidate})) {
                        $recordLabel = (string) $record->{$candidate};
                        break;
                    }
                }
            }

            return [
                'record_type'  => class_basename($modelClass),
                'record_id'    => $record->getKey(),
                'record_label' => self::text($recordLabel) ?? ($existing['record_label'] ?? ('#' . $record->getKey())),
                'snapshot'     => self::sanitize($record->attributesToArray()),
            ];
        } catch (Throwable $e) {
            return $existing;
        }
    }

    /**
     * Capture the state a create/update is about to write. For updates this
     * becomes `old_values`; for creates it is simply compared against the
     * response so we can trim noise out of `new_values`.
     */
    public static function snapshotRequest(Request $request): ?array
    {
        try {
            $payload = $request->all();
            if (!is_array($payload) || $payload === []) {
                return null;
            }
            return self::sanitize($payload);
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Pull a compact "what happened" summary out of the JSON response so created
     * records are identifiable without storing an entire invoice payload.
     */
    public static function snapshotResponse($response): ?array
    {
        try {
            $data = $response->getData(true);
            if (!is_array($data)) {
                return null;
            }
            $payload = $data['data'] ?? $data;
            if (is_array($payload) && isset($payload[0]) && is_array($payload[0])) {
                $payload = $payload[0]; // list responses -> first row
            }
            if (!is_array($payload)) {
                return null;
            }

            $trimmed = [];
            foreach ($payload as $key => $value) {
                if (is_array($value)) {
                    $trimmed[$key] = sprintf('[%d items]', count($value));
                } elseif (is_scalar($value) || $value === null) {
                    $trimmed[$key] = is_string($value) && mb_strlen($value) > 200
                        ? mb_substr($value, 0, 200) . '…'
                        : $value;
                }
            }

            return $trimmed === [] ? null : self::sanitize($trimmed);
        } catch (Throwable $e) {
            return null;
        }
    }

    /** Strip secrets and bound the payload size so rows stay small. */
    public static function sanitize(?array $data): ?array
    {
        if (!$data) {
            return null;
        }

        $clean = [];
        foreach ($data as $key => $value) {
            if (in_array(strtolower((string) $key), self::SECRET_FIELDS, true)) {
                $clean[$key] = '***';
                continue;
            }
            if (is_array($value)) {
                $clean[$key] = count($value) > 50
                    ? sprintf('[%d items]', count($value))
                    : self::sanitize($value);
                continue;
            }
            if (is_object($value)) {
                $clean[$key] = method_exists($value, '__toString') ? (string) $value : get_class($value);
                continue;
            }
            if (is_string($value) && mb_strlen($value) > 300) {
                $clean[$key] = mb_substr($value, 0, 300) . '…';
                continue;
            }
            $clean[$key] = $value;
        }

        return $clean;
    }

    /** Build the "Updated Invoice INV-001" sentence shown in the History list. */
    public static function describe(string $module, string $action, ?string $recordLabel): string
    {
        $target = $recordLabel ? ' ' . $recordLabel : '';

        return match ($action) {
            'create'   => "Created {$module}{$target}",
            'update'   => "Updated {$module}{$target}",
            'delete'   => "Deleted {$module}{$target}",
            'toggle'   => "Toggled status of {$module}{$target}",
            'approve'  => "Approved {$module}{$target}",
            'reject'   => "Rejected {$module}{$target}",
            'cancel'   => "Cancelled {$module}{$target}",
            'payment'  => "Recorded payment for {$module}{$target}",
            'login'    => 'Signed in',
            'logout'   => 'Signed out',
            'send'     => "Sent {$module}{$target}",
            'export'   => "Exported {$module} data",
            'print'    => "Printed {$module}{$target}",
            'submit'   => "Submitted {$module}{$target}",
            'comment'  => "Commented on {$module}{$target}",
            'mark_paid' => "Marked {$module}{$target} as paid",
            'copilot', 'smart_suggest', 'detect_anomaly', 'generate_product_info' => "Used AI {$action}",
            default    => ucfirst(str_replace('_', ' ', $action)) . " {$module}{$target}",
        };
    }

    /**
     * Write one trail row. Never throws.
     */
    public static function record(Request $request, array $context, ?array $oldValues = null, ?array $newValues = null): ?AuditLog
    {
        try {
            if (!self::withinWriteBudget()) {
                return null;
            }

            return AuditLog::create([
                'company_id'   => self::companyId($request),
                'user_id'      => $context['user_id'] ?? null,
                'user_name'    => $context['user_name'] ?? 'System User',
                'user_role'    => $context['user_role'] ?? null,
                'module'       => $context['module'] ?? 'General',
                'action'       => $context['action'] ?? 'update',
                'description'  => self::describe(
                    $context['module'] ?? 'General',
                    $context['action'] ?? 'update',
                    $context['record_label'] ?? null,
                ),
                'record_type'  => $context['record_type'] ?? null,
                'record_label' => $context['record_label'] ?? null,
                'record_id'    => $context['record_id'] ?? null,
                'old_values'   => $oldValues,
                'new_values'   => $newValues,
                'http_method'  => $request->method(),
                'endpoint'     => '/' . $request->path(),
                'ip_address'   => $request->ip(),
                'user_agent'   => self::text($request->header('User-Agent'), 500),
                'created_at'   => now(),
            ]);
        } catch (Throwable $e) {
            Log::warning('Audit log write failed: ' . $e->getMessage());
            return null;
        }
    }

    /** Soft flood guard so a retry loop cannot bloat the table. */
    private static function withinWriteBudget(): bool
    {
        try {
            return AuditLog::where('created_at', '>=', now()->subMinute())->count() < self::WRITE_LIMIT_PER_MINUTE;
        } catch (Throwable $e) {
            return true;
        }
    }

    /** Clamp to the column width; returns null for blank strings. */
    private static function text($value, int $max = 150): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $value = trim(strip_tags((string) $value));
        if ($value === '') {
            return null;
        }
        return mb_strlen($value) > $max ? mb_substr($value, 0, $max) : $value;
    }
}