<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\EwayBill;
use App\Models\EwayBillSetting;
use App\Services\EwayBillGateway;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class EwayBillController extends Controller
{
    private function companyId(Request $request): int
    {
        return intval($request->input('company_id') ?: $request->query('company_id', 0));
    }

    /* ───────────────────────────── SETTINGS ───────────────────────────── */

    public function getSettings(Request $request)
    {
        $companyId = $this->companyId($request);
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $setting = EwayBillSetting::where('company_id', $companyId)->first();
        if (!$setting) {
            return response()->json(["status" => true, "data" => null]);
        }

        return response()->json([
            "status" => true,
            "data" => $this->mapSettings($setting),
        ]);
    }

    public function saveSettings(Request $request)
    {
        $companyId = $this->companyId($request);
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $data = $request->input('settings', is_array($request->input('settings')) ? $request->input('settings') : []);

        $setting = EwayBillSetting::updateOrCreate(
            ['company_id' => $companyId],
            [
                'integration_enabled' => !empty($data['integrationEnabled']) ? 1 : 0,
                'api_provider' => $data['apiProvider'] ?? null,
                'environment' => $data['environment'] ?? null,
                'gstin' => $data['companyGstin'] ?? null,
                'ewb_username' => $data['ewbUsername'] ?? null,
                'gsp_client_id' => $data['gspClientId'] ?? null,
            ]
        );

        // Secrets are only (re)encrypted when a new non-empty value is supplied.
        // An empty/absent field keeps the previously stored encrypted value.
        if (!empty($data['ewbPassword'])) {
            $setting->ewb_password = Crypt::encryptString((string)$data['ewbPassword']);
        }
        if (!empty($data['gspClientSecret'])) {
            $setting->gsp_client_secret = Crypt::encryptString((string)$data['gspClientSecret']);
        }
        $setting->save();

        return response()->json([
            "status" => true,
            "message" => "Settings saved successfully.",
            "data" => $this->mapSettings($setting),
        ]);
    }

    public function testConnection(Request $request)
    {
        $companyId = $this->companyId($request);
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $setting = EwayBillSetting::where('company_id', $companyId)->first();

        $result = EwayBillGateway::authenticate([
            'gstin' => $setting ? $setting->gstin : null,
            'ewb_username' => $setting ? $setting->ewb_username : null,
            'gsp_client_id' => $setting ? $setting->gsp_client_id : null,
            'api_provider' => $setting ? $setting->api_provider : null,
        ]);

        if ($setting) {
            $setting->last_test_at = now();
            $setting->last_test_status = $result['success'] ? 'connected' : 'failed';
            $setting->last_test_message = $result['message'];
            $setting->save();
        }

        return response()->json([
            "status" => $result['success'],
            "message" => $result['message'],
            "latency_ms" => $result['latency_ms'],
            "data" => $setting ? $this->mapSettings($setting) : null,
        ]);
    }

    private function mapSettings(EwayBillSetting $s): array
    {
        return [
            'id' => $s->id,
            'company_id' => $s->company_id,
            'integrationEnabled' => (bool)$s->integration_enabled,
            'apiProvider' => $s->api_provider,
            'environment' => $s->environment,
            'companyGstin' => $s->gstin,
            'ewbUsername' => $s->ewb_username,
            'gspClientId' => $s->gsp_client_id,
            'ewbPasswordSaved' => !empty($s->ewb_password),
            'gspClientSecretSaved' => !empty($s->gsp_client_secret),
            'lastTestAt' => $s->last_test_at,
            'lastTestStatus' => $s->last_test_status,
            'lastTestMessage' => $s->last_test_message,
        ];
    }

    /* ───────────────────────────── REGISTRY ───────────────────────────── */

    public function list(Request $request)
    {
        $companyId = $this->companyId($request);
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $search = trim((string)$request->input('search', ''));
        $status = trim((string)$request->input('status', ''));

        $query = EwayBill::where('company_id', $companyId);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ewb_number', 'like', '%' . $search . '%')
                    ->orWhere('invoice_no', 'like', '%' . $search . '%')
                    ->orWhere('consignee_name', 'like', '%' . $search . '%');
            });
        }

        if ($status !== '' && $status !== 'All Status') {
            $query->where('status', $status);
        }

        $bills = $query->orderBy('generated_date', 'desc')->orderBy('id', 'desc')->get();

        return response()->json([
            "status" => true,
            "data" => $bills->map(fn($b) => $this->mapBill($b)),
        ]);
    }

    public function invoiceOptions(Request $request)
    {
        $companyId = $this->companyId($request);
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $search = trim((string)$request->input('search', ''));

        // Invoices that already have an active E-Way Bill cannot be reused.
        $already = EwayBill::where('company_id', $companyId)
            ->whereIn('status', ['Active', 'In Transporter'])
            ->pluck('invoice_id')
            ->filter()
            ->all();

        $query = DB::table('invoices')
            ->where('company_id', $companyId)
            ->where('gst_type', 'with_gst');

        if (count($already) > 0) {
            $query->whereNotIn('id', $already);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%');
            });
        }

        $invoices = $query->orderBy('id', 'desc')->limit(500)->get();

        return response()->json([
            "status" => true,
            "data" => $invoices->map(fn($i) => [
                'id' => $i->id,
                'invoice_no' => $i->invoice_no,
                'customer_name' => $i->customer_name,
                'total_amount' => $i->total_amount,
                'gst_no' => $i->gst_no,
                'created_at' => $i->created_at,
            ]),
        ]);
    }

    public function create(Request $request)
    {
        $companyId = $this->companyId($request);
        $invoiceId = intval($request->input('invoice_id', 0));

        if (!$companyId || !$invoiceId) {
            return response()->json(["status" => false, "message" => "Invoice ID required"]);
        }

        $invoice = DB::table('invoices')
            ->where('id', $invoiceId)
            ->where('company_id', $companyId)
            ->first();

        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Invoice not found"]);
        }

        $existing = EwayBill::where('company_id', $companyId)
            ->where('invoice_id', $invoiceId)
            ->whereIn('status', ['Active', 'In Transporter'])
            ->first();

        if ($existing) {
            return response()->json(["status" => false, "message" => "An active E-Way Bill already exists for this invoice"]);
        }

        $setting = EwayBillSetting::where('company_id', $companyId)->first();
        $company = Company::where('id', $companyId)->first();

        $fromGstin = ($setting && $setting->gstin) ? $setting->gstin : ($company ? $company->gstin : null);
        $toGstin = $invoice->gst_no;

        if (empty($fromGstin)) {
            return response()->json([
                "status" => false,
                "message" => "Company GSTIN is not configured. Save E-Way Bill settings first.",
            ]);
        }

        $generated = now();
        $gatewayResult = EwayBillGateway::generateEwb([
            'invoice_id' => $invoiceId,
            'from_gstin' => $fromGstin,
            'vehicle_type' => (string)$request->input('vehicle_type', 'Regular'),
            'distance_km' => $request->input('distance_km'),
        ]);

        $bill = new EwayBill();
        $bill->company_id = $companyId;
        $bill->invoice_id = $invoiceId;
        $bill->invoice_no = $invoice->invoice_no;
        $bill->invoice_date = $invoice->created_at ? Carbon::parse($invoice->created_at)->toDateString() : null;
        $bill->invoice_value = $invoice->total_amount;
        $bill->ewb_number = $gatewayResult['ewb_number'];
        $bill->ewaybill_type = 'EWB';
        $bill->from_gstin = $fromGstin;
        $bill->to_gstin = $toGstin;
        $bill->consignee_name = $invoice->customer_name;
        $bill->consignee_place = trim((string)$request->input('ship_to', ''));
        $bill->from_place = trim((string)$request->input('from_place', $company ? ($company->company_address ?? '') : ''));
        $bill->transporter_name = trim((string)$request->input('transporter_name', ''));
        $bill->transporter_id = trim((string)$request->input('transporter_id', ''));
        $bill->vehicle_number = trim((string)$request->input('vehicle_number', ''));
        $bill->vehicle_type = (string)$request->input('vehicle_type', 'Regular');
        $bill->distance_km = $request->input('distance_km');
        $bill->generated_date = $generated;
        $bill->valid_upto = $gatewayResult['valid_upto'];
        $bill->status = 'Active';
        $bill->save();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill generated successfully (EWB: {$bill->ewb_number}).",
            "data" => $this->mapBill($bill),
        ]);
    }

    public function update(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::where('id', $id)->first();

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found"]);
        }
        if ($bill->status === 'Cancelled') {
            return response()->json(["status" => false, "message" => "Cancelled bills cannot be updated"]);
        }

        if ($request->has('vehicle_number')) {
            $bill->vehicle_number = trim((string)$request->input('vehicle_number', ''));
        }
        if ($request->has('vehicle_type')) {
            $bill->vehicle_type = (string)$request->input('vehicle_type', 'Regular');
        }
        if ($request->has('distance_km')) {
            $bill->distance_km = $request->input('distance_km');
        }
        if ($request->has('transporter_name')) {
            $bill->transporter_name = trim((string)$request->input('transporter_name', ''));
        }
        if ($request->has('transporter_id')) {
            $bill->transporter_id = trim((string)$request->input('transporter_id', ''));
        }
        if ($request->has('ship_to')) {
            $bill->consignee_place = trim((string)$request->input('ship_to', ''));
        }
        if ($request->has('status') && in_array($request->input('status'), ['Active', 'In Transporter', 'Expired'])) {
            $bill->status = $request->input('status');
        }

        // Recompute validity when transport details change.
        if ($request->has('vehicle_number') || $request->has('vehicle_type') || $request->has('distance_km')) {
            $bill->valid_upto = EwayBillGateway::computeValidity($bill->vehicle_type, $bill->distance_km);
        }

        $bill->save();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill updated successfully.",
            "data" => $this->mapBill($bill),
        ]);
    }

    public function cancel(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::where('id', $id)->first();

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found"]);
        }
        if ($bill->status === 'Cancelled') {
            return response()->json(["status" => false, "message" => "E-Way Bill is already cancelled"]);
        }

        $bill->status = 'Cancelled';
        $bill->save();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill {$bill->ewb_number} cancelled.",
            "data" => $this->mapBill($bill),
        ]);
    }

    public function delete(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::where('id', $id)->first();

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found"]);
        }

        $bill->delete();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill deleted.",
        ]);
    }

    private function mapBill(EwayBill $b): array
    {
        return [
            'id' => $b->id,
            'ewbNo' => $b->ewb_number,
            'ewb_number' => $b->ewb_number,
            'invoice_id' => $b->invoice_id,
            'invoice' => trim(($b->invoice_no ?: '-') . ($b->invoice_date ? ' · ' . Carbon::parse($b->invoice_date)->format('d/m/Y') : '')),
            'invoice_no' => $b->invoice_no,
            'invoice_date' => $b->invoice_date,
            'invoice_value' => $b->invoice_value,
            'recipient' => trim(($b->consignee_name ?: '') . ($b->consignee_place ? ', ' . $b->consignee_place : '')),
            'shipTo' => $b->consignee_place,
            'generatedDate' => $b->generated_date ? Carbon::parse($b->generated_date)->format('d/m/Y h:i A') : '',
            'validUpto' => $b->valid_upto ? Carbon::parse($b->valid_upto)->format('d/m/Y h:i A') : '',
            'vehicle' => trim(($b->vehicle_number ?: '-') . ' · ' . $b->vehicle_type),
            'vehicle_number' => $b->vehicle_number,
            'vehicle_type' => $b->vehicle_type,
            'distance_km' => $b->distance_km,
            'transporter' => trim(($b->transporter_name ?: '-') . ($b->transporter_id ? ' (' . $b->transporter_id . ')' : '')),
            'transporter_name' => $b->transporter_name,
            'transporter_id' => $b->transporter_id,
            'from_gstin' => $b->from_gstin,
            'to_gstin' => $b->to_gstin,
            'status' => $b->status,
            'generated_date' => $b->generated_date,
            'valid_upto' => $b->valid_upto,
        ];
    }
}