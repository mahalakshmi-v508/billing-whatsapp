<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\TransactionMessageAutoSend;
use App\Models\TransactionMessageSetting;
use App\Models\WhatsAppConnection;
use App\Models\WhatsAppMessage;

class TransactionMessageService
{
    /** Transaction types supported by the Transaction Message feature. */
    public const TYPES = [
        'sales'              => 'Sales',
        'purchase'           => 'Purchase',
        'sales_return'       => 'Sales Return',
        'purchase_return'    => 'Purchase Return',
        'payment_in'         => 'Payment In',
        'payment_out'        => 'Payment Out',
        'sale_order'         => 'Sale Order',
        'purchase_order'     => 'Purchase Order',
        'estimate'           => 'Estimate',
        'proforma_invoice'   => 'Proforma Invoice',
        'delivery_challan'   => 'Delivery Challan',
        'cancelled_invoice'  => 'Cancelled Invoice',
        'expense'            => 'Expense',
        'sale_fa'            => 'Sale FA',
        'purchase_fa'        => 'Purchase FA',
    ];

    /** Token supported inside templates. */
    private const TOKENS = [
        'Firm_Name',
        'Party_Name',
        'Transaction_Type',
        'Invoice_Number',
        'Invoice_Amount',
        'Transaction_Balance',
        'Payment_Amount',
        'Payment_Mode',
        'Invoice_Link',
        'Payment_Link',
    ];

    /** Tokens that get special line-level handling based on settings/values. */
    private const CONDITIONAL_TOKENS = [
        'Transaction_Balance' => 'party_balance_in_msg',
        'Invoice_Link'        => 'web_invoice_link_in_msg',
        'Payment_Link'        => 'payment_link_in_msg',
    ];

    private const DEFAULTS = [
        'sales' => "Greetings from [Firm_Name]\n\nThank you for the purchase. Please find the details of your transaction below.\n\nTransaction Type: [Transaction_Type]\nInvoice Number: [Invoice_Number]\nInvoice Amount: Rs.[Invoice_Amount]\nTransaction Balance: Rs.[Transaction_Balance]\n[Invoice_Link]\n\nFor any queries, please contact [Firm_Name].\n\nRegards,\n[Firm_Name]",
        'sales_return' => "Greetings from [Firm_Name]\n\nYour return has been processed. Please find the return details below.\n\nTransaction Type: [Transaction_Type]\nReturn Number: [Invoice_Number]\nTotal Amount: Rs.[Invoice_Amount]\nRefund Amount: Rs.[Payment_Amount]\nTransaction Balance: Rs.[Transaction_Balance]\n[Invoice_Link]\n\nFor any queries, please contact [Firm_Name].\n\nRegards,\n[Firm_Name]",
        'purchase' => "Greetings from [Firm_Name]\n\nThank you for supplying us. Purchase details are as follows:\n\nTransaction Type: [Transaction_Type]\nPurchase Number: [Invoice_Number]\nPurchase Amount: Rs.[Invoice_Amount]\nBalance Amount: Rs.[Transaction_Balance]\n[Invoice_Link]\n\nRegards,\n[Firm_Name]",
        'purchase_return' => "Greetings from [Firm_Name]\n\nPlease find the return details as follows:\n\nTransaction Type: [Transaction_Type]\nReturn Number: [Invoice_Number]\nReturn Amount: Rs.[Invoice_Amount]\nBalance: Rs.[Transaction_Balance]\n\nPlease settle the above amount at your earliest.\n\nRegards,\n[Firm_Name]",
        'payment_in' => "Greetings from [Firm_Name]\n\nWe have received your payment. Details are as follows:\n\nTransaction Type: [Transaction_Type]\nReceipt Number: [Invoice_Number]\nPayment Amount: Rs.[Payment_Amount]\nPayment Mode: [Payment_Mode]\n[Invoice_Link]\n\nThank you for your payment!\n\nRegards,\n[Firm_Name]",
        'payment_out' => "Greetings from [Firm_Name]\n\nYour payment has been made. Details are as follows:\n\nTransaction Type: [Transaction_Type]\nReceipt Number: [Invoice_Number]\nPayment Amount: Rs.[Payment_Amount]\nPayment Mode: [Payment_Mode]\n\nRegards,\n[Firm_Name]",
        'expense' => "Greetings from [Firm_Name]\n\nPlease find the details of the expense transaction below.\n\nTransaction Type: [Transaction_Type]\nExpense Number: [Invoice_Number]\nExpense Amount: Rs.[Invoice_Amount]\nBalance: Rs.[Transaction_Balance]\n\nRegards,\n[Firm_Name]",
        'sale_order' => "Greetings from [Firm_Name]\n\nThank you for your order. Please find the order details below.\n\nTransaction Type: [Transaction_Type]\nOrder Number: [Invoice_Number]\nOrder Amount: Rs.[Invoice_Amount]\n\nWe will process your order soon.\n\nRegards,\n[Firm_Name]",
        'purchase_order' => "Greetings from [Firm_Name]\n\nPurchase order details are as follows:\n\nTransaction Type: [Transaction_Type]\nOrder Number: [Invoice_Number]\nOrder Amount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
        'estimate' => "Greetings from [Firm_Name]\n\nPlease find the estimate details below.\n\nTransaction Type: [Transaction_Type]\nEstimate Number: [Invoice_Number]\nEstimate Amount: Rs.[Invoice_Amount]\n[Invoice_Link]\n\nRegards,\n[Firm_Name]",
        'proforma_invoice' => "Greetings from [Firm_Name]\n\nPlease find the proforma invoice details below.\n\nTransaction Type: [Transaction_Type]\nInvoice Number: [Invoice_Number]\nInvoice Amount: Rs.[Invoice_Amount]\n[Invoice_Link]\n\nRegards,\n[Firm_Name]",
        'delivery_challan' => "Greetings from [Firm_Name]\n\nYour goods have been dispatched. Please find the challan details below.\n\nTransaction Type: [Transaction_Type]\nChallan Number: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
        'cancelled_invoice' => "Greetings from [Firm_Name]\n\nYour invoice has been cancelled.\n\nTransaction Type: [Transaction_Type]\nInvoice Number: [Invoice_Number]\nCancelled Amount: Rs.[Invoice_Amount]\n\nFor any queries, please contact us.\n\nRegards,\n[Firm_Name]",
        'sale_fa' => "Greetings from [Firm_Name]\n\nWe are pleased to inform you about your fixed asset sale.\n\nTransaction Type: [Transaction_Type]\nVoucher Number: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
        'purchase_fa' => "Greetings from [Firm_Name]\n\nFixed asset purchase details are as follows:\n\nTransaction Type: [Transaction_Type]\nVoucher Number: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
    ];

    public function types(): array
    {
        return self::TYPES;
    }

    public function defaultTemplate(string $type): string
    {
        return self::DEFAULTS[$type] ?? '';
    }

    /** Returns the stored settings for a type, creating a row with defaults when missing. */
    public function getOrInit(int $companyId, string $type): TransactionMessageSetting
    {
        $row = TransactionMessageSetting::where('company_id', $companyId)
            ->where('transaction_type', $type)
            ->first();

        if ($row) {
            return $row;
        }

        return TransactionMessageSetting::create([
            'company_id' => $companyId,
            'transaction_type' => $type,
            'send_via' => 'personal_whatsapp',
            'auto_send' => false,
            'send_to_party' => true,
            'send_transaction_update' => false,
            'send_copy_to_self' => false,
            'party_balance_in_msg' => false,
            'web_invoice_link_in_msg' => true,
            'payment_link_in_msg' => false,
            'template' => $this->defaultTemplate($type),
        ]);
    }

    /** Bulk upsert for the settings page. */
    public function saveAll(int $companyId, array $rows): int
    {
        $saved = 0;
        foreach ($rows as $row) {
            $type = $row['transaction_type'] ?? null;
            if (!$type || !isset(self::TYPES[$type])) {
                continue;
            }
            $setting = TransactionMessageSetting::updateOrCreate(
                ['company_id' => $companyId, 'transaction_type' => $type],
                [
                    'send_via' => 'personal_whatsapp',
                    'auto_send' => $this->bool($row['auto_send'] ?? false),
                    'send_to_party' => $this->bool($row['send_to_party'] ?? true),
                    'send_transaction_update' => $this->bool($row['send_transaction_update'] ?? false),
                    'send_copy_to_self' => $this->bool($row['send_copy_to_self'] ?? false),
                    'party_balance_in_msg' => $this->bool($row['party_balance_in_msg'] ?? false),
                    'web_invoice_link_in_msg' => $this->bool($row['web_invoice_link_in_msg'] ?? true),
                    'payment_link_in_msg' => $this->bool($row['payment_link_in_msg'] ?? false),
                    'template' => isset($row['template']) ? (string) $row['template'] : $this->defaultTemplate($type),
                ]
            );
            $saved += $setting ? 1 : 0;
        }
        return $saved;
    }

    /**
     * Replace tokens in a template and drop lines that reference disabled or
     * unavailable values (e.g. [Invoice_Link] when the toggle is off).
     */
    public function generate(TransactionMessageSetting $setting, array $ctx): string
    {
        $template = (string) $setting->template;
        if (trim($template) === '') {
            return '';
        }

        $enabled = [
            'Transaction_Balance' => $this->bool($setting->party_balance_in_msg),
            'Invoice_Link'        => $this->bool($setting->web_invoice_link_in_msg) && !empty($ctx['invoice_link'] ?? ''),
            'Payment_Link'        => $this->bool($setting->payment_link_in_msg) && !empty($ctx['payment_link'] ?? ''),
            'Payment_Amount'      => ($ctx['payment_amount'] ?? '') !== '',
            'Payment_Mode'        => !empty($ctx['payment_mode'] ?? ''),
        ];

        $lines = preg_split('/\R/', $template);
        $kept = [];

        foreach ($lines as $line) {
            $suppress = false;
            foreach ($enabled as $token => $on) {
                if (!$on && stripos($line, '[' . $token . ']') !== false) {
                    $suppress = true;
                    break;
                }
            }
            if (!$suppress) {
                $kept[] = $line;
            }
        }

        $out = implode("\n", $kept);
        $out = $this->replaceTokens($out, $ctx);

        // Drop dangling label-only lines (e.g. "Balance: " when value absent).
        $out = implode("\n", array_filter(explode("\n", $out), function ($line) {
            $line = rtrim($line);
            if ($line === '') {
                return true; // keep intentional blank lines
            }
            if (preg_match('/^[^:]*:\s*$/', $line)) {
                return false; // label with nothing after it
            }
            return true;
        }));

        return trim($out);
    }

    /** Auto-send after a successful transaction. Never throws to the caller. */
    public function autoSend(int $companyId, string $type, array $ctx, ?string $partyPhone = null): ?array
    {
        try {
            $setting = $this->getOrInit($companyId, $type);
            if (!$setting->auto_send) {
                return null;
            }

            $phone = $partyPhone ?: ($ctx['party_phone'] ?? null);
            if (!$phone) {
                return null;
            }

            $message = $this->generate($setting, $ctx);
            if (trim($message) === '') {
                return null;
            }

            $destinations = $this->destinationsFor($setting, $companyId, $phone);
            if (count($destinations) === 0) {
                return null;
            }

            \Log::info("[AUTO SEND] transaction type={$type} txn_no=" . ($ctx['txn_no'] ?? '') . " customer phone=" . $this->normalizePhone($phone));

            $results = [];
            foreach ($destinations as $num) {
                $res = $this->send($companyId, $num, $message);
                if ($res) {
                    $results[] = $res;
                }
            }

            if (count($results) === 0) {
                return null;
            }

            // Remember this auto-send so the transaction page can attach the PDF
            // (generated client-side with the SAME generator used by the manual
            // WhatsApp share) to the exact same destinations.
            $this->recordAutoSend($companyId, $type, $ctx, $message, $destinations);

            \Log::info("[TransactionMessage] auto-sent {$type} for company {$companyId}", [
                'destinations' => array_values($destinations),
            ]);

            return ['message' => $message, 'sent' => $results];
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] auto-send failed: " . $e->getMessage());
            return null;
        }
    }

    /** Manual send used by the WhatsApp icon / button on transaction pages. */
    public function manualSend(int $companyId, string $type, array $ref = [], ?string $phoneOverride = null): array
    {
        $record = $this->findRecord($companyId, $type, $ref);
        if (!$record) {
            return ['status' => false, 'message' => 'No transaction record available for this type.'];
        }

        $ctx = $this->buildContext($companyId, $type, $record);
        $setting = $this->getOrInit($companyId, $type);
        $message = $this->generate($setting, $ctx);

        $phone = $phoneOverride ?: ($ctx['party_phone'] ?? null);
        if (!$phone) {
            return ['status' => false, 'message' => 'No WhatsApp number available for the party on this transaction.'];
        }
        if (trim($message) === '') {
            return ['status' => false, 'message' => 'Message template is empty for this transaction type.'];
        }

        $res = $this->send($companyId, $phone, $message);
        if (!$res) {
            return ['status' => false, 'message' => 'WhatsApp is not connected. Connect it from Settings > Transaction Message.'];
        }

        return [
            'status' => true,
            'message' => 'Message sent successfully.',
            'data' => [
                'whatsapp_message_id' => $res['whatsapp_message_id'],
                'message_id' => $res['id'],
                'phone' => $phone,
                'text' => $message,
            ],
        ];
    }

    /** Whether a pending auto-send PDF attachment exists for a transaction. */
    public function attachmentStatus(int $companyId, string $type, string $txnNo): array
    {
        $row = TransactionMessageAutoSend::where('company_id', $companyId)
            ->where('transaction_type', $type)
            ->where('txn_no', $txnNo)
            ->first();

        if (!$row || $row->pdf_attached || $row->pdf_attempts >= 3) {
            return ['status' => false, 'auto_sent' => false];
        }

        return [
            'status' => true,
            'auto_sent' => true,
            'txn_no' => $txnNo,
            'message' => (string) $row->message,
            'pdf_attached' => (bool) $row->pdf_attached,
            'attempts' => (int) $row->pdf_attempts,
        ];
    }

    /**
     * Attach the transaction PDF to the auto-sent message. The PDF is generated
     * client-side (html2pdf, the SAME generator used by the manual WhatsApp
     * share) and this server method delivers it through the SAME document path
     * as the manual share: WhatsAppService::sendDocumentBase64() ->
     * node /api/whatsapp/send-document -> Baileys sendDocumentBase64.
     */
    public function attachPdf(int $companyId, string $type, string $txnNo, string $base64, string $filename = ''): array
    {
        try {
            $row = TransactionMessageAutoSend::where('company_id', $companyId)
                ->where('transaction_type', $type)
                ->where('txn_no', $txnNo)
                ->first();

            if (!$row) {
                return ['status' => false, 'message' => 'No pending auto-send attachment for this transaction.'];
            }
            if ($row->pdf_attached) {
                return ['status' => false, 'message' => 'The invoice PDF is already attached for this transaction.'];
            }
            if ($row->pdf_attempts >= 3) {
                return ['status' => false, 'message' => 'Too many PDF attachment attempts for this transaction.'];
            }

            $base64 = preg_replace('#^data:[^;]*;base64,#i', '', (string) $base64);
            if ($base64 === '' || base64_decode($base64, true) === false) {
                return ['status' => false, 'message' => 'Invalid PDF data.'];
            }

            $phones = json_decode((string) $row->destinations, true);
            $phones = is_array($phones) ? array_values(array_filter($phones)) : [];
            if (count($phones) === 0) {
                return ['status' => false, 'message' => 'No destination phone recorded for this transaction.'];
            }

            $connection = WhatsAppConnection::where('company_id', $companyId)->first();
            if (!$connection || $connection->status !== 'ready') {
                $row->increment('pdf_attempts');
                return ['status' => false, 'message' => 'WhatsApp is not connected. Connect it from Settings > Transaction Message.'];
            }

            if (trim($filename) === '') {
                $filename = ($txnNo ?: 'transaction') . '.pdf';
            }
            $safeFilename = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'document.pdf';

            // Caption is the SAME custom message that the auto-send text bubble carried.
            $caption = (string) $row->message;
            $whatsapp = app(WhatsAppService::class);

            \Log::info("[AUTO SEND] PDF path={$safeFilename}, sending message + PDF for type={$type} txn_no={$txnNo}");

            $sent = [];
            foreach ($phones as $phone) {
                $phone = $this->normalizePhone($phone);
                if (!$phone) {
                    continue;
                }
                try {
                    $result = $whatsapp->sendDocumentBase64(
                        $connection->session_id,
                        $phone,
                        $base64,
                        'application/pdf',
                        $safeFilename,
                        $caption
                    );

                    WhatsAppMessage::create([
                        'connection_id' => $connection->id,
                        'company_id' => $companyId,
                        'whatsapp_message_id' => $result['result']['id'] ?? null,
                        'customer_phone' => $phone,
                        'chat_id' => $phone . '@c.us',
                        'direction' => 'outgoing',
                        'message_type' => 'document',
                        'message' => $caption,
                        'media_name' => $safeFilename,
                        'status' => 'sent',
                        'sent_at' => now(),
                    ]);

                    \Log::info("[AUTO SEND] PDF sent successfully for type={$type} txn_no={$txnNo} customer phone={$phone}");
                    $sent[] = $phone;
                } catch (\Throwable $e) {
                    \Log::warning("[AUTO SEND] PDF send failed for {$phone}: " . $e->getMessage());
                }
            }

            $row->increment('pdf_attempts');
            if (count($sent) === 0) {
                return ['status' => false, 'message' => 'Could not send the invoice PDF via WhatsApp.'];
            }

            $row->update(['pdf_attached' => true]);
            return [
                'status' => true,
                'message' => 'Invoice PDF attached and sent via WhatsApp.',
                'data' => ['sent' => $sent],
            ];
        } catch (\Throwable $e) {
            \Log::warning("[AUTO SEND] attach failed: " . $e->getMessage());
            return ['status' => false, 'message' => 'Failed to attach the invoice PDF.'];
        }
    }

    /** Real-world context (for live preview) for a type, or a labeled example. */
    public function previewContext(int $companyId, string $type): array
    {
        if ($type === 'payment_out') {
            $record = PurchasePayment::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } elseif ($type === 'payment_in') {
            $record = Payment::where('company_id', $companyId)->where('payment_type', 'payment_in')->orderBy('id', 'desc')->first();
        } elseif ($type === 'expense') {
            $record = Expense::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } elseif ($type === 'purchase_return') {
            $record = DebitNote::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } elseif ($type === 'sales_return') {
            $record = CreditNote::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } elseif ($type === 'purchase') {
            $record = Purchase::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } elseif ($type === 'sales') {
            $record = Invoice::where('company_id', $companyId)->orderBy('id', 'desc')->first();
        } else {
            $record = null;
        }

        $ctx = $record
            ? $this->buildContext($companyId, $type, $record)
            : $this->exampleContext($companyId, $type);

        $ctx['example'] = !$record;
        return $ctx;
    }

    // ── AUTO-SEND HANDLERS (called right after a successful transaction) ──

    public function handleInvoice(int $companyId, Invoice $invoice): ?array
    {
        try {
            return $this->autoSend($companyId, 'sales', $this->buildContext($companyId, 'sales', $invoice));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] invoice handler: " . $e->getMessage());
            return null;
        }
    }

    public function handleCreditNote(int $companyId, CreditNote $creditNote): ?array
    {
        try {
            return $this->autoSend($companyId, 'sales_return', $this->buildContext($companyId, 'sales_return', $creditNote));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] credit-note handler: " . $e->getMessage());
            return null;
        }
    }

    public function handleDebitNote(int $companyId, DebitNote $debitNote): ?array
    {
        try {
            return $this->autoSend($companyId, 'purchase_return', $this->buildContext($companyId, 'purchase_return', $debitNote));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] debit-note handler: " . $e->getMessage());
            return null;
        }
    }

    public function handlePurchase(int $companyId, Purchase $purchase): ?array
    {
        try {
            return $this->autoSend($companyId, 'purchase', $this->buildContext($companyId, 'purchase', $purchase));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] purchase handler: " . $e->getMessage());
            return null;
        }
    }

    public function handlePaymentIn(int $companyId, Payment $payment): ?array
    {
        try {
            return $this->autoSend($companyId, 'payment_in', $this->buildContext($companyId, 'payment_in', $payment));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] payment-in handler: " . $e->getMessage());
            return null;
        }
    }

    public function handlePaymentOut(
        int $companyId,
        int $supplierId,
        float $amount,
        string $paymentMethod,
        string $receiptNo
    ): ?array {
        try {
            $firm = $this->firm($companyId);
            $supplier = $supplierId ? Supplier::find($supplierId) : null;
            $ctx = [
                'firm_name' => $firm['name'],
                'transaction_type' => self::TYPES['payment_out'],
                'party_name' => $supplier->name ?? '',
                'party_phone' => $supplier->phone ?? '',
                'txn_no' => $receiptNo,
                'invoice_amount' => $this->money($amount),
                'transaction_balance' => '',
                'payment_amount' => $this->money($amount),
                'payment_mode' => ucwords(str_replace('_', ' ', $paymentMethod ?: 'Cash')),
                'invoice_link' => '',
                'payment_link' => '',
            ];
            return $this->autoSend($companyId, 'payment_out', $ctx);
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] payment-out handler: " . $e->getMessage());
            return null;
        }
    }

    public function handleExpense(int $companyId, Expense $expense): ?array
    {
        try {
            return $this->autoSend($companyId, 'expense', $this->buildContext($companyId, 'expense', $expense));
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] expense handler: " . $e->getMessage());
            return null;
        }
    }

    // ── CONTEXT BUILDERS ────────────────────────────────────────────────

    private function buildContext(int $companyId, string $type, $record): array
    {
        $firm = $this->firm($companyId);
        $base = [
            'firm_name' => $firm['name'],
            'transaction_type' => self::TYPES[$type] ?? ucwords(str_replace('_', ' ', $type)),
            'party_name' => '',
            'party_phone' => '',
            'txn_no' => '',
            'invoice_amount' => '',
            'transaction_balance' => '',
            'payment_amount' => '',
            'payment_mode' => '',
            'invoice_link' => '',
            'payment_link' => '',
        ];

        switch ($type) {
            case 'sales':
                $base['party_name'] = $record->customer_name ?? '';
                $base['party_phone'] = $record->customer_phone ?? '';
                $base['txn_no'] = $record->invoice_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                if (($record->paid_amount ?? 0) > 0) {
                    $base['payment_amount'] = $this->money($record->paid_amount);
                    $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_method ?? 'Cash')));
                }
                $base['invoice_link'] = $this->invoiceLink($record->invoice_no ?? '');
                break;

            case 'sales_return':
                $base['party_name'] = $record->customer_name ?? '';
                $base['party_phone'] = $record->customer_phone ?? '';
                $base['txn_no'] = $record->return_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                $base['payment_amount'] = $this->money($record->refund_amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_type ?? 'Cash')));
                $base['invoice_link'] = $this->invoiceLink($record->invoice_no ?? '');
                break;

            case 'purchase_return':
                $base['party_name'] = $record->supplier_name ?? '';
                $base['party_phone'] = $record->supplier_phone ?? '';
                $base['txn_no'] = $record->return_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                $base['payment_amount'] = $this->money($record->refund_amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_type ?? 'Cash')));
                break;

            case 'purchase':
                $supplier = $record->supplier_id ? Supplier::find($record->supplier_id) : null;
                $base['party_name'] = $supplier->name ?? $record->supplier_name ?? '';
                $base['party_phone'] = $supplier->phone ?? $record->supplier_phone ?? '';
                $base['txn_no'] = $record->purchase_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                if (($record->paid_amount ?? 0) > 0) {
                    $base['payment_amount'] = $this->money($record->paid_amount);
                    $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_type ?? ($record->payment_method ?? 'Cash'))));
                }
                break;

            case 'payment_in':
                $cust = $record->customer_id ? Customer::find($record->customer_id) : null;
                $base['party_name'] = $cust->name ?? '';
                $base['party_phone'] = $cust->phone ?? '';
                $base['txn_no'] = $record->receipt_no ?? $record->invoice_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                $base['payment_amount'] = $this->money($record->paid_amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_method ?? 'Cash')));
                break;

            case 'payment_out':
                $supplier = $record->supplier_id ? Supplier::find($record->supplier_id) : null;
                $base['party_name'] = $supplier->name ?? '';
                $base['party_phone'] = $supplier->phone ?? '';
                $base['txn_no'] = $record->receipt_no ?? '';
                $base['invoice_amount'] = $this->money($record->amount ?? 0);
                $base['payment_amount'] = $this->money($record->amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_method ?? 'Cash')));
                break;

            case 'expense':
                $base['party_name'] = $record->party_name ?? '';
                $base['party_phone'] = $record->party_phone ?? '';
                $base['txn_no'] = $record->expense_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                $base['payment_amount'] = $this->money($record->paid_amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_type ?? 'Cash')));
                break;

            default:
                // Types without entities fall back to an example context.
                return $this->exampleContext($companyId, $type);
        }

        return $base;
    }

    private function exampleContext(int $companyId, string $type): array
    {
        $firm = $this->firm($companyId);
        $isPurchaseSide = in_array($type, ['purchase', 'purchase_order', 'purchase_return', 'purchase_fa', 'payment_out'], true);

        return [
            'firm_name' => $firm['name'],
            'transaction_type' => self::TYPES[$type] ?? ucwords(str_replace('_', ' ', $type)),
            'party_name' => $isPurchaseSide ? 'Sample Supplier' : 'Sample Customer',
            'party_phone' => '',
            'txn_no' => match ($type) {
                'sales', 'proforma_invoice', 'cancelled_invoice' => 'INV-0001',
                'sales_return' => 'CRN-0001',
                'purchase_return' => 'DRN-0001',
                'purchase' => 'PUR-0001',
                'sale_order' => 'SO-0001',
                'purchase_order' => 'PO-0001',
                'estimate' => 'EST-0001',
                'delivery_challan' => 'DC-0001',
                'payment_in', 'payment_out' => 'REC-0001',
                'expense' => 'EXP-0001',
                'sale_fa' => 'SFA-0001',
                'purchase_fa' => 'PFA-0001',
                default => 'DOC-0001',
            },
            'invoice_amount' => '1,000.00',
            'transaction_balance' => $isPurchaseSide ? '1,000.00' : '500.00',
            'payment_amount' => in_array($type, ['payment_in', 'payment_out', 'sales_return', 'purchase_return'], true) ? '1,000.00' : '',
            'payment_mode' => in_array($type, ['payment_in', 'payment_out', 'sales_return', 'purchase_return'], true) ? 'Cash' : '',
            'invoice_link' => \Illuminate\Support\Str::endsWith(trim($firm['base_url'] ?? ''), '/') ? $firm['base_url'] . 'invoice/web/SAMPLE-INV' : ($firm['base_url'] ?? '') . '/invoice/web/SAMPLE-INV',
            'payment_link' => '',
        ];
    }

    private function findRecord(int $companyId, string $type, array $ref): ?object
    {
        $ref = $ref ?: [];

        switch ($type) {
            case 'sales':
                $no = $ref['invoice_no'] ?? $ref['txn_no'] ?? null;
                return $no ? Invoice::where('company_id', $companyId)->where('invoice_no', $no)->first() : null;

            case 'sales_return':
                $no = $ref['return_no'] ?? null;
                return $no ? CreditNote::where('company_id', $companyId)->where('return_no', $no)->first() : null;

            case 'purchase_return':
                $no = $ref['return_no'] ?? null;
                return $no ? DebitNote::where('company_id', $companyId)->where('return_no', $no)->first() : null;

            case 'purchase':
                $no = $ref['purchase_no'] ?? null;
                return $no ? Purchase::where('company_id', $companyId)->where('purchase_no', $no)->first() : null;

            case 'payment_in':
                $no = $ref['receipt_no'] ?? null;
                $query = Payment::where('company_id', $companyId)->where('payment_type', 'payment_in');
                return $no ? $query->where(function ($q) use ($no) {
                    $q->where('receipt_no', $no)->orWhere('invoice_no', $no);
                })->first() : null;

            case 'payment_out':
                $no = $ref['receipt_no'] ?? null;
                return $no ? PurchasePayment::where('company_id', $companyId)->where('receipt_no', $no)->first() : null;

            case 'expense':
                $no = $ref['expense_no'] ?? null;
                return $no ? Expense::where('company_id', $companyId)->where('expense_no', $no)->first() : null;

            default:
                return null;
        }
    }

    /** Destinations for one auto-send: party (if enabled) + firm (if copy/update). */
    private function destinationsFor(TransactionMessageSetting $setting, int $companyId, string $partyPhone): array
    {
        $destinations = [];
        $party = $this->normalizePhone($partyPhone);
        if ($setting->send_to_party && $party) {
            $destinations[$party] = $party;
        }
        if ($setting->send_transaction_update || $setting->send_copy_to_self) {
            $firmPhone = $this->firmPhone($companyId);
            if ($firmPhone) {
                $destinations[$firmPhone] = $firmPhone;
            }
        }
        return $destinations;
    }

    /** Persist that an auto-send fired so the PDF can be attached later. */
    private function recordAutoSend(int $companyId, string $type, array $ctx, string $message, array $destinations): void
    {
        $txnNo = trim((string) ($ctx['txn_no'] ?? ''));
        if ($txnNo === '') {
            return;
        }
        TransactionMessageAutoSend::updateOrCreate(
            ['company_id' => $companyId, 'transaction_type' => $type, 'txn_no' => $txnNo],
            [
                'message' => $message,
                'destinations' => json_encode(array_values($destinations)),
                'updated_at' => now(),
            ]
        );
    }

    private function send(int $companyId, string $phone, string $message): ?array
    {
        $phone = $this->normalizePhone($phone);
        if (!$phone || trim($message) === '') {
            return null;
        }

        $connection = WhatsAppConnection::where('company_id', $companyId)->first();
        if (!$connection || $connection->status !== 'ready') {
            return null;
        }

        $whatsapp = app(WhatsAppService::class);
        $result = $whatsapp->sendMessage($connection->session_id, $phone, $message);

        $msg = WhatsAppMessage::create([
            'connection_id' => $connection->id,
            'company_id' => $companyId,
            'whatsapp_message_id' => $result['result']['id'] ?? null,
            'customer_phone' => $phone,
            'chat_id' => $phone . '@c.us',
            'direction' => 'outgoing',
            'message_type' => 'text',
            'message' => $message,
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        return [
            'id' => $msg->id,
            'whatsapp_message_id' => $msg->whatsapp_message_id,
            'phone' => $phone,
        ];
    }

    private function replaceTokens(string $text, array $ctx): string
    {
        $map = [
            '[Firm_Name]' => $ctx['firm_name'] ?? '',
            '[Party_Name]' => $ctx['party_name'] ?? '',
            '[Transaction_Type]' => $ctx['transaction_type'] ?? '',
            '[Invoice_Number]' => $ctx['txn_no'] ?? '',
            '[Invoice_Amount]' => $ctx['invoice_amount'] ?? '',
            '[Transaction_Balance]' => $ctx['transaction_balance'] ?? '',
            '[Payment_Amount]' => $ctx['payment_amount'] ?? '',
            '[Payment_Mode]' => $ctx['payment_mode'] ?? '',
            '[Invoice_Link]' => $ctx['invoice_link'] ?? '',
            '[Payment_Link]' => $ctx['payment_link'] ?? '',
        ];
        return str_replace(array_keys($map), array_values($map), $text);
    }

    private function normalizePhone(string $phone): ?string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if ($phone === '') {
            return null;
        }
        if (strlen($phone) === 10) {
            return '91' . $phone;
        }
        if (strlen($phone) === 11 && $phone[0] === '0') {
            return '91' . substr($phone, 1);
        }
        return $phone;
    }

    private function invoiceLink(string $referenceNo): string
    {
        if (trim($referenceNo) === '') {
            return '';
        }
        return url('/invoice/web/' . rawurlencode($referenceNo));
    }

    private function firm(int $companyId): array
    {
        $company = $companyId ? Company::find($companyId) : null;
        return [
            'name' => $company->company_name ?? 'Your Business',
            'phone' => $company->phone ?? '',
            'base_url' => rtrim(config('app.url', url('/')), '/'),
        ];
    }

    private function firmPhone(int $companyId): ?string
    {
        return $this->normalizePhone($this->firm($companyId)['phone']);
    }

    private function money($value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        return number_format((float) $value, 2);
    }

    private function bool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int) $value === 1;
        }
        return in_array(strtolower((string) $value), ['1', 'true', 'on', 'yes'], true);
    }
}