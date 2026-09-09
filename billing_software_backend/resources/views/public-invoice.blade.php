<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $invoice->invoice_no }} - {{ $company->company_name ?? 'Invoice' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #eef2f7; color: #1e293b; padding: 24px 12px; }
        .sheet { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(2,6,23,.12); }
        .head { padding: 26px 28px; background: linear-gradient(135deg, #1f8cff 0%, #4338ca 100%); color: #fff; }
        .head .firm { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
        .head .meta { margin-top: 4px; font-size: 13px; color: rgba(255,255,255,.85); }
        .head .grid { display: flex; justify-content: space-between; gap: 16px; margin-top: 18px; flex-wrap: wrap; }
        .head .grid > div { min-width: 180px; }
        .head .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; opacity: .75; margin-bottom: 2px; }
        .head .val { font-size: 15px; font-weight: 600; }
        .status { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.18); }
        .body { padding: 26px 28px; }
        .bill { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
        .bill .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: #64748b; margin-bottom: 4px; }
        .bill .val { font-size: 14px; font-weight: 600; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; text-align: left; padding: 9px 10px; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .amt { text-align: right; }
        .totals { margin-top: 20px; margin-left: auto; width: 260px; }
        .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #334155; }
        .totals .row strong { color: #0f172a; }
        .grand { border-top: 2px solid #1f8cff; margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 800; color: #0f172a; }
        .foot { padding: 20px 28px 26px; border-top: 1px solid #eef2f7; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.7; }
        .thanks { margin-top: 22px; font-size: 13px; color: #475569; }
        @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="head">
            <div class="firm">{{ $company->company_name ?? 'Your Business' }}</div>
            <div class="meta">
                @if($company && !empty($company->company_address)) {{ $company->company_address }} &nbsp;|&nbsp; @endif
                @if($company && !empty($company->phone)) {{ $company->phone }} @endif
                @if($company && !empty($company->gstin)) &nbsp;|&nbsp; GSTIN: {{ $company->gstin }} @endif
            </div>
            <div class="grid">
                <div>
                    <div class="lbl">Invoice Number</div>
                    <div class="val">{{ $invoice->invoice_no }}</div>
                    <div>
                        <span class="status">{{ strtoupper($invoice->payment_status ?? 'Unpaid') }}</span>
                    </div>
                </div>
                <div>
                    <div class="lbl">Invoice Date</div>
                    <div class="val">{{ date('d M Y', strtotime($invoice->created_at ?? now())) }}</div>
                    @if($invoice->due_date)
                        <div class="lbl" style="margin-top:6px">Due Date</div>
                        <div class="val">{{ date('d M Y', strtotime($invoice->due_date)) }}</div>
                    @endif
                </div>
            </div>
        </div>

        <div class="body">
            <div class="bill">
                <div>
                    <div class="lbl">Billed To</div>
                    <div class="val">{{ $invoice->customer_name ?? 'Customer' }}</div>
                    @if(!empty($invoice->customer_phone)) <div style="font-size:12px;color:#64748b;margin-top:2px">{{ $invoice->customer_phone }}</div> @endif
                    @if(!empty($invoice->billing_address)) <div style="font-size:12px;color:#64748b;margin-top:2px">{{ $invoice->billing_address }}</div> @endif
                </div>
                <div>
                    <div class="lbl">Payment</div>
                    <div class="val" style="text-transform:capitalize">{{ str_replace('_', ' ', $invoice->payment_method ?? 'Cash') }}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="amt">Qty</th>
                        <th class="amt">Rate</th>
                        <th class="amt">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $item)
                        <tr>
                            <td>{{ $item['item_name'] ?? $item['product_name'] ?? 'Item' }}</td>
                            <td class="amt">{{ $item['qty'] ?? 1 }}</td>
                            <td class="amt">{{ number_format($item['price'] ?? $item['rate'] ?? 0, 2) }}</td>
                            <td class="amt">{{ number_format($item['amount'] ?? 0, 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" style="text-align:center;color:#94a3b8">No items recorded.</td></tr>
                    @endforelse
                </tbody>
            </table>

            <div class="totals">
                <div class="row"><span>Subtotal</span><span>Rs. {{ number_format($invoice->sub_total ?? 0, 2) }}</span></div>
                <div class="row"><span>GST</span><span>Rs. {{ number_format($invoice->gst_total ?? 0, 2) }}</span></div>
                <div class="row grand"><span>Total</span><span>Rs. {{ number_format($invoice->total_amount ?? 0, 2) }}</span></div>
                <div class="row"><span>Paid</span><span>Rs. {{ number_format($invoice->paid_amount ?? 0, 2) }}</span></div>
                <div class="row"><span>Balance</span><span>Rs. {{ number_format($invoice->balance_amount ?? 0, 2) }}</span></div>
            </div>

            <div class="thanks">Thanks for doing business with us.</div>
        </div>

        <div class="foot">
            {{ $company->company_name ?? 'Your Business' }} &nbsp;•&nbsp; {{ url('/') }}
        </div>
    </div>
</body>
</html>