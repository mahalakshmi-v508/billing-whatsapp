<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\WhatsAppConnection;
use App\Services\TransactionMessageService;
use Illuminate\Http\Request;

class TransactionMessageController extends Controller
{
    private function service(): TransactionMessageService
    {
        return app(TransactionMessageService::class);
    }

    /** GET /api/transaction-messages/settings?company_id= */
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id', $request->query('company_id', 0)));
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'company_id is required.']);
        }

        $service = $this->service();
        $types = [];
        foreach ($service->types() as $key => $label) {
            $row = $service->getOrInit($company_id, $key);
            $types[$key] = [
                'transaction_type' => $key,
                'label' => $label,
                'send_via' => $row->send_via,
                'auto_send' => $row->auto_send,
                'send_to_party' => $row->send_to_party,
                'send_transaction_update' => $row->send_transaction_update,
                'send_copy_to_self' => $row->send_copy_to_self,
                'party_balance_in_msg' => $row->party_balance_in_msg,
                'web_invoice_link_in_msg' => $row->web_invoice_link_in_msg,
                'payment_link_in_msg' => $row->payment_link_in_msg,
                'template' => (string) $row->template,
            ];
        }

        $connection = WhatsAppConnection::where('company_id', $company_id)->first();
        $company = Company::find($company_id);

        return response()->json([
            'status' => true,
            'data' => [
                'types' => $types,
                'connection' => [
                    'connected' => $connection && $connection->status === 'ready',
                    'status' => $connection->status ?? 'disconnected',
                    'phone' => $connection->phone_number ?? null,
                    'name' => $connection->display_name ?? null,
                ],
                'firm' => [
                    'name' => $company->company_name ?? '',
                    'phone' => $company->phone ?? '',
                ],
            ],
        ]);
    }

    /** POST /api/transaction-messages/settings  {company_id, settings:[...]} */
    public function save(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'company_id is required.']);
        }

        $rows = $request->input('settings', []);
        if (!is_array($rows) || count($rows) === 0) {
            return response()->json(['status' => false, 'message' => 'settings[] is required.']);
        }

        $saved = $this->service()->saveAll($company_id, $rows);

        return response()->json(['status' => true, 'saved' => $saved]);
    }

    /** GET /api/transaction-messages/preview-data?company_id=&transaction_type= */
    public function previewData(Request $request)
    {
        $company_id = intval($request->input('company_id', $request->query('company_id', 0)));
        $type = trim($request->input('transaction_type', $request->query('transaction_type', 'sales')));

        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'company_id is required.']);
        }
        if (!isset($this->service()->types()[$type])) {
            return response()->json(['status' => false, 'message' => 'Invalid transaction_type.']);
        }

        return response()->json([
            'status' => true,
            'data' => $this->service()->previewContext($company_id, $type),
        ]);
    }

    /** POST /api/transaction-messages/send  {company_id, transaction_type, reference:{...}, phone?} */
    public function send(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        $type = trim($request->input('transaction_type', ''));
        $reference = $request->input('reference', []);
        $phone = $request->input('phone');

        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'company_id is required.']);
        }
        if (!isset($this->service()->types()[$type])) {
            return response()->json(['status' => false, 'message' => 'Invalid transaction_type.']);
        }

        return response()->json(
            $this->service()->manualSend($company_id, $type, is_array($reference) ? $reference : [], $phone)
        );
    }

    /** GET /api/transaction-messages/attachment-status?company_id=&transaction_type=&txn_no= */
    public function attachmentStatus(Request $request)
    {
        $company_id = intval($request->input('company_id', $request->query('company_id', 0)));
        $type = trim($request->input('transaction_type', $request->query('transaction_type', '')));
        $txn_no = trim($request->input('txn_no', $request->query('txn_no', '')));

        if (!$company_id || $txn_no === '') {
            return response()->json(['status' => false, 'message' => 'company_id and txn_no are required.']);
        }

        return response()->json($this->service()->attachmentStatus($company_id, $type, $txn_no));
    }

    /** POST /api/transaction-messages/attach-pdf  {company_id, transaction_type, txn_no, pdf_base64, filename?} */
    public function attachPdf(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        $type = trim($request->input('transaction_type', ''));
        $txn_no = trim($request->input('txn_no', ''));
        $pdf_base64 = (string) $request->input('pdf_base64', '');
        $filename = (string) $request->input('filename', '');

        if (!$company_id || $txn_no === '') {
            return response()->json(['status' => false, 'message' => 'company_id and txn_no are required.']);
        }
        if ($pdf_base64 === '') {
            return response()->json(['status' => false, 'message' => 'PDF file is required.']);
        }

        return response()->json(
            $this->service()->attachPdf($company_id, $type, $txn_no, $pdf_base64, $filename)
        );
    }
}