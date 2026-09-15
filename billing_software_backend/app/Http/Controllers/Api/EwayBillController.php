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
    protected $gateway;

    public function __construct()
    {
        $this->gateway = new EwayBillGateway();
    }

    /* ─────────────────────────────────────────
     | SETTINGS
     ───────────────────────────────────────── */

    public function getSettings(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "company_id required"], 422);
        }

        $row = EwayBillSetting::where('company_id', $companyId)->first();

        if (!$row) {
            return response()->json([
                "status" => true,
                "data" => [...$this->emptySettings($companyId)],
            ]);
        }

        $data = $row->toArray();
        unset($data['ewb_password'], $data['gsp_client_secret']);

        $data['gstinSaved'] = !empty($row->gstin);
        $data['usernameSaved'] = !empty($row->ewb_username);
        $data['ewbPasswordSaved'] = !empty($row->ewb_password);
        $data['gspClientSecretSaved'] = !empty($row->gsp_client_secret);

        return response()->json(["status" => true, "data" => $data]);
    }

    public function saveSettings(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        $settings  = $request->input('settings', []);

        if (!$companyId) {
            return response()->json(["status" => false, "message" => "company_id required"], 422);
        }

        $row = EwayBillSetting::firstOrNew(['company_id' => $companyId]);

        $row->api_provider   = ($settings['api_provider'] ?? null);
        $row->environment    = ($settings['environment'] ?? null);
        $row->gstin          = trim($settings['gstin'] ?? '') ?: null;
        $row->ewb_username   = trim($settings['ewb_username'] ?? '') ?: null;
        $row->gsp_client_id  = trim($settings['gsp_client_id'] ?? '') ?: null;
        $row->integration_enabled = (int) (($settings['integration_enabled'] ?? false) ? 1 : 0);

        // Secrets are only ever written (encrypted), never returned.
        if (!empty($settings['ewb_password'])) {
            $row->ewb_password = Crypt::encryptString((string) $settings['ewb_password']);
        }
        if (!empty($settings['gsp_client_secret'])) {
            $row->gsp_client_secret = Crypt::encryptString((string) $settings['gsp_client_secret']);
        }

        $row->save();

        $data = $row->refresh()->toArray();
        unset($data['ewb_password'], $data['gsp_client_secret']);
        $data['ewbPasswordSaved'] = !empty($row->ewb_password);
        $data['gspClientSecretSaved'] = !empty($row->gsp_client_secret);

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill settings saved successfully.",
            "data" => $data,
        ]);
    }

    public function testConnection(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "company_id required"], 422);
        }

        $row = EwayBillSetting::where('company_id', $companyId)->first();
        if (!$row) {
            return response()->json(["status" => false, "message" => "Save your credentials first."], 422);
        }

        $result = $this->gateway->authenticate();

        $row->last_test_at = Carbon::now();
        $row->last_test_status = $result['success'] ? 'connected' : 'failed';
        $row->last_test_message = $result['message'];
        $row->save();

        return response()->json([
            "status" => $result['success'],
            "message" => $result['message'],
            "latency_ms" => $result['latency_ms'],
            "lastTestStatus" => $result['success'] ? 'connected' : 'failed',
            "lastTestMessage" => $result['message'],
        ]);
    }

    /* ─────────────────────────────────────────
     | REGISTRY LIST
     ───────────────────────────────────────── */

    public function list(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        if (!$companyId) {
            return response()->json(["status" => false, "message" => "company_id required"], 422);
        }

        $query = EwayBill::where('company_id', $companyId);

        $search = trim($request->input('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ewb_number', 'like', "%{$search}%")
                    ->orWhere('invoice_no', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        $status = trim($request->input('status', ''));
        if ($status !== '' && strtolower($status) !== 'all status' && strtolower($status) !== 'all') {
            $query->where('status', $status);
        }

        $rows = $query->orderBy('id', 'desc')->get();

        return response()->json(["status" => true, "data" => $rows]);
    }

    /* ─────────────────────────────────────────
     | CREATE (POST / generate E-Way Bill)
     ───────────────────────────────────────── */

    public function create(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        $invoiceId = intval($request->input('invoice_id', 0));
        $invoiceNo = trim($request->input('invoice_no', ''));

        if (!$companyId) {
            return response()->json(["status" => false, "message" => "company_id required"], 422);
        }
        if (!$invoiceId && $invoiceNo === '') {
            return response()->json(["status" => false, "message" => "invoice_id or invoice_no required"], 422);
        }

        // Validate that the source invoice really exists.
        $invoice = null;
        if ($invoiceId > 0) {
            $invoice = DB::table('invoices')->where('id', $invoiceId)->first();
        }
        if (!$invoice && $invoiceNo !== '') {
            $invoice = DB::table('invoices')->where('invoice_no', $invoiceNo)->first();
            if ($invoice) {
                $invoiceId = intval($invoice->id);
            }
        }
        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Referenced invoice not found."], 404);
        }

        // Prevent duplicate generation while an E-Way Bill is still live.
        $existing = EwayBill::where('invoice_id', $invoiceId)
            ->whereIn('status', ['Active', 'In Transporter'])
            ->first();
        if ($existing) {
            return response()->json([
                "status" => false,
                "message" => "An E-Way Bill (" . $existing->ewb_number . ") already exists for this invoice.",
            ], 409);
        }

        $company = Company::find($companyId);
        $setting = EwayBillSetting::where('company_id', $companyId)->first();

        $fromGstin = trim($request->input('from_gstin', ''));
        if ($fromGstin === '') {
            $fromGstin = ($setting && $setting->integration_enabled && !empty($setting->gstin))
                ? $setting->gstin
                : ($company->gstin ?? '');
        }
        $toGstin = trim($request->input('to_gstin', ''));
        if ($toGstin === '') {
            $toGstin = $invoice->gst_no ?? '';
        }

        $customerName = trim($request->input('consignee_name', ''));
        if ($customerName === '') {
            $customerName = trim($invoice->customer_name ?? '');
        }

        // Normalise + enrich line items with product code.
        $items = $this->normaliseItems($request->input('items', []));

        list($taxableTotal, $cgstTotal, $sgstTotal, $igstTotal, $gstTotal) = $this->summariseItems($items);

        $taxableAmount = round(floatval($request->input('taxable_amount', $taxableTotal)), 2);
        if ($taxableAmount <= 0 && $taxableTotal > 0) {
            $taxableAmount = $taxableTotal;
        }
        $cgst = round(floatval($request->input('cgst_amount', $cgstTotal)), 2);
        $sgst = round(floatval($request->input('sgst_amount', $sgstTotal)), 2);
        $igst = round(floatval($request->input('igst_amount', $igstTotal)), 2);
        $gst  = round(floatval($request->input('gst_total', $gstTotal)), 2);
        if ($gst <= 0 && ($cgst + $sgst + $igst) > 0) {
            $gst = $cgst + $sgst + $igst;
        }
        $invoiceValue = round(floatval($request->input('invoice_value', $invoice->total_amount ?? ($taxableAmount + $gst))), 2);
        if ($invoiceValue <= 0) {
            $invoiceValue = round(floatval($invoice->total_amount ?? 0), 2);
        }

        $transportMode = trim($request->input('transport_mode', ''));
        $vehicleNumber = trim($request->input('vehicle_number', ''));
        $distance      = floatval($request->input('distance_km', 0));
        $vehicleType   = trim($request->input('vehicle_type', 'Regular')) ?: 'Regular';
        $supplyType    = trim($request->input('supply_type', '')) ?: 'Supply';
        $subSupplyType = trim($request->input('sub_supply_type', '')) ?: 'Outward';
        $docType       = trim($request->input('doc_type', '')) ?: 'INV';
        $docNumber     = trim($request->input('doc_number', '')) ?: $invoiceNo;
        $docDate       = trim($request->input('doc_date', '')) ?: date('Y-m-d');
        $fromPlace     = trim($request->input('from_place', '')) ?: ($company->company_name ?? '');
        $consigneePlace = trim($request->input('consignee_place', ''));

        if ($transportMode === '' || $vehicleNumber === '') {
            return response()->json([
                "status" => false,
                "message" => "Transport mode and vehicle number are required.",
            ], 422);
        }

        $ewbNumber = $this->gateway->generateEwb($invoiceId, $fromGstin, $docNumber);
        $validUpto = $this->gateway->computeValidity($supplyType, $distance, $vehicleType);

        $bill = EwayBill::create([
            'company_id' => $companyId,
            'invoice_id' => $invoiceId,
            'invoice_no' => $invoiceNo ?: ($invoice->invoice_no ?? ''),
            'invoice_date' => $invoice->created_at ? Carbon::parse($invoice->created_at)->toDateString() : date('Y-m-d'),
            'invoice_value' => $invoiceValue,
            'taxable_amount' => $taxableAmount,
            'gst_total' => $gst,
            'cgst_amount' => $cgst,
            'sgst_amount' => $sgst,
            'igst_amount' => $igst,
            'item_details' => $items,
            'ewb_number' => $ewbNumber,
            'ewaybill_type' => trim($request->input('ewaybill_type', 'EWB')) ?: 'EWB',
            'from_gstin' => $fromGstin,
            'to_gstin' => $toGstin,
            'consignee_name' => $customerName,
            'consignee_place' => $consigneePlace,
            'consignee_address' => trim($request->input('consignee_address', '')) ?: null,
            'from_place' => $fromPlace,
            'from_address' => trim($request->input('from_address', '')) ?: null,
            'transporter_name' => trim($request->input('transporter_name', '')) ?: null,
            'transporter_id' => trim($request->input('transporter_id', '')) ?: null,
            'vehicle_number' => $vehicleNumber,
            'vehicle_type' => $vehicleType,
            'transport_mode' => $transportMode ?: null,
            'supply_type' => $supplyType ?: null,
            'sub_supply_type' => $subSupplyType ?: null,
            'doc_type' => $docType ?: null,
            'doc_number' => $docNumber ?: null,
            'doc_date' => $docDate ?: null,
            'distance_km' => $distance > 0 ? $distance : null,
            'generated_date' => Carbon::now(),
            'valid_upto' => $validUpto,
            'status' => 'Active',
            'customer_name' => $customerName,
            'customer_phone' => trim($request->input('customer_phone', '')) ?: null,
        ]);

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill generated successfully.",
            "data" => $bill,
        ], 201);
    }

    /* ─────────────────────────────────────────
     | UPDATE (vehicle / transporter / distance)
     ───────────────────────────────────────── */

    public function update(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::find($id);

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found."], 404);
        }

        $bill->transport_mode = $request->input('transport_mode', $bill->transport_mode) ?: null;
        $bill->transporter_name = trim($request->input('transporter_name', $bill->transporter_name)) ?: null;
        $bill->transporter_id = trim($request->input('transporter_id', $bill->transporter_id)) ?: null;
        $bill->vehicle_number = trim($request->input('vehicle_number', $bill->vehicle_number));
        $bill->vehicle_type = trim($request->input('vehicle_type', $bill->vehicle_type)) ?: 'Regular';

        $distance = floatval($request->input('distance_km', $bill->distance_km));
        $bill->distance_km = $distance > 0 ? $distance : null;

        $supplyType = $bill->supply_type ?: 'Supply';
        $bill->valid_upto = $this->gateway->computeValidity($supplyType, $bill->distance_km, $bill->vehicle_type);
        $bill->status = 'In Transporter';
        $bill->save();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill updated successfully.",
            "data" => $bill->refresh(),
        ]);
    }

    /* ─────────────────────────────────────────
     | CANCEL / DELETE
     ───────────────────────────────────────── */

    public function cancel(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::find($id);

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found."], 404);
        }
        if ($bill->status === 'Cancelled') {
            return response()->json(["status" => false, "message" => "E-Way Bill already cancelled."], 409);
        }

        $bill->status = 'Cancelled';
        $bill->save();

        return response()->json([
            "status" => true,
            "message" => "E-Way Bill cancelled successfully.",
            "data" => $bill->refresh(),
        ]);
    }

    public function delete(Request $request)
    {
        $id = intval($request->input('id', 0));
        $bill = EwayBill::find($id);

        if (!$bill) {
            return response()->json(["status" => false, "message" => "E-Way Bill not found."], 404);
        }

        $bill->delete();

        return response()->json(["status" => true, "message" => "E-Way Bill deleted successfully."]);
    }

    /* ─────────────────────────────────────────
     | HELPERS
     ───────────────────────────────────────── */

    private function emptySettings(int $companyId): array
    {
        return [
            'id' => null,
            'company_id' => $companyId,
            'api_provider' => 'Adequate GSP (Recommended)',
            'environment' => 'Sandbox (Testing / Demo)',
            'gstin' => '',
            'ewb_username' => '',
            'gsp_client_id' => '',
            'integration_enabled' => true,
            'last_test_at' => null,
            'last_test_status' => null,
            'last_test_message' => null,
            'gstinSaved' => false,
            'usernameSaved' => false,
            'ewbPasswordSaved' => false,
            'gspClientSecretSaved' => false,
        ];
    }

    /**
     * Normalise posted line items and merge product code where available.
     */
    private function normaliseItems($items): array
    {
        $normalised = [];
        if (!is_array($items)) {
            return $normalised;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $productId = intval($item['product_id'] ?? $item['id'] ?? 0);
            $productCode = trim($item['product_code'] ?? '');
            if ($productCode === '' && $productId > 0) {
                $prod = DB::table('products')->where('id', $productId)->first();
                $productCode = $prod ? (string) ($prod->product_code ?? '') : '';
            }

            $qty = floatval($item['quantity'] ?? $item['qty'] ?? 0);
            $rate = floatval($item['price'] ?? $item['rate'] ?? 0);
            $gstRate = floatval($item['gst_rate'] ?? $item['gst'] ?? 0);
            $discount = floatval($item['discount'] ?? 0);

            $taxable = floatval($item['taxable'] ?? $item['taxable_amount'] ?? ($qty * $rate - $discount));
            $cgst = floatval($item['cgst'] ?? $item['cgst_amount'] ?? 0);
            $sgst = floatval($item['sgst'] ?? $item['sgst_amount'] ?? 0);
            $igst = floatval($item['igst'] ?? $item['igst_amount'] ?? 0);
            $lineTotal = floatval($item['line_total'] ?? $item['amount'] ?? ($taxable + $cgst + $sgst + $igst));

            $normalised[] = [
                'product_id' => $productId,
                'product_name' => (string) ($item['product_name'] ?? ''),
                'product_code' => $productCode,
                'hsn' => (string) ($item['hsn'] ?? ''),
                'quantity' => $qty,
                'unit' => (string) ($item['unit'] ?? ''),
                'rate' => $rate,
                'discount' => $discount,
                'gst_rate' => $gstRate,
                'taxable' => round($taxable, 2),
                'cgst' => round($cgst, 2),
                'sgst' => round($sgst, 2),
                'igst' => round($igst, 2),
                'line_total' => round($lineTotal, 2),
            ];
        }

        return $normalised;
    }

    private function summariseItems(array $items): array
    {
        $taxable = 0.0;
        $cgst = 0.0;
        $sgst = 0.0;
        $igst = 0.0;

        foreach ($items as $item) {
            $taxable += floatval($item['taxable'] ?? 0);
            $cgst += floatval($item['cgst'] ?? 0);
            $sgst += floatval($item['sgst'] ?? 0);
            $igst += floatval($item['igst'] ?? 0);
        }

        return [
            round($taxable, 2),
            round($cgst, 2),
            round($sgst, 2),
            round($igst, 2),
            round($cgst + $sgst + $igst, 2),
        ];
    }
}