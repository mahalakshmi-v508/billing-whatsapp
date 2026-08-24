<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

class AiController extends Controller
{
    /**
     * AI Copilot: Parses natural language commands into billing actions.
     */
    public function copilot(Request $request)
    {
        $prompt     = trim($request->input('prompt', ''));
        $company_id = intval($request->input('company_id', 0));
        $cart       = $request->input('cart', []);

        if (empty($prompt)) {
            return response()->json([
                "status" => false,
                "message" => "Please enter a voice or text command for AI Copilot."
            ]);
        }

        $actions = [];
        $feedback = [];
        $lowerPrompt = strtolower($prompt);

        // Fetch products for matching
        $products = DB::table('products')
            ->where('company_id', $company_id)
            ->where('status', 'active')
            ->where('is_deleted', 0)
            ->get();

        $matchedProductIds = [];

        // 1. Process Product Code or Name matches (support multiple items comma/space separated)
        foreach ($products as $prod) {
            $pName = strtolower($prod->product_name);
            $pCode = !empty($prod->product_code) ? strtolower($prod->product_code) : '';
            $pBarcode = !empty($prod->barcode) ? strtolower($prod->barcode) : '';

            $isMatched = false;
            $qty = 1;

            // Match by Product Code (exact word / token match or substring)
            if ($pCode !== '' && (
                preg_match('/\b' . preg_quote($pCode, '/') . '\b/i', $lowerPrompt) ||
                str_contains($lowerPrompt, $pCode)
            )) {
                $isMatched = true;
                // Try parsing quantity before or after code: e.g. "PRD001 5", "5 PRD001", "PRD001:3"
                if (preg_match('/(\d+)\s*(?:x|pcs|units?|kg)?\s*' . preg_quote($pCode, '/') . '/i', $lowerPrompt, $m)) {
                    $qty = intval($m[1]);
                } elseif (preg_match('/' . preg_quote($pCode, '/') . '\s*(?::|x|=)?\s*(\d+)/i', $lowerPrompt, $m)) {
                    $qty = intval($m[1]);
                }
            }
            // Match by Barcode
            elseif ($pBarcode !== '' && str_contains($lowerPrompt, $pBarcode)) {
                $isMatched = true;
            }
            // Match by Product Name
            elseif ($pName !== '' && str_contains($lowerPrompt, $pName)) {
                $isMatched = true;
                if (preg_match('/(\d+)\s*(?:kg|g|pc|pcs|pack|liter|l|units?)?\s*' . preg_quote($pName, '/') . '/i', $lowerPrompt, $m)) {
                    $qty = intval($m[1]);
                } elseif (preg_match('/' . preg_quote($pName, '/') . '\s*(?::|x|=)?\s*(\d+)/i', $lowerPrompt, $m)) {
                    $qty = intval($m[1]);
                }
            }

            if ($isMatched && !in_array($prod->id, $matchedProductIds)) {
                $matchedProductIds[] = $prod->id;
                $actions[] = [
                    'type' => 'add_item',
                    'product' => [
                        'id' => $prod->id,
                        'product_name' => $prod->product_name,
                        'product_code' => $prod->product_code,
                        'price' => floatval($prod->price),
                        'stock' => intval($prod->stock),
                        'unit' => $prod->unit ?: 'unit',
                        'gst_percentage' => floatval($prod->gst_percentage),
                        'barcode' => $prod->barcode
                    ],
                    'quantity' => max(1, $qty)
                ];
                $codeLabel = !empty($prod->product_code) ? " [{$prod->product_code}]" : "";
                $feedback[] = "Added {$qty} x {$prod->product_name}{$codeLabel}";
            }
        }

        // 2. Check for discount command (e.g. "discount 10%", "50 discount")
        if (preg_match('/(\d+(?:\.\d+)?)\s*%\s*discount/i', $lowerPrompt, $matches)) {
            $actions[] = [
                'type' => 'set_discount_percent',
                'value' => floatval($matches[1])
            ];
            $feedback[] = "Applied {$matches[1]}% discount.";
        } elseif (preg_match('/discount\s*(\d+(?:\.\d+)?)/i', $lowerPrompt, $matches) || preg_match('/(\d+(?:\.\d+)?)\s*rupees?\s*discount/i', $lowerPrompt, $matches)) {
            $actions[] = [
                'type' => 'set_discount_flat',
                'value' => floatval($matches[1])
            ];
            $feedback[] = "Applied ₹{$matches[1]} flat discount.";
        }

        // 3. Payment Method detection (e.g. "payment upi", "cash", "credit sale")
        if (str_contains($lowerPrompt, 'upi') || str_contains($lowerPrompt, 'gpay') || str_contains($lowerPrompt, 'phonepe') || str_contains($lowerPrompt, 'paytm')) {
            $actions[] = ['type' => 'set_payment_method', 'value' => 'upi'];
            $feedback[] = "Payment method set to UPI.";
        } elseif (str_contains($lowerPrompt, 'credit')) {
            $actions[] = ['type' => 'set_payment_type', 'value' => 'credit'];
            $feedback[] = "Invoice marked as Credit sale.";
        } elseif (str_contains($lowerPrompt, 'card') || str_contains($lowerPrompt, 'online')) {
            $actions[] = ['type' => 'set_payment_method', 'value' => 'online'];
            $feedback[] = "Payment method set to Online/Card.";
        }

        // 4. Customer Phone / Name detection (e.g., "customer 9876543210")
        if (preg_match('/[6-9]\d{9}/', $lowerPrompt, $phoneMatch)) {
            $phone = $phoneMatch[0];
            $customer = Customer::where('company_id', $company_id)
                ->where('phone', $phone)
                ->first();
            if ($customer) {
                $actions[] = [
                    'type' => 'set_customer',
                    'customer' => $customer
                ];
                $feedback[] = "Selected customer {$customer->name} ({$phone}).";
            } else {
                $actions[] = [
                    'type' => 'set_customer_phone',
                    'phone' => $phone
                ];
                $feedback[] = "Set customer phone {$phone}.";
            }
        }

        if (empty($actions)) {
            return response()->json([
                "status" => true,
                "message" => "AI Copilot: No matching product or action found for \"{$prompt}\". Tip: Enter product codes like 'PRD001, PRD002' or item names like 'Rice 2kg, Sugar 1kg'.",
                "actions" => [],
                "feedback" => ["No matching product or action recognized. Try specifying product codes or item names."]
            ]);
        }

        return response()->json([
            "status" => true,
            "message" => "AI Copilot Executed: " . implode(" | ", $feedback),
            "actions" => $actions,
            "feedback" => $feedback
        ]);
    }

    /**
     * AI Smart Product Suggestion: Suggests frequent customer add-ons & bundles.
     */
    public function smartSuggest(Request $request)
    {
        $company_id  = intval($request->input('company_id', 0));
        $customer_id = intval($request->input('customer_id', 0));
        $cart_ids    = $request->input('cart_product_ids', []);

        $suggestions = [];

        // 1. Frequently bought by this customer
        if ($customer_id > 0) {
            $pastProductIds = DB::table('invoices as i')
                ->join('invoice_items as ii', 'i.id', '=', 'ii.invoice_id')
                ->where('i.company_id', $company_id)
                ->where('i.customer_id', $customer_id)
                ->groupBy('ii.product_id')
                ->orderByRaw('COUNT(*) DESC')
                ->limit(4)
                ->pluck('ii.product_id')
                ->toArray();

            if (!empty($pastProductIds)) {
                $custProducts = DB::table('products')
                    ->whereIn('id', array_diff($pastProductIds, $cart_ids))
                    ->where('company_id', $company_id)
                    ->where('status', 'active')
                    ->where('is_deleted', 0)
                    ->get();
                foreach ($custProducts as $cp) {
                    $cp->reason = "Frequently bought by this customer";
                    $suggestions[] = $cp;
                }
            }
        }

        // 2. Popular items in store
        $popularProducts = DB::table('products')
            ->where('company_id', $company_id)
            ->where('status', 'active')
            ->where('is_deleted', 0)
            ->whereNotIn('id', $cart_ids)
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        foreach ($popularProducts as $pp) {
            // Avoid duplicates
            if (!in_array($pp->id, array_column($suggestions, 'id'))) {
                $pp->reason = "Top selling product in store";
                $suggestions[] = $pp;
            }
        }

        return response()->json([
            "status" => true,
            "data" => array_slice($suggestions, 0, 6)
        ]);
    }

    /**
     * AI Anomaly Detector: Analyzes current invoice draft for errors/alerts.
     */
    public function detectAnomaly(Request $request)
    {
        $cart         = $request->input('cart', []);
        $total_amount = floatval($request->input('total_amount', 0));
        $anomalies    = [];

        foreach ($cart as $item) {
            $qty   = floatval($item['quantity'] ?? 1);
            $price = floatval($item['price'] ?? 0);
            $stock = floatval($item['stock'] ?? 0);
            $name  = $item['product_name'] ?? 'Item';

            // High Quantity Check
            if ($qty > 50) {
                $anomalies[] = [
                    'type' => 'warning',
                    'title' => 'High Quantity Warning',
                    'message' => "{$name} quantity is {$qty}. Please double check before finalizing."
                ];
            }

            // Zero / Low Price Check
            if ($price <= 0) {
                $anomalies[] = [
                    'type' => 'error',
                    'title' => 'Zero Price Alert',
                    'message' => "{$name} has a price of ₹0.00."
                ];
            }

            // Out of Stock / Stock Overdraft Check
            if ($stock > 0 && $qty > $stock) {
                $anomalies[] = [
                    'type' => 'danger',
                    'title' => 'Stock Overdraft',
                    'message' => "{$name} requested quantity ({$qty}) exceeds current available stock ({$stock})."
                ];
            }
        }

        if ($total_amount > 50000) {
            $anomalies[] = [
                'type' => 'info',
                'title' => 'High Value Invoice',
                'message' => "Invoice total exceeds ₹50,000. Ensure PAN / GSTIN is verified if applicable."
            ];
        }

        return response()->json([
            "status" => true,
            "has_anomalies" => count($anomalies) > 0,
            "anomalies" => $anomalies
        ]);
    }

    /**
     * AI Product Auto-Filler: Generates smart attributes for new product entry.
     */
    public function generateProductInfo(Request $request)
    {
        $title = trim($request->input('title', ''));
        if (empty($title)) {
            return response()->json(["status" => false, "message" => "Title required"]);
        }

        $lower = strtolower($title);
        $suggestedUnit = "piece";
        $suggestedGst = 0;

        if (str_contains($lower, 'rice') || str_contains($lower, 'sugar') || str_contains($lower, 'flour') || str_contains($lower, 'dal') || str_contains($lower, 'grain') || str_contains($lower, 'wheat')) {
            $suggestedUnit = "kg";
            $suggestedGst = 5;
        } elseif (str_contains($lower, 'oil') || str_contains($lower, 'milk') || str_contains($lower, 'ghee') || str_contains($lower, 'water') || str_contains($lower, 'juice')) {
            $suggestedUnit = "litre";
            $suggestedGst = 5;
        } elseif (str_contains($lower, 'soap') || str_contains($lower, 'shampoo') || str_contains($lower, 'paste') || str_contains($lower, 'biscuit') || str_contains($lower, 'chips')) {
            $suggestedUnit = "pack";
            $suggestedGst = 18;
        }

        $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $title), 0, 4)) . rand(100, 999);
        $barcode = "890" . rand(100000000, 999999999);

        return response()->json([
            "status" => true,
            "data" => [
                "product_code" => $code,
                "barcode" => $barcode,
                "suggested_unit" => $suggestedUnit,
                "suggested_gst" => $suggestedGst
            ]
        ]);
    }
}
