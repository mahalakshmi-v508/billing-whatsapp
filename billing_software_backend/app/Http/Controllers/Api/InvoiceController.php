<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Payment;
use App\Models\Customer;
use App\Models\InvoiceSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class InvoiceController extends Controller
{
    public function getNextInvoiceNo(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        $setting = InvoiceSetting::getForCompany($company_id);
        $prefix  = $setting->prefix;
        $seq     = max(1, intval($setting->next_number));
        $padding = max(1, intval($setting->padding));

        while (Invoice::where('company_id', $company_id)->where('invoice_no', InvoiceSetting::formatNumber($prefix, $seq, $padding))->exists()) {
            $seq++;
        }

        $formattedInvoiceNo = InvoiceSetting::formatNumber($prefix, $seq, $padding);

        return response()->json([
            "status"     => true,
            "invoice_no" => $formattedInvoiceNo,
            "prefix"     => $prefix,
            "sequence"   => $seq,
            "padding"    => $padding
        ]);
    }

    public function createInvoice(Request $request)
    {
        $company_id     = intval($request->input('company_id', 0));
        $customer_id    = intval($request->input('customer_id', 0));
        $customer_name  = trim($request->input('customer_name', ''));
        if ($customer_name === "") $customer_name = "Customer";
        $customer_phone = trim($request->input('customer_phone', ''));
        $cashier_id     = intval($request->input('cashier_id', 0));
        $products       = $request->input('products', []);
        $sub_total      = floatval($request->input('sub_total', 0));
        $gst_total      = floatval($request->input('gst_total', 0));
        $total_amount   = floatval($request->input('total_amount', 0));
        $paid_amount    = floatval($request->input('paid_amount', 0));
        $payment_method = trim($request->input('payment_method', 'cash'));
        $payment_type   = trim($request->input('payment_type', 'cash'));
        $gst_type       = trim($request->input('gst_type', 'without_gst'));
        $gst_no         = trim($request->input('gst_no', ''));
        
        /* SEQUENTIAL INVOICE NUMBER GENERATION (VIA INVOICE_SETTINGS TABLE) */
        $custom_invoice_no = trim($request->input('invoice_no', ''));
        $invSetting = InvoiceSetting::getForCompany($company_id);
        $prefix  = $invSetting->prefix;
        $nextSeq = max(1, intval($invSetting->next_number));
        $padding = max(1, intval($invSetting->padding));

        if (!empty($custom_invoice_no) && !Invoice::where('company_id', $company_id)->where('invoice_no', $custom_invoice_no)->exists()) {
            $invoice_no = $custom_invoice_no;
        } else {
            while (Invoice::where('company_id', $company_id)->where('invoice_no', InvoiceSetting::formatNumber($prefix, $nextSeq, $padding))->exists()) {
                $nextSeq++;
            }
            $invoice_no = InvoiceSetting::formatNumber($prefix, $nextSeq, $padding);
            $nextSeq++;
        }

        // Increment sequence in invoice_settings table
        $invSetting->next_number = $nextSeq;
        $invSetting->save();

        /* VALIDATION */
        if (empty($customer_name) && empty($customer_phone)) {
            return response()->json(["status" => false, "message" => "Customer name or phone required"]);
        }
        if (!empty($customer_phone) && !preg_match('/^[0-9]{10}$/', $customer_phone)) {
            return response()->json(["status" => false, "message" => "Invalid phone number"]);
        }
        if (count($products) == 0) {
            return response()->json(["status" => false, "message" => "No products"]);
        }

        /* GST CONTROL */
        if ($gst_type === "without_gst") {
            $gst_total    = 0;
            $total_amount = $sub_total;
        }

        $admin_id = intval($request->input('admin_id', 0));
        if ($admin_id <= 0 && $company_id > 0) {
            $comp = DB::table('companies')->where('id', $company_id)->first();
            if ($comp && !empty($comp->admin_id)) {
                $admin_id = intval($comp->admin_id);
            }
        }

        /* AUTO-CREATE OR RESOLVE CUSTOMER (MANDATORY FOR CREDIT SALES) */
        $isCashDefault = in_array(strtolower($customer_name), ['cash customer', 'customer', '']);
        if ($customer_id <= 0 && (!$isCashDefault || $payment_type === 'credit')) {
            $existingCust = null;
            if (!empty($customer_phone)) {
                $existingCust = Customer::where('phone', $customer_phone)
                    ->where('is_deleted', 0)
                    ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
                    ->first();
            }
            if (!$existingCust && !empty($customer_name) && !$isCashDefault) {
                $existingCust = Customer::where('name', $customer_name)
                    ->where('is_deleted', 0)
                    ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
                    ->first();
            }

            if ($existingCust) {
                $customer_id = $existingCust->id;
            } else {
                $cName = $isCashDefault ? "Credit Customer " . time() : $customer_name;
                $newCust = Customer::create([
                    'admin_id'        => $admin_id,
                    'name'            => $cName,
                    'phone'           => $customer_phone ?: '',
                    'address'         => $request->input('billing_address', ''),
                    'type'            => 'retail',
                    'credit_enabled'  => 1,
                    'credit_limit'    => 0,
                    'credit_days'     => 0,
                    'gst_no'          => $gst_no ?: null,
                    'loyalty_points'  => 0,
                    'advance_balance' => 0,
                    'pending_amount'  => 0,
                    'status'          => 'active',
                    'is_deleted'      => 0,
                    'created_at'      => now(),
                ]);
                $customer_id = $newCust->id;
            }
        }

        /* CREDIT / CASH LOGIC */
        $advance_balance = 0.0;
        if ($customer_id > 0) {
            $cust = Customer::find($customer_id);
            if ($cust) {
                $advance_balance = floatval($cust->advance_balance);
            }
        }
        $advance_used    = min($advance_balance, $total_amount);
        $effective_total = $total_amount - $advance_used;

        if ($payment_type === "credit") {
            $final_paid      = $advance_used;
            $balance_amount  = $effective_total;
            $payment_status  = $balance_amount <= 0 ? "paid" : ($advance_used > 0 ? "partial" : "not_paid");
            $advance_delta   = -$advance_used;
        } else {
            $total_received  = $paid_amount + $advance_used;

            if ($total_received >= $total_amount) {
                $final_paid     = $total_amount;
                $balance_amount = 0;
                $payment_status = "paid";
                $extra          = $total_received - $total_amount;
                $advance_delta  = $extra - $advance_used;
            } else {
                $final_paid     = $total_received;
                $balance_amount = $total_amount - $total_received;
                $payment_status = "partial";
                $advance_delta  = -$advance_used;
            }
        }

        /* DUE DATE */
        $due_date = null;
        if ($payment_type === "credit") {
            if ($request->filled('due_date')) {
                $due_date = $request->input('due_date');
            } else {
                $credit_days = 0;
                if ($customer_id > 0) {
                    $cust = Customer::find($customer_id);
                    if ($cust) {
                        $credit_days = intval($cust->credit_days);
                    }
                }
                $due_date = $credit_days > 0
                    ? date('Y-m-d', strtotime("+$credit_days days"))
                    : date('Y-m-d');
            }
        }

        /* PREVIOUS BALANCE */
        $previous_balance = 0;
        if ($customer_id > 0) {
            $previous_balance = floatval(Invoice::where('customer_id', $customer_id)
                ->where('balance_amount', '>', 0)
                ->sum('balance_amount'));
        }
        $current_balance = $previous_balance + $balance_amount;

        DB::beginTransaction();
        try {
            /* PROCESS PRODUCTS & AUTO-CREATE UNLISTED ITEMS WITH NEGATIVE STOCK */
            $processedProducts = [];
            foreach ($products as $item) {
                $product_id = intval($item['product_id'] ?? 0);
                $qty        = floatval($item['qty'] ?? 1);
                $prodName   = trim($item['product_name'] ?? $item['name'] ?? '');

                if ($product_id > 0) {
                    $prod = Product::where('id', $product_id)->where('is_deleted', 0)->first();
                    if ($prod) {
                        $item['product_id'] = $prod->id;
                        $item['product_name'] = $prod->product_name;
                    }
                } else if (!empty($prodName)) {
                    // Check if existing product matches name for company
                    $existingProd = Product::where('company_id', $company_id)
                        ->where('is_deleted', 0)
                        ->whereRaw('LOWER(product_name) = ?', [strtolower($prodName)])
                        ->first();

                    if ($existingProd) {
                        $item['product_id'] = $existingProd->id;
                        $item['product_name'] = $existingProd->product_name;
                    } else {
                        // AUTO-CREATE UNLISTED PRODUCT WITH INITIAL NEGATIVE STOCK (-$qty)
                        $price = floatval($item['price'] ?? 0);
                        $gstPct = floatval($item['gst'] ?? $item['tax_percent'] ?? 0);
                        $unit = !empty($item['unit']) && $item['unit'] !== 'NONE' ? trim($item['unit']) : 'PCS';
                        $code = !empty($item['product_code']) ? trim($item['product_code']) : null;

                        $newProd = Product::create([
                            'product_name'   => $prodName,
                            'product_code'   => $code,
                            'price'          => $price,
                            'sale_price'     => $price,
                            'purchase_price' => 0,
                            'stock'          => -floatval($qty), // Automatically added with minus quantity
                            'unit'           => $unit,
                            'gst_percentage' => $gstPct,
                            'company_id'     => $company_id,
                            'status'         => 'active',
                            'is_deleted'     => 0,
                            'created_at'     => now(),
                        ]);

                        $item['product_id'] = $newProd->id;
                        $item['product_name'] = $newProd->product_name;
                        $item['auto_created'] = true;
                    }
                }
                $processedProducts[] = $item;
            }
            $products = $processedProducts;

            /* INSERT INVOICE */
            $invoice = Invoice::create([
                'invoice_no' => $invoice_no,
                'customer_id' => $customer_id > 0 ? $customer_id : null,
                'customer_name' => $customer_name,
                'customer_phone' => $customer_phone,
                'cashier_id' => $cashier_id,
                'products' => $products,
                'sub_total' => $sub_total,
                'gst_total' => $gst_total,
                'total_amount' => $total_amount,
                'paid_amount' => $final_paid,
                'balance_amount' => $balance_amount,
                'previous_balance' => $previous_balance,
                'current_balance' => $current_balance,
                'payment_method' => $payment_method,
                'payment_type' => $payment_type,
                'gst_type' => $gst_type,
                'gst_no' => $gst_no ?: null,
                'payment_status' => $payment_status,
                'company_id' => $company_id,
                'due_date' => $due_date,
                'created_at' => now()
            ]);

            /* INSERT PAYMENT */
            Payment::create([
                'company_id' => $company_id,
                'invoice_id' => $invoice->id,
                'invoice_no' => $invoice_no,
                'customer_id' => $customer_id > 0 ? $customer_id : 0,
                'total_amount' => $total_amount,
                'paid_amount' => $final_paid,
                'balance_amount' => $balance_amount,
                'payment_method' => $payment_method,
                'payment_status' => $payment_status,
                'notes' => ''
            ]);

            /* DEDUCT STOCK (For existing items that were not already created with initial negative stock) */
            foreach ($products as $item) {
                $pid = intval($item['product_id'] ?? 0);
                $qty = floatval($item['qty'] ?? 1);
                if ($pid > 0 && empty($item['auto_created'])) {
                    Product::where('id', $pid)->decrement('stock', $qty);
                }
            }

            /* UPDATE CUSTOMER */
            $total_pending = $current_balance;
            if ($customer_id > 0) {
                $cust = Customer::find($customer_id);
                if ($cust) {
                    $new_advance = max(0.0, floatval($cust->advance_balance) + $advance_delta);
                    $cust->advance_balance = $new_advance;

                    if ($payment_type !== "credit") {
                        $points = floor($total_amount / 100);
                        if ($points > 0) {
                            $cust->loyalty_points = intval($cust->loyalty_points) + $points;
                        }
                    }
                    $cust->pending_amount = $total_pending;
                    $cust->save();
                }
            }

            DB::commit();

            app(\App\Services\TransactionMessageService::class)->handleInvoice($company_id, $invoice);

            /* LAST INVOICE */
            $last_invoice = null;
            if ($customer_id > 0) {
                $last_invoice = Invoice::where('customer_id', $customer_id)
                    ->where('company_id', $company_id)
                    ->where('id', '!=', $invoice->id)
                    ->orderBy('id', 'desc')
                    ->first();
            }

            return response()->json([
                "status"         => true,
                "invoice_no"     => $invoice_no,
                "invoice_id"     => $invoice->id,
                "advance_used"   => $advance_used,
                "advance_delta"  => $advance_delta,
                "balance_amount" => $balance_amount,
                "payment_status" => $payment_status,
                "pending_amount" => $total_pending,
                "last_invoice"   => $last_invoice,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(["status" => false, "message" => $e->getMessage()]);
        }
    }

    public function getAllInvoice(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        $invoices = DB::table('invoices as i')
            ->leftJoin('users as u', 'i.cashier_id', '=', 'u.id')
            ->select('i.*', 'u.name as cashier_name')
            ->where('i.company_id', $company_id)
            ->orderBy('i.id', 'desc')
            ->get();

        $data = [];
        foreach ($invoices as $row) {
            $rowArray = (array)$row;
            $rowArray['products'] = json_decode($rowArray['products']);
            $data[] = $rowArray;
        }

        return response()->json([
            "status" => true,
            "data" => $data
        ]);
    }

    public function getFilteredInvoices(Request $request)
    {
        $company_id     = intval($request->input('company_id', 0));
        $from_date      = $request->input('from_date', '');
        $to_date        = $request->input('to_date', '');
        $payment_method = $request->input('payment_method', 'all');
        $payment_status = $request->input('payment_status', 'all');
        $customer_name  = trim($request->input('customer_name', ''));
        $brand_id       = intval($request->input('brand_id', 0));

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        $query = DB::table('invoices as i')
            ->leftJoin('users as u', 'i.cashier_id', '=', 'u.id')
            ->leftJoin('companies as c', 'i.company_id', '=', 'c.id')
            ->leftJoin('customers as cust', 'i.customer_id', '=', 'cust.id')
            ->select('i.*', 'u.name as cashier_name', 'c.gstin', 'cust.gst_no as customer_gst_no')
            ->where('i.company_id', $company_id);

        if ($from_date && $to_date) {
            $query->whereBetween(DB::raw('DATE(i.created_at)'), [$from_date, $to_date]);
        } elseif ($from_date) {
            $query->where(DB::raw('DATE(i.created_at)'), '>=', $from_date);
        } elseif ($to_date) {
            $query->where(DB::raw('DATE(i.created_at)'), '<=', $to_date);
        }

        if ($payment_method && $payment_method !== 'all') {
            $query->where('i.payment_method', $payment_method);
        }

        $today = date('Y-m-d');
        if ($payment_status === 'paid') {
            $query->where('i.balance_amount', 0);
        } elseif ($payment_status === 'not_paid') {
            $query->where('i.paid_amount', 0)
                  ->where('i.balance_amount', '>', 0)
                  ->where(function($q) use ($today) {
                      $q->whereNull('i.due_date')->orWhere('i.due_date', '>=', $today);
                  });
        } elseif ($payment_status === 'pending') {
            $query->where('i.paid_amount', '>', 0)
                  ->where('i.balance_amount', '>', 0)
                  ->where(function($q) use ($today) {
                      $q->whereNull('i.due_date')->orWhere('i.due_date', '>=', $today);
                  });
        } elseif ($payment_status === 'overdue') {
            $query->where('i.balance_amount', '>', 0)->where('i.due_date', '<', $today);
        }

        if ($customer_name) {
            $query->where('i.customer_name', 'like', "%{$customer_name}%");
        }

        $invoices = $query->orderBy('i.id', 'desc')->get();

        $rows = [];
        $total_invoices    = 0;
        $total_amount_sum  = 0;
        $total_paid_sum    = 0;
        $total_pending_sum = 0;
        $total_brand_amount_sum = 0;

        foreach ($invoices as $row) {
            $rowArray = (array)$row;

            $bal = floatval($rowArray['balance_amount']);
            $paid = floatval($rowArray['paid_amount']);
            if ($bal == 0) {
                $rowArray['payment_status'] = 'paid';
            } elseif ($paid == 0) {
                if (!empty($rowArray['due_date']) && $rowArray['due_date'] < $today) {
                    $rowArray['payment_status'] = 'overdue';
                } else {
                    $rowArray['payment_status'] = 'not_paid';
                }
            } else {
                if (!empty($rowArray['due_date']) && $rowArray['due_date'] < $today) {
                    $rowArray['payment_status'] = 'overdue';
                } else {
                    $rowArray['payment_status'] = 'pending';
                }
            }

            $products_list = json_decode($rowArray['products'] ?? '[]', true);
            $rowArray['products'] = $products_list;

            $matched = true;
            $rowArray['brand_line_amount'] = 0;

            if ($brand_id > 0) {
                $matched = false;
                foreach ($products_list as $item) {
                    $productId = intval($item['product_id'] ?? 0);
                    $qty   = floatval($item['quantity'] ?? $item['qty'] ?? 0);
                    $price = floatval($item['price'] ?? $item['unit_price'] ?? 0);

                    $prod = Product::find($productId);
                    if ($prod && intval($prod->brand_id) == $brand_id) {
                        $matched = true;
                        $rowArray['brand_line_amount'] += ($qty * $price);
                    }
                }
            }

            if (!$matched) {
                continue;
            }

            $rows[] = $rowArray;
            $total_invoices++;
            $total_amount_sum += floatval($rowArray['total_amount']);
            $total_paid_sum += floatval($rowArray['paid_amount']);
            $total_pending_sum += floatval($rowArray['balance_amount']);
            $total_brand_amount_sum += floatval($rowArray['brand_line_amount']);
        }

        return response()->json([
            "status" => true,
            "data" => $rows,
            "summary" => [
                "total_invoices" => $total_invoices,
                "total_amount" => $total_amount_sum,
                "total_paid" => $total_paid_sum,
                "total_pending" => $total_pending_sum,
                "total_brand_amount" => $total_brand_amount_sum
            ]
        ]);
    }

    public function getFilteredPending(Request $request)
    {
        $company_id     = intval($request->input('company_id', 0));
        $from_date      = $request->input('from_date', '');
        $to_date        = $request->input('to_date', '');
        $payment_method = $request->input('payment_method', 'all');
        $payment_status = $request->input('payment_status', 'all');
        $customer_name  = trim($request->input('customer_name', ''));
        $due_status     = $request->input('due_status', 'all');

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        $query = DB::table('invoices as i')
            ->leftJoin('users as u', 'i.cashier_id', '=', 'u.id')
            ->leftJoin('customers as c', 'i.customer_id', '=', 'c.id')
            ->select(
                'i.*',
                'u.name as cashier_name',
                'c.credit_limit',
                'c.credit_days',
                DB::raw("(SELECT SUM(p.paid_amount) FROM payments p WHERE p.invoice_id = i.id AND p.payment_status = 'paid') as paid_amount_total")
            )
            ->where('i.company_id', $company_id)
            ->where('i.balance_amount', '>', 0)
            ->whereIn('i.payment_status', ['not_paid', 'partial']);

        if ($from_date && $to_date) {
            $query->whereBetween(DB::raw('DATE(i.created_at)'), [$from_date, $to_date]);
        } elseif ($from_date) {
            $query->where(DB::raw('DATE(i.created_at)'), '>=', $from_date);
        } elseif ($to_date) {
            $query->where(DB::raw('DATE(i.created_at)'), '<=', $to_date);
        }

        if ($payment_method && $payment_method !== 'all') {
            $query->where('i.payment_method', $payment_method);
        }

        if ($payment_status && $payment_status !== 'all') {
            $query->where('i.payment_status', $payment_status);
        }

        if ($customer_name) {
            $query->where('i.customer_name', 'like', "%{$customer_name}%");
        }

        $today = date('Y-m-d');
        if ($due_status === 'overdue') {
            $query->whereNotNull('i.due_date')->where('i.due_date', '<', $today);
        } elseif ($due_status === 'upcoming') {
            $query->where(function($q) use ($today) {
                $q->whereNull('i.due_date')->orWhere('i.due_date', '>=', $today);
            });
        }

        $invoices = $query->orderBy(DB::raw("CASE WHEN i.due_date IS NOT NULL AND i.due_date < '$today' THEN 0 ELSE 1 END"))
            ->orderBy('i.due_date', 'asc')
            ->orderBy('i.id', 'desc')
            ->get();

        $rows = [];
        $total_pending_sum  = 0.0;
        $total_overdue_sum  = 0.0;
        $overdue_count      = 0;

        foreach ($invoices as $row) {
            $rowArray = (array)$row;
            $rowArray['products'] = json_decode($rowArray['products'] ?? '[]');

            $isOverdue = false;
            if ($rowArray['due_date'] && $rowArray['due_date'] < $today) {
                $isOverdue = true;
            }
            $rowArray['is_overdue'] = $isOverdue;

            if ($rowArray['paid_amount_total'] === null) {
                $rowArray['paid_amount_total'] = $rowArray['paid_amount'];
            }

            $rows[] = $rowArray;
            $total_pending_sum  += floatval($rowArray['balance_amount']);
            if ($isOverdue) {
                $total_overdue_sum += floatval($rowArray['balance_amount']);
                $overdue_count++;
            }
        }

        return response()->json([
            "status"  => true,
            "data"    => $rows,
            "summary" => [
                "total_pending"  => $total_pending_sum,
                "total_overdue"  => $total_overdue_sum,
                "overdue_count"  => $overdue_count,
                "total_records"  => count($rows),
            ]
        ]);
    }

    // public function getInvoiceById(Request $request)
    // {
    //     $idVal = $request->input('id') ?: $request->query('id', '');
    //     if (is_numeric($idVal)) {
    //         $invoice = Invoice::find(intval($idVal));
    //     } else {
    //         $invoice = Invoice::where('invoice_no', $idVal)->first();
    //     }
        
    //     if (!$invoice) {
    //         $invoice = Invoice::where('id', intval($idVal))->first();
    //     }

    //     if (!$invoice) {
    //         return response()->json(["status" => false, "message" => "Invoice not found"]);
    //     }

    //     $data = $invoice->toArray();
    //     if (is_string($data['products'])) {
    //         $data['products'] = json_decode($data['products']);
    //     }

    //     return response()->json(["status" => true, "data" => $data]);
    // }

    public function getInvoiceById(Request $request)
    {
        $idVal = trim($request->input('id') ?: $request->query('id', ''));

        if (empty($idVal)) {
            return response()->json(["status" => false, "message" => "Invoice ID / Number is required"], 400);
        }

        try {
            $idTrim = trim($idVal);
            $idUpper = strtoupper($idTrim);
            $numOnly = ltrim(preg_replace('/[^0-9]/', '', $idTrim), '0');

            $invoice = null;

            // 1. Prefix-based routing (HIGH PRIORITY: prevents PAY-0003 from ever matching invoices.id = 3)
            if (str_starts_with($idUpper, 'PAY-') || str_starts_with($idUpper, 'PAYIN-') || str_starts_with($idUpper, 'REC-')) {
                $invoice = $this->findPaymentVoucher($idTrim, $numOnly) ?: $this->findPurchasePaymentVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'PAYOUT-')) {
                $invoice = $this->findPurchasePaymentVoucher($idTrim, $numOnly) ?: $this->findPaymentVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'CN-') || str_starts_with($idUpper, 'CR-') || str_starts_with($idUpper, 'RET-')) {
                $invoice = $this->findCreditNoteVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'DN-') || str_starts_with($idUpper, 'DR-')) {
                $invoice = $this->findDebitNoteVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'EXP-')) {
                $invoice = $this->findExpenseVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'PUR-') || str_starts_with($idUpper, 'BILL-') || str_starts_with($idUpper, 'PO-')) {
                $invoice = $this->findPurchaseVoucher($idTrim, $numOnly);
            } elseif (str_starts_with($idUpper, 'INV-') || str_starts_with($idUpper, 'SALE-') || str_starts_with($idUpper, 'TAX-') || str_starts_with($idUpper, 'BOS-') || str_starts_with($idUpper, 'IMPORT-')) {
                $invoice = $this->findSaleInvoiceVoucher($idTrim, $numOnly);
            }

            // 2. Exact string match across all tables (if prefix didn't match or table didn't have it)
            if (!$invoice) {
                $invoice = $this->findPaymentVoucher($idTrim, '')
                    ?: ($this->findPurchasePaymentVoucher($idTrim, '')
                    ?: ($this->findCreditNoteVoucher($idTrim, '')
                    ?: ($this->findDebitNoteVoucher($idTrim, '')
                    ?: ($this->findExpenseVoucher($idTrim, '')
                    ?: ($this->findPurchaseVoucher($idTrim, '')
                    ?: ($this->findSaleInvoiceVoucher($idTrim, '')))))));
            }

            // 3. Fallback: Pure numeric ID match ONLY if purely numeric
            if (!$invoice && ctype_digit($idTrim)) {
                $intId = intval($idTrim);
                $invoice = $this->findSaleInvoiceVoucherById($intId)
                    ?: ($this->findPaymentVoucherById($intId)
                    ?: ($this->findPurchasePaymentVoucherById($intId)
                    ?: ($this->findCreditNoteVoucherById($intId)
                    ?: ($this->findDebitNoteVoucherById($intId)
                    ?: ($this->findExpenseVoucherById($intId)
                    ?: ($this->findPurchaseVoucherById($intId)))))));
            }

            if (!$invoice) {
                return response()->json(["status" => false, "message" => "Invoice not found"], 404);
            }

            $data = (array) $invoice;
            if (is_string($data['products'] ?? null)) {
                $data['products'] = json_decode($data['products'], true);
            }

            // Merge company settings / bank details if available
            if (!empty($data['company_id'])) {
                try {
                    $companySetting = \App\Models\CompanySetting::where('company_id', $data['company_id'])->first();
                    if ($companySetting && is_array($companySetting->settings)) {
                        $s = $companySetting->settings;
                        $data['bank_name']   = $s['bank_name'] ?? $s['bankName'] ?? '';
                        $data['account_no']  = $s['account_no'] ?? $s['accountNo'] ?? '';
                        $data['ifsc_code']   = $s['ifsc_code'] ?? $s['ifscCode'] ?? '';
                        $data['upi_id']      = $s['upi_id'] ?? $s['upiId'] ?? '';
                        $data['branch_name'] = $s['branch_name'] ?? $s['branchName'] ?? '';
                    }
                } catch (\Exception $ex) {
                    // Ignore settings merge errors
                }
            }

            return response()->json(["status" => true, "data" => $data]);
        } catch (\Exception $e) {
            return response()->json(["status" => false, "message" => "Failed to load invoice: " . $e->getMessage()], 500);
        }
    }

    private function findSaleInvoiceVoucher($idVal, $numOnly = '')
    {
        $selectCols = ['i.*', 'u.name as cashier_name'];
        if (Schema::hasTable('companies')) {
            if (Schema::hasColumn('companies', 'company_name')) $selectCols[] = 'c.company_name';
            if (Schema::hasColumn('companies', 'company_address')) $selectCols[] = 'c.company_address';
            if (Schema::hasColumn('companies', 'phone')) $selectCols[] = 'c.phone';
            if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin';
            if (Schema::hasColumn('companies', 'logo')) $selectCols[] = 'c.logo';
            if (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';
        }

        $query = DB::table('invoices as i')
            ->leftJoin('companies as c', 'i.company_id', '=', 'c.id')
            ->leftJoin('users as u', 'i.cashier_id', '=', 'u.id')
            ->select($selectCols);

        $invoice = (clone $query)->where('i.invoice_no', $idVal)->first();
        if (!$invoice && !empty($numOnly)) {
            $invoice = (clone $query)->where('i.invoice_no', $numOnly)->orWhere('i.invoice_no', 'like', "%{$numOnly}")->first();
        }

        if ($invoice) {
            $invData = (array) $invoice;
            $invData['voucher_type'] = 'sale';
            if (empty($invData['invoice_type'])) {
                $invData['invoice_type'] = ($invData['gst_type'] ?? '') === 'without_gst' ? 'Bill of Supply' : 'Tax Invoice';
            }
            return (object) $invData;
        }
        return null;
    }

    private function findSaleInvoiceVoucherById($intId)
    {
        $selectCols = ['i.*', 'u.name as cashier_name'];
        if (Schema::hasTable('companies')) {
            if (Schema::hasColumn('companies', 'company_name')) $selectCols[] = 'c.company_name';
            if (Schema::hasColumn('companies', 'company_address')) $selectCols[] = 'c.company_address';
            if (Schema::hasColumn('companies', 'phone')) $selectCols[] = 'c.phone';
            if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin';
            if (Schema::hasColumn('companies', 'logo')) $selectCols[] = 'c.logo';
            if (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';
        }

        $invoice = DB::table('invoices as i')
            ->leftJoin('companies as c', 'i.company_id', '=', 'c.id')
            ->leftJoin('users as u', 'i.cashier_id', '=', 'u.id')
            ->select($selectCols)
            ->where('i.id', $intId)
            ->first();

        if ($invoice) {
            $invData = (array) $invoice;
            $invData['voucher_type'] = 'sale';
            if (empty($invData['invoice_type'])) {
                $invData['invoice_type'] = ($invData['gst_type'] ?? '') === 'without_gst' ? 'Bill of Supply' : 'Tax Invoice';
            }
            return (object) $invData;
        }
        return null;
    }

    private function findPaymentVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('payments')) return null;

        $selectCols = [
            'p.*',
            'cust.name as customer_name',
            'cust.phone as customer_phone',
            'cust.address as customer_address',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('customers', 'gst_no')) $selectCols[] = 'cust.gst_no as customer_gstin';
        elseif (Schema::hasColumn('customers', 'gstin')) $selectCols[] = 'cust.gstin as customer_gstin';

        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $payQuery = DB::table('payments as p')
            ->leftJoin('companies as c', 'p.company_id', '=', 'c.id')
            ->leftJoin('customers as cust', 'p.customer_id', '=', 'cust.id')
            ->select($selectCols);

        $paymentRec = (clone $payQuery)
            ->where('p.receipt_no', $idVal)
            ->orWhere('p.invoice_no', $idVal)
            ->first();

        if (!$paymentRec && !empty($numOnly)) {
            $paymentRec = (clone $payQuery)
                ->where('p.receipt_no', $numOnly)
                ->orWhere('p.invoice_no', $numOnly)
                ->orWhere('p.receipt_no', 'like', "%{$numOnly}")
                ->orWhere('p.invoice_no', 'like', "%{$numOnly}")
                ->first();
        }

        if ($paymentRec) {
            $pData = (array) $paymentRec;
            $isOut = ($pData['payment_type'] ?? '') === 'payment_out';
            $rNo = !empty($pData['receipt_no']) ? $pData['receipt_no'] : (!empty($pData['invoice_no']) ? $pData['invoice_no'] : ('REC-' . $pData['id']));
            $payAmt = floatval($pData['paid_amount'] ?? $pData['total_amount'] ?? 0);
            $discAmt = floatval($pData['discount_amount'] ?? 0);
            $itemDesc = ($isOut ? 'Payment Made' : 'Payment Received') . (!empty($pData['notes']) ? ' (' . $pData['notes'] . ')' : '');

            return (object) [
                'id'               => $pData['id'],
                'voucher_type'     => $isOut ? 'payment_out' : 'payment_in',
                'invoice_no'       => $rNo,
                'receipt_no'       => $rNo,
                'invoice_type'     => $isOut ? 'Payment Out' : 'Payment Receipt',
                'company_id'       => $pData['company_id'] ?? 0,
                'company_name'     => $pData['company_name'] ?? '',
                'company_address'  => $pData['company_address'] ?? '',
                'phone'            => $pData['company_phone'] ?? '',
                'gstin'            => $pData['company_gstin'] ?? '',
                'logo'             => $pData['logo'] ?? '',
                'email'            => $pData['email'] ?? '',
                'customer_id'      => $pData['customer_id'] ?? null,
                'customer_name'    => $pData['customer_name'] ?? 'Party',
                'customer_phone'   => $pData['customer_phone'] ?? '',
                'customer_address' => $pData['customer_address'] ?? '',
                'billing_address'  => $pData['customer_address'] ?? '',
                'customer_gstin'   => $pData['customer_gstin'] ?? '',
                'payment_type'     => strtoupper($pData['payment_method'] ?? 'CASH'),
                'payment_method'   => strtoupper($pData['payment_method'] ?? 'CASH'),
                'payment_status'   => $pData['payment_status'] ?? 'paid',
                'total_amount'     => floatval($pData['total_amount'] ?? $payAmt),
                'paid_amount'      => $payAmt,
                'balance_amount'   => floatval($pData['balance_amount'] ?? 0),
                'discount_amount'  => $discAmt,
                'tax_amount'       => 0,
                'subtotal'         => $payAmt,
                'notes'            => $pData['notes'] ?? '',
                'created_at'       => $pData['payment_date'] ?? $pData['created_at'] ?? now(),
                'invoice_date'     => $pData['payment_date'] ?? substr($pData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => [
                    [
                        'item_name'   => $itemDesc,
                        'name'        => $itemDesc,
                        'quantity'    => 1,
                        'qty'         => 1,
                        'price'       => $payAmt,
                        'unit_price'  => $payAmt,
                        'total'       => $payAmt,
                        'amount'      => $payAmt,
                        'tax_rate'    => 0,
                        'tax_amt'     => 0,
                        'discount'    => $discAmt
                    ]
                ]
            ];
        }
        return null;
    }

    private function findPaymentVoucherById($intId)
    {
        if (!Schema::hasTable('payments')) return null;
        return $this->findPaymentVoucher(strval($intId), '');
    }

    private function findPurchasePaymentVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('purchase_payments')) return null;

        $selectCols = [
            'pp.*',
            's.supplier_name',
            's.address as supplier_address',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('suppliers', 'mobile_number')) $selectCols[] = 's.mobile_number as supplier_phone';
        elseif (Schema::hasColumn('suppliers', 'phone')) $selectCols[] = 's.phone as supplier_phone';

        if (Schema::hasColumn('suppliers', 'gst_number')) $selectCols[] = 's.gst_number as supplier_gstin';
        elseif (Schema::hasColumn('suppliers', 'gstin')) $selectCols[] = 's.gstin as supplier_gstin';

        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $ppQuery = DB::table('purchase_payments as pp')
            ->leftJoin('companies as c', 'pp.company_id', '=', 'c.id')
            ->leftJoin('suppliers as s', 'pp.supplier_id', '=', 's.id')
            ->select($selectCols);

        $ppRec = (clone $ppQuery)->where('pp.receipt_no', $idVal)->first();
        if (!$ppRec && !empty($numOnly)) {
            $ppRec = (clone $ppQuery)->where('pp.receipt_no', $numOnly)->orWhere('pp.receipt_no', 'like', "%{$numOnly}")->first();
        }

        if ($ppRec) {
            $ppData = (array) $ppRec;
            $rNo = !empty($ppData['receipt_no']) ? $ppData['receipt_no'] : ('PAYOUT-' . $ppData['id']);
            $payAmt = floatval($ppData['amount'] ?? 0);
            $itemDesc = 'Payment to Supplier' . (!empty($ppData['notes']) ? ' (' . $ppData['notes'] . ')' : '');

            return (object) [
                'id'               => $ppData['id'],
                'voucher_type'     => 'payment_out',
                'invoice_no'       => $rNo,
                'receipt_no'       => $rNo,
                'invoice_type'     => 'Payment Out',
                'company_id'       => $ppData['company_id'] ?? 0,
                'company_name'     => $ppData['company_name'] ?? '',
                'company_address'  => $ppData['company_address'] ?? '',
                'phone'            => $ppData['company_phone'] ?? '',
                'gstin'            => $ppData['company_gstin'] ?? '',
                'logo'             => $ppData['logo'] ?? '',
                'email'            => $ppData['email'] ?? '',
                'customer_id'      => $ppData['supplier_id'] ?? null,
                'customer_name'    => $ppData['supplier_name'] ?? 'Supplier',
                'customer_phone'   => $ppData['supplier_phone'] ?? '',
                'customer_address' => $ppData['supplier_address'] ?? '',
                'billing_address'  => $ppData['supplier_address'] ?? '',
                'customer_gstin'   => $ppData['supplier_gstin'] ?? '',
                'payment_type'     => strtoupper($ppData['payment_method'] ?? 'CASH'),
                'payment_method'   => strtoupper($ppData['payment_method'] ?? 'CASH'),
                'payment_status'   => 'paid',
                'total_amount'     => $payAmt,
                'paid_amount'      => $payAmt,
                'balance_amount'   => 0,
                'discount_amount'  => 0,
                'tax_amount'       => 0,
                'subtotal'         => $payAmt,
                'notes'            => $ppData['notes'] ?? '',
                'created_at'       => $ppData['payment_date'] ?? $ppData['created_at'] ?? now(),
                'invoice_date'     => $ppData['payment_date'] ?? substr($ppData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => [
                    [
                        'item_name'   => $itemDesc,
                        'name'        => $itemDesc,
                        'quantity'    => 1,
                        'qty'         => 1,
                        'price'       => $payAmt,
                        'unit_price'  => $payAmt,
                        'total'       => $payAmt,
                        'amount'      => $payAmt,
                        'tax_rate'    => 0,
                        'tax_amt'     => 0,
                        'discount'    => 0
                    ]
                ]
            ];
        }
        return null;
    }

    private function findPurchasePaymentVoucherById($intId)
    {
        if (!Schema::hasTable('purchase_payments')) return null;
        return $this->findPurchasePaymentVoucher(strval($intId), '');
    }

    private function findCreditNoteVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('credit_notes')) return null;

        $selectCols = [
            'cn.*',
            'cust.address as customer_address',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('customers', 'gst_no')) $selectCols[] = 'cust.gst_no as customer_gstin';
        elseif (Schema::hasColumn('customers', 'gstin')) $selectCols[] = 'cust.gstin as customer_gstin';

        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $cnQuery = DB::table('credit_notes as cn')
            ->leftJoin('companies as c', 'cn.company_id', '=', 'c.id')
            ->leftJoin('customers as cust', 'cn.customer_id', '=', 'cust.id')
            ->select($selectCols);

        $cnRec = (clone $cnQuery)->where('cn.return_no', $idVal)->first();
        if (!$cnRec && !empty($numOnly)) {
            $cnRec = (clone $cnQuery)->where('cn.return_no', $numOnly)->orWhere('cn.return_no', 'like', "%{$numOnly}")->first();
        }

        if ($cnRec) {
            $cnData = (array) $cnRec;
            $rNo = !empty($cnData['return_no']) ? $cnData['return_no'] : ('CN-' . $cnData['id']);
            $rawItems = is_string($cnData['products']) ? json_decode($cnData['products'], true) : ($cnData['products'] ?? []);

            $items = [];
            foreach ((array)$rawItems as $it) {
                if (is_object($it)) $it = (array) $it;
                if (!is_array($it)) continue;
                $iName = $it['item_name'] ?? $it['product_name'] ?? $it['name'] ?? $it['item'] ?? $it['product'] ?? 'Item';
                $iQty = floatval($it['qty'] ?? $it['quantity'] ?? 1);
                $iPrice = floatval($it['price'] ?? $it['unit_price'] ?? $it['rate'] ?? 0);
                $iAmount = floatval($it['amount'] ?? $it['total'] ?? ($iQty * $iPrice));
                $iHsn = $it['hsn_code'] ?? $it['hsn_sac'] ?? $it['hsn'] ?? $it['product_code'] ?? '';
                $iTaxRate = floatval($it['tax_rate'] ?? $it['gst_rate'] ?? $it['tax_pct'] ?? $it['gst_percentage'] ?? 0);
                $iTaxAmt = floatval($it['tax_amt'] ?? $it['tax_amount'] ?? $it['gst_amount'] ?? 0);
                $iDiscount = floatval($it['discount'] ?? $it['discount_amt'] ?? $it['discount_amount'] ?? 0);

                $items[] = [
                    'item_name'    => $iName,
                    'product_name' => $iName,
                    'name'         => $iName,
                    'item'         => $iName,
                    'qty'          => $iQty,
                    'quantity'     => $iQty,
                    'unit'         => $it['unit'] ?? '',
                    'price'        => $iPrice,
                    'unit_price'   => $iPrice,
                    'rate'         => $iPrice,
                    'hsn_code'     => $iHsn,
                    'hsn_sac'      => $iHsn,
                    'hsn'          => $iHsn,
                    'product_code' => $iHsn,
                    'tax_rate'     => $iTaxRate,
                    'tax_amt'      => $iTaxAmt,
                    'tax_amount'   => $iTaxAmt,
                    'discount'     => $iDiscount,
                    'amount'       => $iAmount,
                    'total'        => $iAmount,
                ];
            }

            return (object) [
                'id'               => $cnData['id'],
                'voucher_type'     => 'credit_note',
                'invoice_no'       => $rNo,
                'return_no'        => $rNo,
                'original_invoice_no' => $cnData['invoice_no'] ?? '',
                'invoice_type'     => 'Credit Note',
                'company_id'       => $cnData['company_id'] ?? 0,
                'company_name'     => $cnData['company_name'] ?? '',
                'company_address'  => $cnData['company_address'] ?? '',
                'phone'            => $cnData['company_phone'] ?? '',
                'gstin'            => $cnData['company_gstin'] ?? '',
                'logo'             => $cnData['logo'] ?? '',
                'email'            => $cnData['email'] ?? '',
                'customer_id'      => $cnData['customer_id'] ?? null,
                'customer_name'    => $cnData['customer_name'] ?? 'Customer',
                'customer_phone'   => $cnData['customer_phone'] ?? '',
                'customer_address' => $cnData['customer_address'] ?? '',
                'billing_address'  => $cnData['customer_address'] ?? '',
                'customer_gstin'   => $cnData['customer_gstin'] ?? '',
                'payment_type'     => strtoupper($cnData['payment_type'] ?? 'CASH'),
                'payment_method'   => strtoupper($cnData['payment_type'] ?? 'CASH'),
                'payment_status'   => floatval($cnData['balance_amount'] ?? 0) <= 0 ? 'paid' : 'partial',
                'sub_total'        => floatval($cnData['sub_total'] ?? 0),
                'gst_total'        => floatval($cnData['tax_total'] ?? 0),
                'tax_amount'       => floatval($cnData['tax_total'] ?? 0),
                'discount_total'   => floatval($cnData['discount_total'] ?? 0),
                'discount_amount'  => floatval($cnData['discount_total'] ?? 0),
                'round_off'        => floatval($cnData['round_off'] ?? 0),
                'total_amount'     => floatval($cnData['total_amount'] ?? 0),
                'paid_amount'      => floatval($cnData['refund_amount'] ?? 0),
                'balance_amount'   => floatval($cnData['balance_amount'] ?? 0),
                'notes'            => $cnData['description'] ?? '',
                'created_at'       => $cnData['return_date'] ?? $cnData['created_at'] ?? now(),
                'invoice_date'     => $cnData['return_date'] ?? substr($cnData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => $items ?: []
            ];
        }
        return null;
    }

    private function findCreditNoteVoucherById($intId)
    {
        if (!Schema::hasTable('credit_notes')) return null;
        return $this->findCreditNoteVoucher(strval($intId), '');
    }

    private function findDebitNoteVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('debit_notes')) return null;

        $selectCols = [
            'dn.*',
            's.address as supplier_address',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('suppliers', 'mobile_number')) $selectCols[] = 's.mobile_number as supplier_phone';
        elseif (Schema::hasColumn('suppliers', 'phone')) $selectCols[] = 's.phone as supplier_phone';

        if (Schema::hasColumn('suppliers', 'gst_number')) $selectCols[] = 's.gst_number as supplier_gstin';
        elseif (Schema::hasColumn('suppliers', 'gstin')) $selectCols[] = 's.gstin as supplier_gstin';

        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $dnQuery = DB::table('debit_notes as dn')
            ->leftJoin('companies as c', 'dn.company_id', '=', 'c.id')
            ->leftJoin('suppliers as s', 'dn.supplier_id', '=', 's.id')
            ->select($selectCols);

        $dnRec = (clone $dnQuery)->where('dn.return_no', $idVal)->first();
        if (!$dnRec && !empty($numOnly)) {
            $dnRec = (clone $dnQuery)->where('dn.return_no', $numOnly)->orWhere('dn.return_no', 'like', "%{$numOnly}")->first();
        }

        if ($dnRec) {
            $dnData = (array) $dnRec;
            $rNo = !empty($dnData['return_no']) ? $dnData['return_no'] : ('DN-' . $dnData['id']);
            $rawItems = is_string($dnData['products']) ? json_decode($dnData['products'], true) : ($dnData['products'] ?? []);

            $items = [];
            foreach ((array)$rawItems as $it) {
                if (is_object($it)) $it = (array) $it;
                if (!is_array($it)) continue;
                $iName = $it['item_name'] ?? $it['product_name'] ?? $it['name'] ?? $it['item'] ?? $it['product'] ?? 'Item';
                $iQty = floatval($it['qty'] ?? $it['quantity'] ?? 1);
                $iPrice = floatval($it['price'] ?? $it['unit_price'] ?? $it['rate'] ?? 0);
                $iAmount = floatval($it['amount'] ?? $it['total'] ?? ($iQty * $iPrice));
                $iHsn = $it['hsn_code'] ?? $it['hsn_sac'] ?? $it['hsn'] ?? $it['product_code'] ?? '';
                $iTaxRate = floatval($it['tax_rate'] ?? $it['gst_rate'] ?? $it['tax_pct'] ?? $it['gst_percentage'] ?? 0);
                $iTaxAmt = floatval($it['tax_amt'] ?? $it['tax_amount'] ?? $it['gst_amount'] ?? 0);
                $iDiscount = floatval($it['discount'] ?? $it['discount_amt'] ?? $it['discount_amount'] ?? 0);

                $items[] = [
                    'item_name'    => $iName,
                    'product_name' => $iName,
                    'name'         => $iName,
                    'item'         => $iName,
                    'qty'          => $iQty,
                    'quantity'     => $iQty,
                    'unit'         => $it['unit'] ?? '',
                    'price'        => $iPrice,
                    'unit_price'   => $iPrice,
                    'rate'         => $iPrice,
                    'hsn_code'     => $iHsn,
                    'hsn_sac'      => $iHsn,
                    'hsn'          => $iHsn,
                    'product_code' => $iHsn,
                    'tax_rate'     => $iTaxRate,
                    'tax_amt'      => $iTaxAmt,
                    'tax_amount'   => $iTaxAmt,
                    'discount'     => $iDiscount,
                    'amount'       => $iAmount,
                    'total'        => $iAmount,
                ];
            }

            return (object) [
                'id'               => $dnData['id'],
                'voucher_type'     => 'debit_note',
                'invoice_no'       => $rNo,
                'return_no'        => $rNo,
                'original_invoice_no' => $dnData['bill_no'] ?? '',
                'invoice_type'     => 'Debit Note',
                'company_id'       => $dnData['company_id'] ?? 0,
                'company_name'     => $dnData['company_name'] ?? '',
                'company_address'  => $dnData['company_address'] ?? '',
                'phone'            => $dnData['company_phone'] ?? '',
                'gstin'            => $dnData['company_gstin'] ?? '',
                'logo'             => $dnData['logo'] ?? '',
                'email'            => $dnData['email'] ?? '',
                'customer_id'      => $dnData['supplier_id'] ?? null,
                'customer_name'    => $dnData['supplier_name'] ?? 'Supplier',
                'customer_phone'   => $dnData['supplier_phone'] ?? '',
                'customer_address' => $dnData['supplier_address'] ?? '',
                'billing_address'  => $dnData['supplier_address'] ?? '',
                'customer_gstin'   => $dnData['supplier_gstin'] ?? '',
                'payment_type'     => strtoupper($dnData['payment_type'] ?? 'CASH'),
                'payment_method'   => strtoupper($dnData['payment_type'] ?? 'CASH'),
                'payment_status'   => floatval($dnData['balance_amount'] ?? 0) <= 0 ? 'paid' : 'partial',
                'sub_total'        => floatval($dnData['sub_total'] ?? 0),
                'gst_total'        => floatval($dnData['tax_total'] ?? 0),
                'tax_amount'       => floatval($dnData['tax_total'] ?? 0),
                'discount_total'   => floatval($dnData['discount_total'] ?? 0),
                'discount_amount'  => floatval($dnData['discount_total'] ?? 0),
                'round_off'        => floatval($dnData['round_off'] ?? 0),
                'total_amount'     => floatval($dnData['total_amount'] ?? 0),
                'paid_amount'      => floatval($dnData['refund_amount'] ?? 0),
                'balance_amount'   => floatval($dnData['balance_amount'] ?? 0),
                'notes'            => $dnData['description'] ?? '',
                'created_at'       => $dnData['return_date'] ?? $dnData['created_at'] ?? now(),
                'invoice_date'     => $dnData['return_date'] ?? substr($dnData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => $items ?: []
            ];
        }
        return null;
    }

    private function findDebitNoteVoucherById($intId)
    {
        if (!Schema::hasTable('debit_notes')) return null;
        return $this->findDebitNoteVoucher(strval($intId), '');
    }

    private function findExpenseVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('expenses')) return null;

        $selectCols = [
            'e.*',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $expQuery = DB::table('expenses as e')
            ->leftJoin('companies as c', 'e.company_id', '=', 'c.id')
            ->select($selectCols);

        $expRec = (clone $expQuery)->where('e.expense_no', $idVal)->first();
        if (!$expRec && !empty($numOnly)) {
            $expRec = (clone $expQuery)->where('e.expense_no', $numOnly)->orWhere('e.expense_no', 'like', "%{$numOnly}")->first();
        }

        if ($expRec) {
            $eData = (array) $expRec;
            $rNo = !empty($eData['expense_no']) ? $eData['expense_no'] : ('EXP-' . $eData['id']);
            $rawItems = is_string($eData['items']) ? json_decode($eData['items'], true) : ($eData['items'] ?? []);

            $items = [];
            foreach ((array)$rawItems as $it) {
                if (is_object($it)) $it = (array) $it;
                if (!is_array($it)) continue;
                $iName = $it['item_name'] ?? $it['product_name'] ?? $it['name'] ?? $it['item'] ?? $it['product'] ?? 'Expense Item';
                $iQty = floatval($it['qty'] ?? $it['quantity'] ?? 1);
                $iPrice = floatval($it['price'] ?? $it['unit_price'] ?? $it['rate'] ?? 0);
                $iAmount = floatval($it['amount'] ?? $it['total'] ?? ($iQty * $iPrice));
                $iHsn = $it['hsn_code'] ?? $it['hsn_sac'] ?? $it['hsn'] ?? $it['product_code'] ?? '';
                $iTaxRate = floatval($it['tax_rate'] ?? $it['gst_rate'] ?? $it['tax_pct'] ?? $it['gst_percentage'] ?? 0);
                $iTaxAmt = floatval($it['tax_amt'] ?? $it['tax_amount'] ?? $it['gst_amount'] ?? 0);
                $iDiscount = floatval($it['discount'] ?? $it['discount_amt'] ?? $it['discount_amount'] ?? 0);

                $items[] = [
                    'item_name'    => $iName,
                    'product_name' => $iName,
                    'name'         => $iName,
                    'item'         => $iName,
                    'qty'          => $iQty,
                    'quantity'     => $iQty,
                    'unit'         => $it['unit'] ?? '',
                    'price'        => $iPrice,
                    'unit_price'   => $iPrice,
                    'rate'         => $iPrice,
                    'hsn_code'     => $iHsn,
                    'hsn_sac'      => $iHsn,
                    'hsn'          => $iHsn,
                    'product_code' => $iHsn,
                    'tax_rate'     => $iTaxRate,
                    'tax_amt'      => $iTaxAmt,
                    'tax_amount'   => $iTaxAmt,
                    'discount'     => $iDiscount,
                    'amount'       => $iAmount,
                    'total'        => $iAmount,
                ];
            }

            return (object) [
                'id'               => $eData['id'],
                'voucher_type'     => 'expense',
                'invoice_no'       => $rNo,
                'expense_no'       => $rNo,
                'invoice_type'     => 'Expense',
                'company_id'       => $eData['company_id'] ?? 0,
                'company_name'     => $eData['company_name'] ?? '',
                'company_address'  => $eData['company_address'] ?? '',
                'phone'            => $eData['company_phone'] ?? '',
                'gstin'            => $eData['company_gstin'] ?? '',
                'logo'             => $eData['logo'] ?? '',
                'email'            => $eData['email'] ?? '',
                'customer_id'      => $eData['category_id'] ?? null,
                'customer_name'    => $eData['category_name'] ?: ($eData['party_name'] ?: 'Expense'),
                'category_name'    => $eData['category_name'] ?? '',
                'party_name'       => $eData['party_name'] ?? '',
                'customer_phone'   => $eData['party_phone'] ?? '',
                'customer_address' => '',
                'billing_address'  => '',
                'customer_gstin'   => '',
                'payment_type'     => strtoupper($eData['payment_type'] ?? 'CASH'),
                'payment_method'   => strtoupper($eData['payment_type'] ?? 'CASH'),
                'payment_status'   => floatval($eData['balance_amount'] ?? 0) <= 0 ? 'paid' : 'partial',
                'sub_total'        => floatval($eData['sub_total'] ?? 0),
                'gst_total'        => floatval($eData['tax_total'] ?? 0),
                'tax_amount'       => floatval($eData['tax_total'] ?? 0),
                'discount_total'   => floatval($eData['discount_total'] ?? 0),
                'discount_amount'  => floatval($eData['discount_total'] ?? 0),
                'round_off'        => floatval($eData['round_off'] ?? 0),
                'total_amount'     => floatval($eData['total_amount'] ?? 0),
                'paid_amount'      => floatval($eData['paid_amount'] ?? 0),
                'balance_amount'   => floatval($eData['balance_amount'] ?? 0),
                'notes'            => $eData['description'] ?? '',
                'created_at'       => $eData['expense_date'] ?? $eData['created_at'] ?? now(),
                'invoice_date'     => $eData['expense_date'] ?? substr($eData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => $items ?: []
            ];
        }
        return null;
    }

    private function findExpenseVoucherById($intId)
    {
        if (!Schema::hasTable('expenses')) return null;
        return $this->findExpenseVoucher(strval($intId), '');
    }

    private function findPurchaseVoucher($idVal, $numOnly = '')
    {
        if (!Schema::hasTable('purchases')) return null;

        $hasPurchaseNo = Schema::hasColumn('purchases', 'purchase_no');
        $hasBillNo = Schema::hasColumn('purchases', 'bill_no');

        $selectCols = [
            'p.*',
            's.supplier_name',
            's.address as supplier_address',
            'c.company_name',
            'c.company_address',
            'c.phone as company_phone',
            'c.logo'
        ];
        if (Schema::hasColumn('suppliers', 'mobile_number')) $selectCols[] = 's.mobile_number as supplier_phone';
        elseif (Schema::hasColumn('suppliers', 'phone')) $selectCols[] = 's.phone as supplier_phone';

        if (Schema::hasColumn('suppliers', 'gst_number')) $selectCols[] = 's.gst_number as supplier_gstin';
        elseif (Schema::hasColumn('suppliers', 'gstin')) $selectCols[] = 's.gstin as supplier_gstin';

        if (Schema::hasColumn('companies', 'gstin')) $selectCols[] = 'c.gstin as company_gstin';
        if (Schema::hasColumn('companies', 'owner_email')) $selectCols[] = 'c.owner_email as email';
        elseif (Schema::hasColumn('companies', 'email')) $selectCols[] = 'c.email';

        $purQuery = DB::table('purchases as p')
            ->leftJoin('companies as c', 'p.company_id', '=', 'c.id')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id')
            ->select($selectCols);

        $purRec = (clone $purQuery)->where(function ($q) use ($idVal, $hasPurchaseNo, $hasBillNo) {
            if ($hasPurchaseNo) $q->orWhere('p.purchase_no', $idVal);
            if ($hasBillNo) $q->orWhere('p.bill_no', $idVal);
        })->first();

        if (!$purRec && !empty($numOnly)) {
            $purRec = (clone $purQuery)->where(function ($q) use ($numOnly, $hasPurchaseNo, $hasBillNo) {
                if ($hasPurchaseNo) {
                    $q->orWhere('p.purchase_no', $numOnly)->orWhere('p.purchase_no', 'like', "%{$numOnly}");
                }
                if ($hasBillNo) {
                    $q->orWhere('p.bill_no', $numOnly)->orWhere('p.bill_no', 'like', "%{$numOnly}");
                }
            })->first();
        }

        if ($purRec) {
            $pData = (array) $purRec;
            $rNo = !empty($pData['purchase_no']) ? $pData['purchase_no'] : (!empty($pData['bill_no']) ? $pData['bill_no'] : ('PUR-' . $pData['id']));

            $pItems = DB::table('purchase_items')->where('purchase_id', $pData['id'])->get()->map(function ($it) {
                return [
                    'item_name'    => $it->product_name ?? 'Item',
                    'name'         => $it->product_name ?? 'Item',
                    'product_name' => $it->product_name ?? 'Item',
                    'product_code' => $it->product_code ?? '',
                    'hsn_code'     => $it->hsn_code ?? $it->product_code ?? '',
                    'qty'          => floatval($it->quantity ?? $it->qty ?? 1),
                    'quantity'     => floatval($it->quantity ?? $it->qty ?? 1),
                    'price'        => floatval($it->price ?? 0),
                    'unit_price'   => floatval($it->price ?? 0),
                    'amount'       => floatval($it->total_amount ?? ($it->quantity ?? $it->qty ?? 1) * ($it->price ?? 0)),
                    'total'        => floatval($it->total_amount ?? ($it->quantity ?? $it->qty ?? 1) * ($it->price ?? 0)),
                    'tax_rate'     => floatval($it->gst_percentage ?? $it->tax_rate ?? 0),
                    'tax_amt'      => floatval($it->tax_amount ?? 0),
                    'discount'     => floatval($it->discount_amount ?? 0)
                ];
            })->toArray();

            return (object) [
                'id'               => $pData['id'],
                'voucher_type'     => 'purchase',
                'invoice_no'       => $rNo,
                'bill_no'          => $rNo,
                'purchase_no'      => $rNo,
                'invoice_type'     => 'Purchase Invoice',
                'company_id'       => $pData['company_id'] ?? 0,
                'company_name'     => $pData['company_name'] ?? '',
                'company_address'  => $pData['company_address'] ?? '',
                'phone'            => $pData['company_phone'] ?? '',
                'gstin'            => $pData['company_gstin'] ?? '',
                'logo'             => $pData['logo'] ?? '',
                'email'            => $pData['email'] ?? '',
                'customer_id'      => $pData['supplier_id'] ?? null,
                'customer_name'    => $pData['supplier_name'] ?? 'Supplier',
                'supplier_name'    => $pData['supplier_name'] ?? 'Supplier',
                'customer_phone'   => $pData['supplier_phone'] ?? '',
                'customer_address' => $pData['supplier_address'] ?? '',
                'billing_address'  => $pData['supplier_address'] ?? '',
                'customer_gstin'   => $pData['supplier_gstin'] ?? '',
                'payment_type'     => strtoupper($pData['payment_type'] ?? 'CASH'),
                'payment_method'   => strtoupper($pData['payment_type'] ?? 'CASH'),
                'payment_status'   => floatval($pData['balance_amount'] ?? 0) <= 0 ? 'paid' : 'partial',
                'sub_total'        => floatval($pData['sub_total'] ?? 0),
                'gst_total'        => floatval($pData['gst_total'] ?? 0),
                'tax_amount'       => floatval($pData['gst_total'] ?? 0),
                'discount_total'   => floatval($pData['discount_total'] ?? 0),
                'discount_amount'  => floatval($pData['discount_total'] ?? 0),
                'round_off'        => floatval($pData['round_off'] ?? 0),
                'total_amount'     => floatval($pData['total_amount'] ?? 0),
                'paid_amount'      => floatval($pData['paid_amount'] ?? 0),
                'balance_amount'   => floatval($pData['balance_amount'] ?? 0),
                'notes'            => $pData['description'] ?? '',
                'created_at'       => $pData['purchase_date'] ?? $pData['created_at'] ?? now(),
                'invoice_date'     => $pData['purchase_date'] ?? substr($pData['created_at'] ?? date('Y-m-d'), 0, 10),
                'products'         => $pItems
            ];
        }
        return null;
    }

    private function findPurchaseVoucherById($intId)
    {
        if (!Schema::hasTable('purchases')) return null;
        return $this->findPurchaseVoucher(strval($intId), '');
    }

    public function getPendingInvoice(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "company_id required"]);
        }

        $invoices = DB::table('invoices as i')
            ->leftJoin('customers as c', 'c.id', '=', 'i.customer_id')
            ->select('i.*', DB::raw("IFNULL(c.credit_limit,0) as credit_limit"), DB::raw("(i.total_amount - i.balance_amount) as paid_amount_total"))
            ->where('i.company_id', $company_id)
            ->where('i.balance_amount', '>', 0)
            ->orderBy('i.id', 'desc')
            ->get();

        $rows = [];
        foreach ($invoices as $row) {
            $rowArray = (array)$row;
            $rowArray['products'] = json_decode($rowArray['products']);
            $rows[] = $rowArray;
        }

        return response()->json(["status" => true, "data" => $rows]);
    }

    public function getPendingInvoiceHistory(Request $request)
    {
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$admin_id) {
            return response()->json(["status" => false, "message" => "admin_id required"]);
        }

        $invoices = DB::table('invoices as i')
            ->join('customers as c', 'c.id', '=', 'i.customer_id')
            ->select('i.*', DB::raw("IFNULL(c.credit_limit, 0) as credit_limit"), DB::raw("(i.total_amount - i.balance_amount) as paid_amount_total"))
            ->where('c.admin_id', $admin_id)
            ->where('c.is_deleted', 0)
            ->orderBy('i.id', 'desc')
            ->get();

        $rows = [];
        foreach ($invoices as $row) {
            $rowArray = (array)$row;
            $rowArray['products'] = json_decode($rowArray['products'] ?? '[]');

            $balance = floatval($rowArray['balance_amount']);
            $paid = floatval($rowArray['paid_amount_total']);

            if ($balance <= 0) {
                $rowArray['payment_history_status'] = "paid";
            } elseif ($paid > 0) {
                $rowArray['payment_history_status'] = "partial";
            } else {
                $rowArray['payment_history_status'] = "pending";
            }

            $rows[] = $rowArray;
        }

        return response()->json(["status" => true, "data" => $rows]);
    }

    public function markAsPaid(Request $request)
    {
        $invoice_no = $request->input('invoice_no', '');
        $pay_amount = floatval($request->input('pay_amount', 0));

        if (!$invoice_no || $pay_amount <= 0) {
            return response()->json(["status" => false, "message" => "Invalid data"]);
        }

        $invoice = Invoice::where('invoice_no', $invoice_no)->first();
        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Invoice not found"]);
        }

        $current_paid = floatval($invoice->paid_amount);
        $total_amount = floatval($invoice->total_amount);

        $new_paid = $current_paid + $pay_amount;
        $return_amount = 0;

        if ($new_paid > $total_amount) {
            $return_amount = $new_paid - $total_amount;
            $new_paid = $total_amount;
        }

        $new_balance = $total_amount - $new_paid;
        $payment_status = $new_balance <= 0 ? "paid" : "partial";

        DB::beginTransaction();
        try {
            $invoice->update([
                'paid_amount' => $new_paid,
                'balance_amount' => $new_balance,
                'payment_status' => $payment_status
            ]);

            Payment::where('invoice_no', $invoice_no)->update([
                'paid_amount' => $new_paid,
                'balance_amount' => $new_balance,
                'payment_status' => $payment_status
            ]);

            DB::commit();

            $message = "Payment Updated Successfully";
            if ($return_amount > 0) {
                $message .= " | Return Amount: ₹" . number_format($return_amount);
            }

            return response()->json([
                "status" => true,
                "message" => $message,
                "return_amount" => $return_amount,
                "paid_amount" => $new_paid,
                "balance_amount" => $new_balance
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(["status" => false, "message" => $e->getMessage()]);
        }
    }

    public function payment(Request $request)
    {
        $company_id     = intval($request->input('company_id', 0));
        $invoice_id     = intval($request->input('invoice_id', 0));
        $invoice_no     = $request->input('invoice_no', '');
        $customer_id    = intval($request->input('customer_id', 0));
        $total_amount   = floatval($request->input('total_amount', 0));
        $paid_amount    = floatval($request->input('paid_amount', 0));
        $balance_amount = floatval($request->input('balance_amount', 0));
        $payment_method = $request->input('payment_method', 'cash');
        $payment_status = $request->input('payment_status', 'paid');

        if ($payment_method === 'credit') {
            $payment_status = 'not_paid';
            $paid_amount    = 0;
            $balance_amount = $total_amount;
        } else {
            if ($paid_amount >= $total_amount) {
                $payment_status = 'paid';
                $balance_amount = 0;
            } else {
                $payment_status = 'partial';
                $balance_amount = $total_amount - $paid_amount;
            }
        }

        try {
            $payment = Payment::create([
                'company_id' => $company_id,
                'invoice_id' => $invoice_id,
                'invoice_no' => $invoice_no,
                'customer_id' => $customer_id,
                'total_amount' => $total_amount,
                'paid_amount' => $paid_amount,
                'balance_amount' => $balance_amount,
                'payment_method' => $payment_method,
                'payment_status' => $payment_status,
                'notes' => ''
            ]);

            return response()->json([
                "status"     => true,
                "invoice_no" => $invoice_no,
                "invoice_id" => $invoice_id,
                "payment_id" => $payment->id,
                "payment_status" => $payment_status,
            ]);
        } catch (\Exception $e) {
            return response()->json(["status" => false, "message" => $e->getMessage()], 500);
        }
    }

    public function updateCreditPayment(Request $request)
    {
        $invoice_id = intval($request->input('invoice_id', 0));
        $amount = floatval($request->input('amount', 0));
        $payment_method = $request->input('payment_method', 'cash');

        if ($invoice_id <= 0) {
            return response()->json(["status" => false, "message" => "Invalid Invoice ID"], 400);
        }
        if ($amount <= 0) {
            return response()->json(["status" => false, "message" => "Enter Valid Amount"], 400);
        }

        $invoice = Invoice::find($invoice_id);
        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Invoice Not Found"], 404);
        }

        $current_paid = floatval($invoice->paid_amount);
        $current_balance = floatval($invoice->balance_amount);

        $new_paid = $current_paid + $amount;
        $new_balance = max(0.0, $current_balance - $amount);
        $payment_status = $new_balance <= 0 ? 'paid' : 'partial';

        DB::beginTransaction();
        try {
            $invoice->update([
                'paid_amount' => $new_paid,
                'balance_amount' => $new_balance,
                'payment_method' => $payment_method,
                'payment_status' => $payment_status
            ]);

            Payment::where('invoice_no', $invoice->invoice_no)->update([
                'paid_amount' => $new_paid,
                'balance_amount' => $new_balance,
                'payment_method' => $payment_method,
                'payment_status' => $payment_status
            ]);

            DB::commit();
            return response()->json([
                "status" => true,
                "message" => "Payment Updated Successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(["status" => false, "message" => $e->getMessage()], 500);
        }
    }

    public function verifyGst(Request $request)
    {
        $gstin = trim($request->input('gst_no', ''));
        if ($gstin == '') {
            return response()->json(["status" => false, "message" => "GST Number required"]);
        }

        $apiKey = "key_live_7157232fd01340bab4657b0bbc90dbb4";
        $apiSecret = "secret_live_aabc1f041b3b4544b99b6feab57faeae";

        $authResponse = Http::withHeaders([
            "x-api-key" => $apiKey,
            "x-api-secret" => $apiSecret,
            "x-api-version" => "1.0.0"
        ])->post("https://api.sandbox.co.in/authenticate");

        if ($authResponse->failed()) {
            return response()->json([
                "status" => false,
                "step" => "auth",
                "response" => $authResponse->json()
            ]);
        }

        $authData = $authResponse->json();
        $accessToken = $authData['access_token'] ?? $authData['data']['access_token'] ?? '';

        if (!$accessToken) {
            return response()->json([
                "status" => false,
                "step" => "auth_token_extract",
                "response" => $authData
            ]);
        }

        $gstResponse = Http::withHeaders([
            "authorization" => $accessToken,
            "x-api-key" => $apiKey,
            "Content-Type" => "application/json"
        ])->post("https://api.sandbox.co.in/gst/compliance/public/gstin/search", [
            "gstin" => $gstin
        ]);

        if ($gstResponse->successful()) {
            $gstData = $gstResponse->json();
            return response()->json([
                "status" => true,
                "business_name" => $gstData['data']['business_name'] ?? "",
                "data" => $gstData['data']
            ]);
        } else {
            return response()->json([
                "status" => false,
                "message" => "Invalid GST Number",
                "response" => $gstResponse->json()
            ]);
        }
    }

    private function ensurePaymentsTable()
    {
        if (Schema::hasTable('payments')) {
            if (!Schema::hasColumn('payments', 'receipt_no')) {
                Schema::table('payments', function ($table) {
                    $table->string('receipt_no', 100)->nullable();
                });
            }
            if (!Schema::hasColumn('payments', 'payment_date')) {
                Schema::table('payments', function ($table) {
                    $table->date('payment_date')->nullable();
                });
            }
            if (!Schema::hasColumn('payments', 'payment_type')) {
                Schema::table('payments', function ($table) {
                    $table->string('payment_type', 50)->default('invoice_payment');
                });
            }
            if (!Schema::hasColumn('payments', 'discount_amount')) {
                Schema::table('payments', function ($table) {
                    $table->decimal('discount_amount', 10, 2)->default(0);
                });
            }
        }
    }

    public function payCustomerBulk(Request $request)
    {
        $this->ensurePaymentsTable();

        $company_id      = intval($request->input('company_id', 0));
        $customer_id     = intval($request->input('customer_id', 0));
        $received_amount = floatval($request->input('amount', 0));
        $discount_amount = floatval($request->input('discount_amount', 0));
        $total_amount    = $received_amount + $discount_amount;
        $payment_method  = $request->input('payment_method', 'cash');
        $payment_date    = $request->input('payment_date', date('Y-m-d'));
        $receipt_no      = trim($request->input('receipt_no', ''));
        $notes           = $request->input('notes', '');

        if ($customer_id <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Customer ID'], 400);
        }
        if ($total_amount <= 0) {
            return response()->json(['status' => false, 'message' => 'Payment amount must be greater than 0'], 400);
        }

        if (!$receipt_no) {
            $receipt_no = 'REC-' . time();
        }

        // Fetch all pending invoices for this customer, oldest first (FIFO)
        $query = Invoice::where('customer_id', $customer_id)
            ->where('balance_amount', '>', 0);
            
        if ($company_id > 0) {
            $query->where('company_id', $company_id);
        }

        $pendingInvoices = $query->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $cust = Customer::find($customer_id);
        if (!$cust) {
            return response()->json(['status' => false, 'message' => 'Customer not found'], 404);
        }

        $remaining = $total_amount;
        $applied   = [];

        DB::beginTransaction();
        try {
            if ($pendingInvoices->isNotEmpty()) {
                foreach ($pendingInvoices as $invoice) {
                    if ($remaining <= 0) break;

                    $balance  = floatval($invoice->balance_amount);
                    $applying = min($remaining, $balance);
                    $remaining -= $applying;

                    $new_paid    = floatval($invoice->paid_amount) + $applying;
                    $new_balance = max(0.00, $balance - $applying);
                    $payment_status = $new_balance <= 0 ? 'paid' : 'partial';

                    $invoice->update([
                        'paid_amount'    => $new_paid,
                        'balance_amount' => $new_balance,
                        'payment_method' => $payment_method,
                        'payment_status' => $payment_status
                    ]);

                    $applied[] = [
                        'invoice_id'   => $invoice->id,
                        'invoice_no'   => $invoice->invoice_no,
                        'applied'      => $applying,
                        'new_balance'  => $new_balance
                    ];
                }
            }

            // Update customer pending amount and store any excess in advance_balance
            $distributed = $total_amount - $remaining;
            $cust->pending_amount = max(0.00, floatval($cust->pending_amount) - $distributed);
            
            if ($remaining > 0) {
                $cust->advance_balance = floatval($cust->advance_balance) + $remaining;
            }
            $cust->save();

            // Create dedicated Payment-In voucher record
            $payment = Payment::create([
                'company_id'      => $company_id ?: ($cust->company_id ?? 0),
                'customer_id'     => $customer_id,
                'invoice_no'      => $receipt_no,
                'receipt_no'      => $receipt_no,
                'total_amount'    => $total_amount,
                'paid_amount'     => $received_amount,
                'discount_amount' => $discount_amount,
                'balance_amount'  => max(0.00, floatval($cust->pending_amount)),
                'payment_method'  => strtolower($payment_method),
                'payment_status'  => 'paid',
                'payment_type'    => 'payment_in',
                'payment_date'    => $payment_date,
                'notes'           => $notes
            ]);

            // Auto-increment payment_in_next_number in invoice_settings
            try {
                $targetCid = $company_id ?: ($cust->company_id ?? 0);
                if ($targetCid > 0) {
                    $invSetting = \App\Models\InvoiceSetting::getForCompany($targetCid);
                    if ($invSetting) {
                        $invSetting->payment_in_next_number = max(1, intval($invSetting->payment_in_next_number)) + 1;
                        $invSetting->save();
                    }
                }
            } catch (\Exception $ex) {
                \Log::warning("Could not increment payment_in_next_number: " . $ex->getMessage());
            }

            // Auto record expense for Payment-in Discount if discount was given
            if ($discount_amount > 0) {
                try {
                    $cat = \App\Models\ExpenseCategory::firstOrCreate(
                        ['name' => 'Payment-in Discount', 'company_id' => $company_id ?: ($cust->company_id ?? 0)],
                        ['type' => 'Direct Expense', 'admin_id' => $cust->admin_id ?? 0]
                    );
                    \App\Models\Expense::create([
                        'company_id'     => $company_id ?: ($cust->company_id ?? 0),
                        'admin_id'       => $cust->admin_id ?? 0,
                        'category_id'    => $cat->id,
                        'category_name'  => $cat->name,
                        'expense_no'     => 'PID-' . time(),
                        'expense_date'   => $payment_date,
                        'party_name'     => $cust->name ?? 'Customer',
                        'party_phone'    => $cust->phone ?? '',
                        'total_amount'   => $discount_amount,
                        'paid_amount'    => $discount_amount,
                        'balance_amount' => 0,
                        'payment_type'   => 'Discount',
                        'description'    => 'Payment-in discount given to ' . ($cust->name ?? 'Customer') . ($notes ? " ({$notes})" : ""),
                        'items'          => [
                            [
                                'item_name' => 'Payment Settlement Discount',
                                'qty' => 1,
                                'price' => $discount_amount,
                                'tax_rate' => 0,
                                'tax_amt' => 0,
                                'amount' => $discount_amount
                            ]
                        ]
                    ]);
                } catch (\Exception $ex) {
                    \Log::error("Failed to auto-record Payment-in Discount expense: " . $ex->getMessage());
                }
            }

            DB::commit();

            app(\App\Services\TransactionMessageService::class)->handlePaymentIn($company_id, $payment);

            return response()->json([
                'status'     => true,
                'message'    => 'Bulk payment recorded successfully. Distributed: ₹' . number_format($distributed, 2) . ($remaining > 0 ? ', Leftover stored as advance: ₹' . number_format($remaining, 2) : ''),
                'invoice_no' => $receipt_no,
                'receipt_no' => $receipt_no,
                'applied'    => $applied,
                'leftover'   => max(0.0, $remaining)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error recording bulk payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get only Payment-In vouchers (recorded through Add Payment-In modal)
     */
    public function getPaymentIns(Request $request)
    {
        $this->ensurePaymentsTable();

        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        if (!$admin_id) {
            return response()->json(["status" => false, "message" => "admin_id required"]);
        }

        $query = DB::table('payments as p')
            ->leftJoin('customers as c', 'c.id', '=', 'p.customer_id')
            ->leftJoin('companies as comp', 'comp.id', '=', 'p.company_id')
            ->select(
                'p.id',
                'p.company_id',
                'p.customer_id',
                'p.invoice_no',
                'p.receipt_no',
                'p.total_amount',
                'p.paid_amount',
                'p.discount_amount',
                'p.balance_amount',
                'p.payment_method',
                'p.payment_status',
                'p.notes',
                'p.payment_date',
                'p.created_at',
                'c.name as customer_name',
                'c.name',
                'c.phone as phone_number',
                'comp.company_name'
            )
            ->where(function ($q) {
                $q->where('p.payment_type', 'payment_in')
                  ->orWhere('p.notes', 'like', '%Payment received%')
                  ->orWhere('p.receipt_no', 'like', 'REC-%');
            })
            ->orderBy('p.id', 'desc');

        if ($admin_id > 0) {
            $query->where(function ($q) use ($admin_id) {
                $q->where('c.admin_id', $admin_id)
                  ->orWhereNull('c.admin_id');
            });
        }

        if ($company_id > 0) {
            $query->where('p.company_id', $company_id);
        }

        $records = $query->get();

        return response()->json([
            "status" => true,
            "data"   => $records
        ]);
    }

    /**
     * Delete a Payment-In voucher and restore customer balance
     */
    public function deletePaymentIn(Request $request)
    {
        $id = intval($request->input('id', 0));
        if ($id <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Payment ID']);
        }

        $payment = Payment::find($id);
        if (!$payment) {
            return response()->json(['status' => false, 'message' => 'Payment record not found']);
        }

        DB::beginTransaction();
        try {
            $cust = Customer::find($payment->customer_id);
            if ($cust) {
                $restoreAmt = floatval($payment->paid_amount) + floatval($payment->discount_amount);
                $cust->pending_amount = floatval($cust->pending_amount) + $restoreAmt;
                $cust->save();
            }

            $payment->delete();
            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Payment-In voucher deleted successfully and customer balance restored.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error deleting payment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerPayments(Request $request)
    {
        $customerId = intval($request->query('customer_id', 0));
        if ($customerId <= 0) {
            return response()->json(["status" => false, "message" => "Customer ID required"]);
        }

        $payments = DB::table('payments as p')
            ->leftJoin('invoices as i', 'i.id', '=', 'p.invoice_id')
            ->select('p.*', DB::raw('p.paid_amount as amount'), DB::raw('DATE(i.created_at) as invoice_date'), DB::raw('DATE(p.updated_at) as payment_date'))
            ->where('p.customer_id', $customerId)
            ->where('p.paid_amount', '>', 0)
            ->orderBy('p.updated_at', 'desc')
            ->get();

        return response()->json(["status" => true, "data" => $payments]);
    }

    public function deleteInvoice(Request $request)
    {
        $id = $request->input('id');
        $invoice_no = $request->input('invoice_no');

        if (!$id && !$invoice_no) {
            return response()->json(["status" => false, "message" => "Invoice ID or Invoice No required"]);
        }

        $query = Invoice::query();
        if ($id) {
            $query->where('id', $id);
        } else {
            $query->where('invoice_no', $invoice_no);
        }
        $invoice = $query->first();

        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Invoice not found"]);
        }

        DB::beginTransaction();
        try {
            // 1. Revert product stock for inventory tracked items
            $products = is_string($invoice->products) ? json_decode($invoice->products, true) : $invoice->products;
            if (is_array($products)) {
                foreach ($products as $item) {
                    $pid = intval($item['product_id'] ?? 0);
                    $qty = floatval($item['qty'] ?? 0);
                    if ($pid > 0 && $qty > 0) {
                        Product::where('id', $pid)->increment('stock', $qty);
                    }
                }
            }

            // 2. Delete associated payment records
            Payment::where('invoice_id', $invoice->id)
                ->orWhere('invoice_no', $invoice->invoice_no)
                ->delete();

            // 3. Delete invoice record
            $invoice->delete();

            DB::commit();
            return response()->json([
                "status" => true,
                "message" => "Invoice deleted successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                "status" => false,
                "message" => "Failed to delete invoice: " . $e->getMessage()
            ], 500);
        }
    }

    public function updateInvoice(Request $request)
    {
        $invoice_no = trim($request->input('invoice_no', ''));
        $id = intval($request->input('id', 0));

        if (!$invoice_no && !$id) {
            return response()->json(["status" => false, "message" => "Invoice No or ID required"]);
        }

        $query = Invoice::query();
        if ($id > 0) {
            $query->where('id', $id);
        } else {
            $query->where('invoice_no', $invoice_no);
        }
        $invoice = $query->first();

        if (!$invoice) {
            return response()->json(["status" => false, "message" => "Invoice not found"]);
        }

        $company_id     = intval($request->input('company_id', $invoice->company_id));
        $customer_id    = intval($request->input('customer_id', 0));
        $customer_name  = trim($request->input('customer_name', ''));
        if ($customer_name === "") $customer_name = "Cash Customer";
        $customer_phone = trim($request->input('customer_phone', ''));
        $products       = $request->input('products', []);
        $sub_total      = floatval($request->input('sub_total', 0));
        $gst_total      = floatval($request->input('gst_total', 0));
        $total_amount   = floatval($request->input('total_amount', 0));
        $paid_amount    = floatval($request->input('paid_amount', 0));
        $payment_method = trim($request->input('payment_method', 'cash'));
        $payment_type   = trim($request->input('payment_type', 'cash'));
        $gst_type       = trim($request->input('gst_type', 'with_gst'));

        if (count($products) == 0) {
            return response()->json(["status" => false, "message" => "No products in invoice"]);
        }

        DB::beginTransaction();
        try {
            // 1. Reconcile Stock: Revert old products stock
            $oldProducts = is_string($invoice->products) ? json_decode($invoice->products, true) : $invoice->products;
            if (is_array($oldProducts)) {
                foreach ($oldProducts as $oldItem) {
                    $oldPid = intval($oldItem['product_id'] ?? 0);
                    $oldQty = floatval($oldItem['qty'] ?? 0);
                    if ($oldPid > 0 && $oldQty > 0) {
                        Product::where('id', $oldPid)->increment('stock', $oldQty);
                    }
                }
            }

            // 2. Process Products & Auto-create unlisted items with negative stock
            $processedProducts = [];
            foreach ($products as $item) {
                $pid     = intval($item['product_id'] ?? 0);
                $qty     = floatval($item['qty'] ?? 1);
                $prodName = trim($item['product_name'] ?? $item['name'] ?? '');

                if ($pid > 0) {
                    $prod = Product::where('id', $pid)->where('is_deleted', 0)->first();
                    if ($prod) {
                        $item['product_id'] = $prod->id;
                        $item['product_name'] = $prod->product_name;
                        Product::where('id', $pid)->decrement('stock', $qty);
                    }
                } else if (!empty($prodName)) {
                    $existingProd = Product::where('company_id', $company_id)
                        ->where('is_deleted', 0)
                        ->whereRaw('LOWER(product_name) = ?', [strtolower($prodName)])
                        ->first();

                    if ($existingProd) {
                        $item['product_id'] = $existingProd->id;
                        $item['product_name'] = $existingProd->product_name;
                        Product::where('id', $existingProd->id)->decrement('stock', $qty);
                    } else {
                        $price  = floatval($item['price'] ?? 0);
                        $gstPct = floatval($item['gst'] ?? $item['tax_percent'] ?? 0);
                        $unit   = !empty($item['unit']) && $item['unit'] !== 'NONE' ? trim($item['unit']) : 'PCS';
                        $code   = !empty($item['product_code']) ? trim($item['product_code']) : null;

                        $newProd = Product::create([
                            'product_name'   => $prodName,
                            'product_code'   => $code,
                            'price'          => $price,
                            'sale_price'     => $price,
                            'purchase_price' => 0,
                            'stock'          => -floatval($qty),
                            'unit'           => $unit,
                            'gst_percentage' => $gstPct,
                            'company_id'     => $company_id,
                            'status'         => 'active',
                            'is_deleted'     => 0,
                            'created_at'     => now(),
                        ]);

                        $item['product_id']   = $newProd->id;
                        $item['product_name'] = $newProd->product_name;
                    }
                }
                $processedProducts[] = $item;
            }
            $products = $processedProducts;

            // 3. Compute Paid, Balance & Due Date
            $due_date = null;
            if ($payment_type === "credit") {
                $final_paid     = $paid_amount;
                $balance_amount = max(0.0, $total_amount - $final_paid);
                $payment_status = $balance_amount <= 0 ? "paid" : ($final_paid > 0 ? "partial" : "not_paid");
                if ($request->filled('due_date')) {
                    $due_date = $request->input('due_date');
                } else {
                    $credit_days = 0;
                    if ($customer_id > 0) {
                        $cust = Customer::find($customer_id);
                        if ($cust) {
                            $credit_days = intval($cust->credit_days);
                        }
                    }
                    $due_date = $credit_days > 0
                        ? date('Y-m-d', strtotime("+$credit_days days"))
                        : date('Y-m-d');
                }
            } else {
                $final_paid     = $total_amount;
                $balance_amount = 0;
                $payment_status = "paid";
            }

            // 4. Update Invoice
            $invoice->update([
                'customer_id'    => $customer_id > 0 ? $customer_id : null,
                'customer_name'  => $customer_name,
                'customer_phone' => $customer_phone,
                'products'       => $products,
                'sub_total'      => $sub_total,
                'gst_total'      => $gst_total,
                'total_amount'   => $total_amount,
                'paid_amount'    => $final_paid,
                'balance_amount' => $balance_amount,
                'due_date'       => $due_date,
                'payment_method' => $payment_method,
                'payment_type'   => $payment_type,
                'gst_type'       => $gst_type,
                'payment_status' => $payment_status,
                'company_id'     => $company_id,
            ]);

            // 5. Update/Sync Payment record
            Payment::where('invoice_id', $invoice->id)->orWhere('invoice_no', $invoice->invoice_no)->delete();
            Payment::create([
                'company_id'     => $company_id,
                'invoice_id'     => $invoice->id,
                'invoice_no'     => $invoice->invoice_no,
                'customer_id'    => $customer_id > 0 ? $customer_id : 0,
                'total_amount'   => $total_amount,
                'paid_amount'    => $final_paid,
                'balance_amount' => $balance_amount,
                'payment_method' => $payment_method,
                'payment_status' => $payment_status,
                'notes'          => 'Updated from edit invoice'
            ]);

            DB::commit();
            return response()->json([
                "status"     => true,
                "message"    => "Invoice updated successfully",
                "invoice_no" => $invoice->invoice_no
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                "status"  => false,
                "message" => "Failed to update invoice: " . $e->getMessage()
            ], 500);
        }
    }
}
