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
        'royalty_points'     => 'Royalty Points',
        'credit_due'         => 'Credit Due',
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
        'Royalty_Points',
        'Due_Date',
        'Credit_Days',
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
        'royalty_points' => "Congratulations [Party_Name]!\n\nYou have earned [Royalty_Points] Royalty Points.\n\nThank you for being our valued customer at [Firm_Name].\n\nWe look forward to serving you again.\n\nRegards,\n[Firm_Name]",
        'credit_due' => "Dear [Party_Name],\n\nYour credit period of [Credit_Days] days has ended.\n\nInvoice No: [Invoice_Number]\nBalance Due: Rs.[Transaction_Balance]\n\nPlease make the payment at your earliest convenience.\n\nRegards,\n[Firm_Name]",
    ];

    /** Second default template per type (Template 2), seeded into template_2. */
    private const DEFAULTS_2 = [
        'sales' => "Dear [Party_Name],\n\nThank you for shopping with [Firm_Name].\n\nYour invoice details:\nInvoice No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\nBalance Due: Rs.[Transaction_Balance]\n\nPay your invoice easily using the link below:\n[Invoice_Link]\n\nNeed help with anything? Just reply to this message.\n\nRegards,\n[Firm_Name]",
        'sales_return' => "Hi [Party_Name],\n\nYour return has been processed successfully.\n\nReturn Details:\nReturn No: [Invoice_Number]\nReturn Amount: Rs.[Invoice_Amount]\nRefund Amount: Rs.[Payment_Amount]\nBalance: Rs.[Transaction_Balance]\n[Invoice_Link]\n\nThank you for choosing [Firm_Name].\n\nRegards,\n[Firm_Name]",
        'purchase' => "Dear [Party_Name],\n\nWe have recorded your purchase in our books.\n\nPurchase Details:\nPurchase No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\nBalance: Rs.[Transaction_Balance]\n\nWe will pay the outstanding amount as per the agreed terms.\n\nRegards,\n[Firm_Name]",
        'purchase_return' => "Dear [Party_Name],\n\nYour purchase return has been recorded successfully.\n\nReturn Details:\nReturn No: [Invoice_Number]\nReturn Amount: Rs.[Invoice_Amount]\nBalance: Rs.[Transaction_Balance]\n\nPlease credit our account at the earliest.\n\nRegards,\n[Firm_Name]",
        'payment_in' => "Dear [Party_Name],\n\nWe confirm receipt of your payment.\n\nPayment Details:\nReceipt No: [Invoice_Number]\nAmount Received: Rs.[Payment_Amount]\nMode: [Payment_Mode]\n\nThank you for your payment!\n\nRegards,\n[Firm_Name]",
        'payment_out' => "Dear [Party_Name],\n\nWe have processed your payment.\n\nPayment Details:\nReceipt No: [Invoice_Number]\nAmount Paid: Rs.[Payment_Amount]\nMode: [Payment_Mode]\n\nFor any clarifications, please contact [Firm_Name].\n\nRegards,\n[Firm_Name]",
        'expense' => "Hi [Party_Name],\n\nAn expense has been recorded in our books.\n\nExpense Details:\nExpense No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\nBalance: Rs.[Transaction_Balance]\n\nRegards,\n[Firm_Name]",
        'sale_order' => "Dear [Party_Name],\n\nThank you for placing an order with us.\n\nOrder Details:\nOrder No: [Invoice_Number]\nOrder Amount: Rs.[Invoice_Amount]\n\nWe will notify you once your order is processed.\n\nRegards,\n[Firm_Name]",
        'purchase_order' => "Dear [Party_Name],\n\nPlease find our purchase order details below.\n\nOrder Details:\nOrder No: [Invoice_Number]\nOrder Amount: Rs.[Invoice_Amount]\n\nKindly process the order at the earliest.\n\nRegards,\n[Firm_Name]",
        'estimate' => "Dear [Party_Name],\n\nWe are pleased to share your estimate.\n\nEstimate Details:\nEstimate No: [Invoice_Number]\nEstimated Amount: Rs.[Invoice_Amount]\n\nView your estimate:\n[Invoice_Link]\n\nPlease let us know if you have any questions.\n\nRegards,\n[Firm_Name]",
        'proforma_invoice' => "Dear [Party_Name],\n\nPlease find your proforma invoice below.\n\nInvoice Details:\nInvoice No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nView your invoice:\n[Invoice_Link]\n\nRegards,\n[Firm_Name]",
        'delivery_challan' => "Dear [Party_Name],\n\nYour order has been dispatched.\n\nChallan Details:\nChallan No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nPlease receive the goods and verify the contents.\n\nRegards,\n[Firm_Name]",
        'cancelled_invoice' => "Dear [Party_Name],\n\nThis is to inform you that your invoice has been cancelled.\n\nCancellation Details:\nInvoice No: [Invoice_Number]\nCancelled Amount: Rs.[Invoice_Amount]\n\nFor any queries, please contact us.\n\nRegards,\n[Firm_Name]",
        'sale_fa' => "Dear [Party_Name],\n\nWe are pleased to confirm the sale of the fixed asset.\n\nSale Details:\nVoucher No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
        'purchase_fa' => "Dear [Party_Name],\n\nWe have recorded the purchase of a fixed asset.\n\nPurchase Details:\nVoucher No: [Invoice_Number]\nAmount: Rs.[Invoice_Amount]\n\nRegards,\n[Firm_Name]",
        'royalty_points' => "Dear [Party_Name],\n\nGreat news! You now have [Royalty_Points] Royalty Points with [Firm_Name].\n\nKeep shopping with us to earn more reward points.\n\nThank you!\n[Firm_Name]",
        'credit_due' => "Dear [Party_Name],\n\nThis is a friendly reminder that the credit period for invoice [Invoice_Number] has ended.\n\nOutstanding Balance: Rs.[Transaction_Balance]\nDue Date: [Due_Date]\n\nKindly clear the dues to keep your account in good standing.\n\nThank you,\n[Firm_Name]",
    ];

    public function types(): array
    {
        return self::TYPES;
    }

    public function defaultTemplate(string $type): string
    {
        return self::DEFAULTS[$type] ?? '';
    }

    public function defaultTemplate2(string $type): string
    {
        return self::DEFAULTS_2[$type] ?? '';
    }

    /** Returns the stored settings for a type, creating a row with defaults when missing. */
    public function getOrInit(int $companyId, string $type): TransactionMessageSetting
    {
        $row = TransactionMessageSetting::where('company_id', $companyId)
            ->where('transaction_type', $type)
            ->first();

        if ($row) {
            // Backfill Template 2 for rows created before multi-template support.
            if (trim((string) $row->template_2) === '') {
                $default2 = $this->defaultTemplate2($type);
                if ($default2 !== '') {
                    $row->template_2 = $default2;
                    $row->save();
                }
            }
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
            // Credit Due reminders center on the outstanding amount, so the
            // balance line renders by default (still user-togglable per type).
            'party_balance_in_msg' => $type === 'credit_due',
            'web_invoice_link_in_msg' => true,
            'payment_link_in_msg' => false,
            'template' => $this->defaultTemplate($type),
            'template_2' => $this->defaultTemplate2($type),
            'selected_template' => 'template_1',
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
            $existing = TransactionMessageSetting::where('company_id', $companyId)
                ->where('transaction_type', $type)
                ->first();

            $selected = isset($row['selected_template']) ? (string) $row['selected_template'] : 'template_1';
            if (!in_array($selected, ['template_1', 'template_2', 'custom'], true)) {
                $selected = $existing->selected_template ?? 'template_1';
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
                    'template_2' => isset($row['template_2']) ? (string) $row['template_2'] : ($existing->template_2 ?? $this->defaultTemplate2($type)),
                    'custom_template' => isset($row['custom_template']) ? (string) $row['custom_template'] : ($existing->custom_template ?? ''),
                    'selected_template' => $selected,
                    'royalty_points_threshold' => isset($row['royalty_points_threshold']) ? $this->intThreshold($row['royalty_points_threshold'], $existing->royalty_points_threshold ?? null) : ($existing->royalty_points_threshold ?? null),
                    'credit_days' => isset($row['credit_days']) ? $this->intThreshold($row['credit_days'], $existing->credit_days ?? null) : ($existing->credit_days ?? null),
                ]
            );
            $saved += $setting ? 1 : 0;
        }
        return $saved;
    }

    /** The message content that is currently active for a setting row. */
    private function selectedMessage(TransactionMessageSetting $setting): string
    {
        $selected = $setting->selected_template ?: 'template_1';

        if ($selected === 'template_2') {
            $msg = (string) $setting->template_2;
            return $msg !== '' ? $msg : (string) $setting->template;
        }

        if ($selected === 'custom') {
            $msg = (string) $setting->custom_template;
            return $msg !== '' ? $msg : (string) $setting->template;
        }

        return (string) $setting->template;
    }

    /**
     * Replace tokens in a template and drop lines that reference disabled or
     * unavailable values (e.g. [Invoice_Link] when the toggle is off).
     */
    public function generate(TransactionMessageSetting $setting, array $ctx): string
    {
        $template = $this->selectedMessage($setting);
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
        } elseif ($type === 'credit_due') {
            $record = Invoice::where('company_id', $companyId)
                ->where('payment_type', 'credit')
                ->where('balance_amount', '>', 0)
                ->orderBy('id', 'desc')
                ->first();
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

    /**
     * Royalty Points auto-send — called immediately after a customer's
     * loyalty_points are incremented in InvoiceController::createInvoice.
     *
     * The qualifying event is the invoice that earned the points (invoice_no),
     * which the existing dedup mechanism in recordAutoSend uses to prevent
     * duplicate sends for the same earning event.
     *
     * @param \App\Models\Customer $customer         Post-save customer (points already incremented)
     * @param int                 $pointsEarned     Points earned by THIS invoice (> 0 guaranteed)
     * @param string              $referenceInvoice Invoice number of the earning event
     */
    public function handleRoyaltyPoints(int $companyId, $customer, int $pointsEarned, string $referenceInvoice): ?array
    {
        try {
            if ($pointsEarned <= 0) {
                return null;
            }

            $setting = $this->getOrInit($companyId, 'royalty_points');
            if (!$setting->auto_send) {
                return null;
            }

            $threshold = $setting->royalty_points_threshold ?? null;
            if ($threshold === null || (int) $threshold <= 0) {
                return null;
            }

            $balance = (int) $customer->loyalty_points;
            if ($balance < (int) $threshold) {
                return null;
            }

            $phone = trim((string) ($customer->phone ?? ''));
            if ($phone === '') {
                return null;
            }

            // Dedup: never re-send for the same qualifying earning event
            // (a given invoice earned points exactly once).
            $alreadySent = TransactionMessageAutoSend::where('company_id', $companyId)
                ->where('transaction_type', 'royalty_points')
                ->where('txn_no', $referenceInvoice)
                ->exists();
            if ($alreadySent) {
                return null;
            }

            $firm = $this->firm($companyId);

            $ctx = [
                'firm_name'          => $firm['name'],
                'transaction_type'   => self::TYPES['royalty_points'],
                'party_name'         => $customer->name ?? '',
                'party_phone'        => $phone,
                'txn_no'             => $referenceInvoice,
                'invoice_amount'     => '',
                'transaction_balance' => '',
                'payment_amount'     => '',
                'payment_mode'       => '',
                'invoice_link'       => '',
                'payment_link'       => '',
                'royalty_points'     => (string) $balance,
            ];

            $result = $this->autoSend($companyId, 'royalty_points', $ctx, $phone);

            if ($result) {
                \Log::info("[TransactionMessage] royalty-points sent: company={$companyId} customer={$customer->id} balance={$balance} invoice={$referenceInvoice}");
            }

            return $result;
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] royalty-points handler: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Pure date rule for the Credit Due reminder.
     *
     * Configured credit days = N  =>  expiry is the Nth day (credit start + N-1).
     * A reminder is eligible only AFTER the credit period expires:
     *   send when  today > credit_expiry_date  (i.e. today = start + N days or later).
     */
    public static function creditDueEligibility(\Illuminate\Support\Carbon $start, int $creditDays, \Illuminate\Support\Carbon $today): bool
    {
        if ($creditDays <= 0) {
            return false;
        }
        $expiry = (clone $start)->startOfDay()->addDays($creditDays - 1);
        return $today->startOfDay()->gt($expiry);
    }

    /**
     * Evaluate one credit invoice for the Credit Due reminder and send it if
     * every condition holds (enabled + balance + period expired + phone + dedup).
     *
     * Returns a status array so the scheduled check can aggregate results.
     */
    public function handleCreditDue(int $companyId, Invoice $invoice, int $creditDays, ?\Illuminate\Support\Carbon $today = null): array
    {
        try {
            if ($creditDays <= 0) {
                return ['status' => 'skipped', 'reason' => 'no_credit_days'];
            }
            if (($invoice->payment_type ?? '') !== 'credit') {
                return ['status' => 'skipped', 'reason' => 'not_credit'];
            }
            if ((float) ($invoice->balance_amount ?? 0) <= 0) {
                return ['status' => 'skipped', 'reason' => 'balance_zero'];
            }

            $start = \Illuminate\Support\Carbon::parse($invoice->created_at ?? now())->startOfDay();
            if (!$this->creditDueEligibility($start, $creditDays, $today ?? \Illuminate\Support\Carbon::now())) {
                return ['status' => 'skipped', 'reason' => 'not_due'];
            }

            $customer = null;
            $phone = trim((string) ($invoice->customer_phone ?? ''));
            if ($phone === '') {
                $customer = $invoice->customer_id ? Customer::find($invoice->customer_id) : null;
                $phone = trim((string) ($customer->phone ?? ''));
            }
            if ($phone === '') {
                return ['status' => 'skipped', 'reason' => 'no_phone'];
            }

            $txnNo = trim((string) ($invoice->invoice_no ?? ''));
            if ($txnNo === '') {
                return ['status' => 'skipped', 'reason' => 'no_txn_no'];
            }

            // Dedup: the same credit/invoice cycle must never receive the
            // reminder more than once (recorded only on successful send).
            $alreadySent = TransactionMessageAutoSend::where('company_id', $companyId)
                ->where('transaction_type', 'credit_due')
                ->where('txn_no', $txnNo)
                ->exists();
            if ($alreadySent) {
                return ['status' => 'skipped', 'reason' => 'already_sent'];
            }

            $firm = $this->firm($companyId);
            $due = $invoice->due_date
                ?: $start->copy()->addDays($creditDays)->format('Y-m-d');

            $ctx = [
                'firm_name'           => $firm['name'],
                'transaction_type'    => self::TYPES['credit_due'],
                'party_name'          => trim((string) ($invoice->customer_name ?? '')) ?: trim((string) ($customer->name ?? '')),
                'party_phone'         => $phone,
                'txn_no'              => $txnNo,
                'invoice_amount'      => $this->money($invoice->total_amount ?? 0),
                'transaction_balance' => $this->money($invoice->balance_amount ?? 0),
                'payment_amount'      => $this->money($invoice->paid_amount ?? 0),
                'payment_mode'        => ucwords(str_replace('_', ' ', ($invoice->payment_method ?? 'Credit'))),
                'invoice_link'        => $this->invoiceLink($txnNo),
                'payment_link'        => '',
                'royalty_points'      => '',
                'due_date'            => (string) $due,
                'credit_days'         => (string) $creditDays,
            ];

            $result = $this->autoSend($companyId, 'credit_due', $ctx, $phone);

            if ($result) {
                \Log::info("[TransactionMessage] credit-due sent: company={$companyId} invoice={$txnNo} phone={$phone} days={$creditDays}");
                return ['status' => 'sent', 'result' => $result];
            }

            // autoSend returned null (e.g. WhatsApp disconnected). Do NOT mark
            // as sent - the next scheduled run retries.
            return ['status' => 'failed', 'reason' => 'send_failed'];
        } catch (\Throwable $e) {
            \Log::warning("[TransactionMessage] credit-due handler: " . $e->getMessage());
            return ['status' => 'skipped', 'reason' => 'error', 'error' => $e->getMessage()];
        }
    }

    /**
     * Scheduled daily check across companies.
     *
     * Finds every company that has a credit_due setting row and, when the
     * Credit Due auto-send is enabled with a configured credit period, sends
     * the reminder for each outstanding credit invoice past its period.
     */
    public function checkCreditDueReminders(int $companyId = 0): array
    {
        $stats = [
            'companies_checked' => 0,
            'invoices_evaluated' => 0,
            'sent' => 0,
            'failed' => 0,
            'skipped' => [],
        ];

        $query = TransactionMessageSetting::where('transaction_type', 'credit_due');
        if ($companyId > 0) {
            $query->where('company_id', $companyId);
        }
        $companyIds = $query->pluck('company_id')->unique()->values()->all();

        $today = \Illuminate\Support\Carbon::now();

        foreach ($companyIds as $cid) {
            $setting = $this->getOrInit($cid, 'credit_due');
            if (!$setting->auto_send) {
                $stats['skipped']['not_enabled'] = ($stats['skipped']['not_enabled'] ?? 0) + 1;
                continue;
            }
            $creditDays = (int) ($setting->credit_days ?? 0);
            $stats['companies_checked']++;

            $invoices = Invoice::where('company_id', $cid)
                ->where('payment_type', 'credit')
                ->where('balance_amount', '>', 0)
                ->orderBy('id')
                ->get();

            foreach ($invoices as $invoice) {
                $stats['invoices_evaluated']++;
                $result = $this->handleCreditDue($cid, $invoice, $creditDays, $today);
                $reason = $result['reason'] ?? ($result['status'] ?? 'processed');
                if ($result['status'] === 'sent') {
                    $stats['sent']++;
                } elseif ($result['status'] === 'failed') {
                    $stats['failed']++;
                } else {
                    $stats['skipped'][$reason] = ($stats['skipped'][$reason] ?? 0) + 1;
                }
            }
        }

        return $stats;
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
            'royalty_points' => '',
            'due_date' => '',
            'credit_days' => '',
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

            case 'credit_due':
                $setting = $this->getOrInit($companyId, 'credit_due');
                $creditDays = max(1, (int) ($setting->credit_days ?? 0));
                $start = \Illuminate\Support\Carbon::parse($record->created_at ?? now())->startOfDay();
                $due = $record->due_date
                    ?: $start->copy()->addDays($creditDays)->format('Y-m-d');
                $base['party_name'] = $record->customer_name ?? '';
                $base['party_phone'] = $record->customer_phone ?? '';
                $base['txn_no'] = $record->invoice_no ?? '';
                $base['invoice_amount'] = $this->money($record->total_amount ?? 0);
                $base['transaction_balance'] = $this->money($record->balance_amount ?? 0);
                $base['payment_amount'] = $this->money($record->paid_amount ?? 0);
                $base['payment_mode'] = ucwords(str_replace('_', ' ', ($record->payment_method ?? 'Credit')));
                $base['invoice_link'] = $this->invoiceLink($record->invoice_no ?? '');
                $base['due_date'] = (string) $due;
                $base['credit_days'] = (string) $creditDays;
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
        $isCreditDue = $type === 'credit_due';
        $sampleCreditDays = $isCreditDue ? max(1, (int) ($this->getOrInit($companyId, 'credit_due')->credit_days ?? 30)) : 0;

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
                'royalty_points' => 'INV-0001',
                'credit_due' => 'INV-0001',
                default => 'DOC-0001',
            },
            'invoice_amount' => '1,000.00',
            'transaction_balance' => $isPurchaseSide ? '1,000.00' : '500.00',
            'payment_amount' => in_array($type, ['payment_in', 'payment_out', 'sales_return', 'purchase_return'], true) ? '1,000.00' : '',
            'payment_mode' => in_array($type, ['payment_in', 'payment_out', 'sales_return', 'purchase_return'], true) ? 'Cash' : '',
            'invoice_link' => \Illuminate\Support\Str::endsWith(trim($firm['base_url'] ?? ''), '/') ? $firm['base_url'] . 'invoice/web/SAMPLE-INV' : ($firm['base_url'] ?? '') . '/invoice/web/SAMPLE-INV',
            'payment_link' => '',
            'royalty_points' => '100',
            'due_date' => $isCreditDue ? date('Y-m-d', strtotime("+{$sampleCreditDays} days")) : '',
            'credit_days' => $isCreditDue ? (string) $sampleCreditDays : '',
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
            '[Royalty_Points]' => $ctx['royalty_points'] ?? '',
            '[Due_Date]' => $ctx['due_date'] ?? '',
            '[Credit_Days]' => $ctx['credit_days'] ?? '',
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

    private function intThreshold($value, $fallback = null): ?int
    {
        if ($value === null || $value === '') {
            return $fallback !== null ? (int) $fallback : null;
        }
        $n = (int) $value;
        return $n > 0 ? $n : ($fallback !== null ? (int) $fallback : null);
    }
}