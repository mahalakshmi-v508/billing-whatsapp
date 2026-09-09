<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Invoice;

class PublicInvoiceController extends Controller
{
    /** Public web invoice view linked from transaction messages. */
    public function show(string $invoice_no)
    {
        $invoice = Invoice::where('invoice_no', $invoice_no)->first();

        if (!$invoice) {
            abort(404, 'Invoice not found.');
        }

        $items = is_string($invoice->products)
            ? (json_decode($invoice->products, true) ?: [])
            : (is_array($invoice->products) ? $invoice->products : []);

        $company = $invoice->company_id ? Company::find($invoice->company_id) : null;

        return view('public-invoice', [
            'invoice' => $invoice,
            'items' => $items,
            'company' => $company,
        ]);
    }
}