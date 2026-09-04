<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Brand;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Models\PurchasePayment;

class PurchaseController extends Controller
{
    /**
     * Ensure Vyapar-specific columns exist in purchases and purchase_items tables.
     */
    private function ensureSchemaUpdated()
    {
        if (Schema::hasTable('purchases')) {
            Schema::table('purchases', function (Blueprint $table) {
                if (!Schema::hasColumn('purchases', 'discount_total')) {
                    $table->decimal('discount_total', 10, 2)->default(0)->after('gst_total');
                }
                if (!Schema::hasColumn('purchases', 'round_off')) {
                    $table->decimal('round_off', 10, 2)->default(0)->after('discount_total');
                }
                if (!Schema::hasColumn('purchases', 'payment_type')) {
                    $table->string('payment_type', 50)->default('Cash')->after('balance_amount');
                }
                if (!Schema::hasColumn('purchases', 'state_of_supply')) {
                    $table->string('state_of_supply', 100)->nullable()->after('payment_type');
                }
                if (!Schema::hasColumn('purchases', 'terms_conditions')) {
                    $table->text('terms_conditions')->nullable()->after('state_of_supply');
                }
                if (!Schema::hasColumn('purchases', 'description')) {
                    $table->text('description')->nullable()->after('terms_conditions');
                }
                if (!Schema::hasColumn('purchases', 'bill_attachment')) {
                    $table->string('bill_attachment', 255)->nullable()->after('description');
                }
            });
        }

        if (Schema::hasTable('purchase_items')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                if (!Schema::hasColumn('purchase_items', 'tax_mode')) {
                    $table->string('tax_mode', 20)->default('without_tax')->after('price');
                }
                if (!Schema::hasColumn('purchase_items', 'discount_percent')) {
                    $table->decimal('discount_percent', 5, 2)->default(0)->after('tax_mode');
                }
                if (!Schema::hasColumn('purchase_items', 'discount_amount')) {
                    $table->decimal('discount_amount', 10, 2)->default(0)->after('discount_percent');
                }
                if (!Schema::hasColumn('purchase_items', 'tax_amount')) {
                    $table->decimal('tax_amount', 10, 2)->default(0)->after('gst_percentage');
                }
                if (!Schema::hasColumn('purchase_items', 'total_amount')) {
                    $table->decimal('total_amount', 10, 2)->default(0)->after('tax_amount');
                }
            });
        }

        if (Schema::hasTable('purchase_payments')) {
            Schema::table('purchase_payments', function (Blueprint $table) {
                if (!Schema::hasColumn('purchase_payments', 'supplier_id')) {
                    $table->integer('supplier_id')->nullable()->after('company_id');
                }
                if (!Schema::hasColumn('purchase_payments', 'receipt_no')) {
                    $table->string('receipt_no', 100)->nullable()->after('id');
                }
            });
        }
    }
    /**
     * Parse and validate imported Excel/JSON items.
     * Looks up existing Category/Subcategory/Brand/Product mappings.
     */
    public function validateItems(Request $request)
    {
        $companyId = intval($request->input('company_id', 0));
        $items = $request->input('items', []);

        if (!$companyId) {
            return response()->json([
                'status' => false,
                'message' => 'Company ID is required'
            ]);
        }

        $validatedItems = [];

        foreach ($items as $item) {
            $productName = trim($item['product_name'] ?? '');
            $productCode = trim($item['product_code'] ?? '');
            $barcode = trim($item['barcode'] ?? '');
            $categoryName = trim($item['category_name'] ?? '');
            $subcategoryName = trim($item['subcategory_name'] ?? '');
            $brandName = trim($item['brand_name'] ?? '');
            $price = floatval($item['price'] ?? 0);
            $sellingPrice = floatval($item['selling_price'] ?? 0);
            $sellingPricePerUnit = trim($item['selling_price_per_unit'] ?? '');
            $quantity = intval($item['quantity'] ?? 0);
            $unit = trim($item['unit'] ?? '');
            $gstPercentage = floatval($item['gst_percentage'] ?? 0);

            $productId = null;
            $categoryId = null;
            $subcategoryId = null;
            $brandId = null;

            $status = 'valid';
            $errors = [];
            $warnings = [];

            if (empty($productName)) {
                $status = 'error';
                $errors[] = 'Product name is required';
            }

            if ($quantity <= 0) {
                $status = 'error';
                $errors[] = 'Quantity must be greater than 0';
            }

            // 1. Try to find existing product by Code, Barcode, or Name
            $productQuery = Product::where('company_id', $companyId)->where('is_deleted', 0);
            $existingProduct = null;

            if (!empty($productCode)) {
                $existingProduct = (clone $productQuery)->where('product_code', $productCode)->first();
            }
            if (!$existingProduct && !empty($barcode)) {
                $existingProduct = (clone $productQuery)->where('barcode', $barcode)->first();
            }
            if (!$existingProduct && !empty($productName)) {
                $existingProduct = (clone $productQuery)->whereRaw('LOWER(product_name) = ?', [strtolower($productName)])->first();
            }

            if ($existingProduct) {
                $productId = $existingProduct->id;
                $categoryId = $existingProduct->category_id;
                $subcategoryId = $existingProduct->subcategory_id;
                $brandId = $existingProduct->brand_id;
                $warnings[] = 'Product already exists. Stock will be incremented.';
            } else {
                // 2. Resolve Category
                if (!empty($categoryName)) {
                    $category = Category::where('company_id', $companyId)
                        ->where('is_deleted', 0)
                        ->whereRaw('LOWER(name) = ?', [strtolower($categoryName)])
                        ->first();
                    if ($category) {
                        $categoryId = $category->id;
                    } else {
                        $warnings[] = "Category '{$categoryName}' will be created.";
                    }
                }

                // 3. Resolve Subcategory
                if (!empty($subcategoryName) && $categoryId) {
                    $subcategory = Subcategory::where('company_id', $companyId)
                        ->where('category_id', $categoryId)
                        ->where('is_deleted', 0)
                        ->whereRaw('LOWER(name) = ?', [strtolower($subcategoryName)])
                        ->first();
                    if ($subcategory) {
                        $subcategoryId = $subcategory->id;
                    } else {
                        $warnings[] = "Subcategory '{$subcategoryName}' will be created.";
                    }
                } elseif (!empty($subcategoryName) && !$categoryId) {
                    $warnings[] = "Subcategory '{$subcategoryName}' will be created under new Category.";
                }

                // 4. Resolve Brand
                if (!empty($brandName)) {
                    $brand = Brand::where('company_id', $companyId)
                        ->where('is_deleted', 0)
                        ->whereRaw('LOWER(name) = ?', [strtolower($brandName)])
                        ->first();
                    if ($brand) {
                        $brandId = $brand->id;
                    } else {
                        $warnings[] = "Brand '{$brandName}' will be created.";
                    }
                }
            }

            if (count($errors) > 0) {
                $status = 'error';
            } elseif (count($warnings) > 0) {
                $status = 'warning';
            }

            $validatedItems[] = [
                'product_name' => $productName,
                'product_code' => $productCode ?: null,
                'barcode' => $barcode ?: null,
                'category_name' => $categoryName,
                'subcategory_name' => $subcategoryName,
                'brand_name' => $brandName,
                'price' => $price,
                'selling_price' => $sellingPrice,
                'selling_price_per_unit' => $sellingPricePerUnit ?: null,
                'quantity' => $quantity,
                'unit' => $unit ?: 'pcs',
                'gst_percentage' => $gstPercentage,
                'product_id' => $productId,
                'category_id' => $categoryId,
                'subcategory_id' => $subcategoryId,
                'brand_id' => $brandId,
                'status' => $status,
                'errors' => $errors,
                'warnings' => $warnings
            ];
        }

        return response()->json([
            'status' => true,
            'data' => $validatedItems
        ]);
    }

    /**
     * Save purchase as draft.
     */
    public function saveDraft(Request $request)
    {
        $this->ensureSchemaUpdated();

        $id = intval($request->input('id', 0));
        $companyId = intval($request->input('company_id', 0));
        $supplierId = intval($request->input('supplier_id', 0));
        $purchaseNo = trim($request->input('purchase_no', ''));
        $purchaseDate = $request->input('purchase_date', date('Y-m-d'));
        $items = $request->input('items', []);

        if (!$companyId || !$supplierId) {
            return response()->json([
                'status' => false,
                'message' => 'Company and Supplier are required'
            ]);
        }

        DB::beginTransaction();
        try {
            $subTotal = 0;
            $gstTotal = 0;
            $discountTotal = 0;
            $computedTotal = 0;

            foreach ($items as $item) {
                $qty = floatval($item['quantity'] ?? 0);
                $price = floatval($item['price'] ?? 0);
                $taxMode = $item['tax_mode'] ?? 'without_tax';
                $discountPct = floatval($item['discount_percent'] ?? 0);
                $discountAmt = floatval($item['discount_amount'] ?? 0);
                $gstPct = floatval($item['gst_percentage'] ?? 0);

                // Base calculation
                $rawSub = $qty * $price;
                if ($discountPct > 0) {
                    $discountAmt = $rawSub * ($discountPct / 100);
                }
                $lineTaxable = max(0, $rawSub - $discountAmt);

                if ($taxMode === 'with_tax') {
                    // Reverse tax calculation: price is inclusive of GST
                    $inclusiveTotal = max(0, ($qty * $price) - $discountAmt);
                    $lineTax = $inclusiveTotal - ($inclusiveTotal / (1 + ($gstPct / 100)));
                    $lineSub = $inclusiveTotal - $lineTax;
                    $lineTotal = $inclusiveTotal;
                } else {
                    $lineTax = $lineTaxable * ($gstPct / 100);
                    $lineSub = $lineTaxable;
                    $lineTotal = $lineTaxable + $lineTax;
                }

                $subTotal += $lineSub;
                $gstTotal += $lineTax;
                $discountTotal += $discountAmt;
                $computedTotal += $lineTotal;
            }

            $roundOff = floatval($request->input('round_off', 0));
            $finalTotal = floatval($request->input('total_amount', $computedTotal + $roundOff));
            $paidAmount = floatval($request->input('paid_amount', 0));
            $balanceAmount = max(0.00, $finalTotal - $paidAmount);

            $purchaseData = [
                'purchase_no' => $purchaseNo ?: null,
                'supplier_id' => $supplierId,
                'company_id' => $companyId,
                'purchase_date' => $purchaseDate,
                'sub_total' => $subTotal,
                'gst_total' => $gstTotal,
                'discount_total' => $discountTotal,
                'round_off' => $roundOff,
                'total_amount' => $finalTotal,
                'paid_amount' => $paidAmount,
                'balance_amount' => $balanceAmount,
                'payment_type' => $request->input('payment_type', 'Cash'),
                'state_of_supply' => $request->input('state_of_supply', null),
                'terms_conditions' => $request->input('terms_conditions', null),
                'description' => $request->input('description', null),
                'bill_attachment' => $request->input('bill_attachment', null),
                'status' => 'draft'
            ];

            if ($id > 0) {
                $purchase = Purchase::where('id', $id)->where('company_id', $companyId)->first();
                if (!$purchase) {
                    return response()->json(['status' => false, 'message' => 'Purchase not found']);
                }
                $purchase->update($purchaseData);
                PurchaseItem::where('purchase_id', $purchase->id)->delete();
            } else {
                $purchase = Purchase::create($purchaseData);
            }

            foreach ($items as $item) {
                $qty = floatval($item['quantity'] ?? 0);
                $price = floatval($item['price'] ?? 0);
                $taxMode = $item['tax_mode'] ?? 'without_tax';
                $discountPct = floatval($item['discount_percent'] ?? 0);
                $discountAmt = floatval($item['discount_amount'] ?? 0);
                $gstPct = floatval($item['gst_percentage'] ?? 0);

                $rawSub = $qty * $price;
                if ($discountPct > 0) {
                    $discountAmt = $rawSub * ($discountPct / 100);
                }
                $lineTaxable = max(0, $rawSub - $discountAmt);

                if ($taxMode === 'with_tax') {
                    $inclusiveTotal = max(0, ($qty * $price) - $discountAmt);
                    $lineTax = $inclusiveTotal - ($inclusiveTotal / (1 + ($gstPct / 100)));
                    $lineTotal = $inclusiveTotal;
                } else {
                    $lineTax = $lineTaxable * ($gstPct / 100);
                    $lineTotal = $lineTaxable + $lineTax;
                }

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => trim($item['product_name'] ?? ''),
                    'product_code' => trim($item['product_code'] ?? '') ?: null,
                    'barcode' => trim($item['barcode'] ?? '') ?: null,
                    'category_name' => trim($item['category_name'] ?? '') ?: null,
                    'subcategory_name' => trim($item['subcategory_name'] ?? '') ?: null,
                    'brand_name' => trim($item['brand_name'] ?? '') ?: null,
                    'category_id' => $item['category_id'] ?? null,
                    'subcategory_id' => $item['subcategory_id'] ?? null,
                    'brand_id' => $item['brand_id'] ?? null,
                    'price' => $price,
                    'tax_mode' => $taxMode,
                    'discount_percent' => $discountPct,
                    'discount_amount' => $discountAmt,
                    'selling_price' => floatval($item['selling_price'] ?? 0),
                    'selling_price_per_unit' => trim($item['selling_price_per_unit'] ?? '') ?: null,
                    'quantity' => $qty,
                    'unit' => trim($item['unit'] ?? 'Piece'),
                    'gst_percentage' => $gstPct,
                    'tax_amount' => $lineTax,
                    'total_amount' => $lineTotal
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Purchase saved as draft successfully',
                'purchase_id' => $purchase->id
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => false,
                'message' => 'Error saving draft: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Submit purchase and commit stocks to Inventory.
     */
    public function submitPurchase(Request $request)
    {
        $this->ensureSchemaUpdated();

        $id = intval($request->input('id', 0));
        $companyId = intval($request->input('company_id', 0));
        $supplierId = intval($request->input('supplier_id', 0));
        $purchaseNo = trim($request->input('purchase_no', ''));
        $purchaseDate = $request->input('purchase_date', date('Y-m-d'));
        $items = $request->input('items', []);

        if (!$companyId || !$supplierId) {
            return response()->json([
                'status' => false,
                'message' => 'Company and Supplier are required'
            ]);
        }

        DB::beginTransaction();
        try {
            $subTotal = 0;
            $gstTotal = 0;
            $discountTotal = 0;
            $computedTotal = 0;

            foreach ($items as $item) {
                $qty = floatval($item['quantity'] ?? 0);
                $price = floatval($item['price'] ?? 0);
                $taxMode = $item['tax_mode'] ?? 'without_tax';
                $discountPct = floatval($item['discount_percent'] ?? 0);
                $discountAmt = floatval($item['discount_amount'] ?? 0);
                $gstPct = floatval($item['gst_percentage'] ?? 0);

                $rawSub = $qty * $price;
                if ($discountPct > 0) {
                    $discountAmt = $rawSub * ($discountPct / 100);
                }
                $lineTaxable = max(0, $rawSub - $discountAmt);

                if ($taxMode === 'with_tax') {
                    $inclusiveTotal = max(0, ($qty * $price) - $discountAmt);
                    $lineTax = $inclusiveTotal - ($inclusiveTotal / (1 + ($gstPct / 100)));
                    $lineSub = $inclusiveTotal - $lineTax;
                    $lineTotal = $inclusiveTotal;
                } else {
                    $lineTax = $lineTaxable * ($gstPct / 100);
                    $lineSub = $lineTaxable;
                    $lineTotal = $lineTaxable + $lineTax;
                }

                $subTotal += $lineSub;
                $gstTotal += $lineTax;
                $discountTotal += $discountAmt;
                $computedTotal += $lineTotal;
            }

            $roundOff = floatval($request->input('round_off', 0));
            $finalTotal = floatval($request->input('total_amount', $computedTotal + $roundOff));
            $paidAmount = floatval($request->input('paid_amount', 0));
            $balanceAmount = max(0.00, $finalTotal - $paidAmount);
            $paymentType = $request->input('payment_type', 'Cash');

            $purchaseData = [
                'purchase_no' => $purchaseNo ?: null,
                'supplier_id' => $supplierId,
                'company_id' => $companyId,
                'purchase_date' => $purchaseDate,
                'sub_total' => $subTotal,
                'gst_total' => $gstTotal,
                'discount_total' => $discountTotal,
                'round_off' => $roundOff,
                'total_amount' => $finalTotal,
                'paid_amount' => $paidAmount,
                'balance_amount' => $balanceAmount,
                'payment_type' => $paymentType,
                'state_of_supply' => $request->input('state_of_supply', null),
                'terms_conditions' => $request->input('terms_conditions', null),
                'description' => $request->input('description', null),
                'bill_attachment' => $request->input('bill_attachment', null),
                'status' => 'submitted'
            ];

            if ($id > 0) {
                $purchase = Purchase::where('id', $id)->where('company_id', $companyId)->first();
                if (!$purchase) {
                    return response()->json(['status' => false, 'message' => 'Purchase not found']);
                }
                if ($purchase->status === 'submitted') {
                    return response()->json(['status' => false, 'message' => 'Purchase already finalized']);
                }
                $purchase->update($purchaseData);
                PurchaseItem::where('purchase_id', $purchase->id)->delete();
            } else {
                $purchase = Purchase::create($purchaseData);
            }

            // 2. Process items & update/create inventory stock
            foreach ($items as $item) {
                $productName = trim($item['product_name'] ?? '');
                $productCode = trim($item['product_code'] ?? '') ?: null;
                $barcode = trim($item['barcode'] ?? '') ?: null;
                $categoryName = trim($item['category_name'] ?? '');
                $subcategoryName = trim($item['subcategory_name'] ?? '');
                $brandName = trim($item['brand_name'] ?? '');
                $price = floatval($item['price'] ?? 0);
                $taxMode = $item['tax_mode'] ?? 'without_tax';
                $discountPct = floatval($item['discount_percent'] ?? 0);
                $discountAmt = floatval($item['discount_amount'] ?? 0);
                $sellingPrice = floatval($item['selling_price'] ?? 0);
                $sellingPricePerUnit = trim($item['selling_price_per_unit'] ?? '');
                $qty = floatval($item['quantity'] ?? 0);
                $unit = trim($item['unit'] ?? 'Piece');
                $gstPct = floatval($item['gst_percentage'] ?? 0);

                $productId = $item['product_id'] ?? null;
                $categoryId = $item['category_id'] ?? null;
                $subcategoryId = $item['subcategory_id'] ?? null;
                $brandId = $item['brand_id'] ?? null;

                $rawSub = $qty * $price;
                if ($discountPct > 0) {
                    $discountAmt = $rawSub * ($discountPct / 100);
                }
                $lineTaxable = max(0, $rawSub - $discountAmt);

                if ($taxMode === 'with_tax') {
                    $inclusiveTotal = max(0, ($qty * $price) - $discountAmt);
                    $lineTax = $inclusiveTotal - ($inclusiveTotal / (1 + ($gstPct / 100)));
                    $lineTotal = $inclusiveTotal;
                } else {
                    $lineTax = $lineTaxable * ($gstPct / 100);
                    $lineTotal = $lineTaxable + $lineTax;
                }

                // Dynamic Category / Subcategory / Brand resolution
                if (!$productId) {
                    if (!$categoryId && !empty($categoryName)) {
                        $cat = Category::firstOrCreate(
                            ['company_id' => $companyId, 'name' => $categoryName, 'is_deleted' => 0],
                            ['status' => 'active']
                        );
                        $categoryId = $cat->id;
                    }

                    if (!$subcategoryId && !empty($subcategoryName) && $categoryId) {
                        $sub = Subcategory::firstOrCreate(
                            ['company_id' => $companyId, 'category_id' => $categoryId, 'name' => $subcategoryName, 'is_deleted' => 0],
                            ['status' => 'active']
                        );
                        $subcategoryId = $sub->id;
                    }

                    if (!$brandId && !empty($brandName)) {
                        $brand = Brand::firstOrCreate(
                            ['company_id' => $companyId, 'name' => $brandName, 'is_deleted' => 0],
                            [
                                'category_id' => $categoryId ?: 0,
                                'subcategory_id' => $subcategoryId ?: 0,
                                'status' => 'active'
                            ]
                        );
                        $brandId = $brand->id;
                    }

                    $existingProd = Product::where('company_id', $companyId)
                        ->where('is_deleted', 0)
                        ->where(function($q) use ($productName, $productCode, $barcode) {
                            $q->whereRaw('LOWER(product_name) = ?', [strtolower($productName)]);
                            if ($productCode) $q->orWhere('product_code', $productCode);
                            if ($barcode) $q->orWhere('barcode', $barcode);
                        })->first();

                    if ($existingProd) {
                        $productId = $existingProd->id;
                    } else {
                        $newProd = Product::create([
                            'product_name' => $productName,
                            'product_code' => $productCode ?: ('PRD' . rand(100000, 999999)),
                            'barcode' => $barcode ?: null,
                            'category_id' => $categoryId,
                            'subcategory_id' => $subcategoryId,
                            'brand_id' => $brandId,
                            'price' => $sellingPrice > 0 ? $sellingPrice : $price,
                            'stock' => 0,
                            'unit' => $unit,
                            'gst_percentage' => $gstPct,
                            'company_id' => $companyId,
                            'supplier_id' => $supplierId,
                            'status' => 'active',
                            'is_deleted' => 0
                        ]);
                        $productId = $newProd->id;
                    }
                }

                // Increment catalog stock
                if ($productId) {
                    $prod = Product::find($productId);
                    if ($prod) {
                        $prod->increment('stock', $qty);
                        if ($sellingPrice > 0) {
                            $prod->update(['price' => $sellingPrice]);
                        }
                    }
                }

                // Create PurchaseItem
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $productId,
                    'product_name' => $productName,
                    'product_code' => $productCode,
                    'barcode' => $barcode,
                    'category_name' => $categoryName,
                    'subcategory_name' => $subcategoryName,
                    'brand_name' => $brandName,
                    'category_id' => $categoryId,
                    'subcategory_id' => $subcategoryId,
                    'brand_id' => $brandId,
                    'price' => $price,
                    'tax_mode' => $taxMode,
                    'discount_percent' => $discountPct,
                    'discount_amount' => $discountAmt,
                    'selling_price' => $sellingPrice,
                    'selling_price_per_unit' => $sellingPricePerUnit ?: null,
                    'quantity' => $qty,
                    'unit' => $unit,
                    'gst_percentage' => $gstPct,
                    'tax_amount' => $lineTax,
                    'total_amount' => $lineTotal
                ]);
            }

            // Record initial payment if paid_amount > 0
            if ($paidAmount > 0) {
                PurchasePayment::create([
                    'purchase_id' => $purchase->id,
                    'company_id' => $companyId,
                    'amount' => $paidAmount,
                    'payment_method' => strtolower($paymentType),
                    'payment_date' => $purchaseDate,
                    'notes' => 'Initial payment upon invoice submission'
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Purchase submitted successfully. Stocks updated.',
                'purchase_id' => $purchase->id
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => false,
                'message' => 'Error finalizing purchase: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get list of purchases.
     */
    public function getPurchases(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $supplierId = intval($request->query('supplier_id', 0));
        $status = $request->query('status');

        if (!$companyId) {
            return response()->json([
                'status' => true,
                'data' => []
            ]);
        }

        $query = DB::table('purchases as p')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id')
            ->select('p.*', 's.supplier_name', 's.gst_number as supplier_gstin')
            ->where('p.company_id', $companyId);

        if (!empty($startDate)) {
            $query->whereDate('p.purchase_date', '>=', $startDate);
        }
        if (!empty($endDate)) {
            $query->whereDate('p.purchase_date', '<=', $endDate);
        }
        if ($supplierId > 0) {
            $query->where('p.supplier_id', $supplierId);
        }
        if (!empty($status)) {
            $query->where('p.status', $status);
        }

        $purchases = $query->orderBy('p.id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data' => $purchases
        ]);
    }

    /**
     * Get purchase details by ID.
     */
    public function getPurchaseById(Request $request)
    {
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $purchase = Purchase::with(['supplier', 'items'])->find($id);

        if (!$purchase) {
            return response()->json([
                'status' => false,
                'message' => 'Purchase record not found'
            ]);
        }

        return response()->json([
            'status' => true,
            'data' => $purchase
        ]);
    }

    /**
     * Delete draft purchase.
     */
    public function deletePurchase(Request $request)
    {
        $id = intval($request->input('id', 0));
        $purchase = Purchase::find($id);

        if (!$purchase) {
            return response()->json(['status' => false, 'message' => 'Purchase not found']);
        }

        if ($purchase->status === 'submitted') {
            return response()->json(['status' => false, 'message' => 'Cannot delete a submitted purchase invoice']);
        }

        $purchase->delete();

        return response()->json([
            'status' => true,
            'message' => 'Purchase draft deleted successfully'
        ]);
    }

    /**
     * Record a payment towards a purchase invoice balance.
     */
    public function payPurchase(Request $request)
    {
        $purchaseId = intval($request->input('purchase_id', 0));
        $amount = floatval($request->input('amount', 0));
        $paymentMethod = $request->input('payment_method', 'cash');
        $paymentDate = $request->input('payment_date', date('Y-m-d'));
        $notes = $request->input('notes', '');

        if ($purchaseId <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Purchase ID']);
        }
        if ($amount <= 0) {
            return response()->json(['status' => false, 'message' => 'Payment amount must be greater than 0']);
        }

        $purchase = Purchase::find($purchaseId);
        if (!$purchase) {
            return response()->json(['status' => false, 'message' => 'Purchase invoice not found']);
        }

        if ($purchase->status !== 'submitted') {
            return response()->json(['status' => false, 'message' => 'Cannot make payment for a draft purchase']);
        }

        $currentPaid = floatval($purchase->paid_amount);
        $currentBalance = floatval($purchase->balance_amount);

        if ($currentBalance <= 0) {
            return response()->json(['status' => false, 'message' => 'This purchase has already been fully paid']);
        }

        $newPaid = $currentPaid + $amount;
        $newBalance = max(0.00, $currentBalance - $amount);

        DB::beginTransaction();
        try {
            $purchase->update([
                'paid_amount' => $newPaid,
                'balance_amount' => $newBalance
            ]);

            PurchasePayment::create([
                'purchase_id' => $purchase->id,
                'company_id' => $purchase->company_id,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'payment_date' => $paymentDate,
                'notes' => $notes
            ]);

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Payment recorded successfully',
                'paid_amount' => $newPaid,
                'balance_amount' => $newBalance
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => false,
                'message' => 'Error recording payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get payment history for a specific purchase invoice.
     */
    public function getPurchasePayments(Request $request)
    {
        $purchaseId = intval($request->query('purchase_id') ?: $request->input('purchase_id', 0));
        if ($purchaseId <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Purchase ID']);
        }

        $payments = PurchasePayment::where('purchase_id', $purchaseId)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data' => $payments
        ]);
    }

    /**
     * Get ALL payment history for a specific supplier (across all their invoices).
     */
    public function getSupplierPayments(Request $request)
    {
        $supplierId = intval($request->query('supplier_id') ?: $request->input('supplier_id', 0));
        if ($supplierId <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Supplier ID']);
        }

        $payments = DB::table('purchase_payments as pp')
            ->join('purchases as p', 'pp.purchase_id', '=', 'p.id')
            ->where('p.supplier_id', $supplierId)
            ->select(
                'pp.id',
                'pp.purchase_id',
                'pp.amount',
                'pp.payment_method',
                'pp.payment_date',
                'pp.notes',
                'pp.created_at',
                'p.purchase_no',
                'p.total_amount as invoice_total',
                'p.purchase_date as invoice_date'
            )
            ->orderBy('pp.payment_date', 'desc')
            ->orderBy('pp.id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data'   => $payments
        ]);
    }

    /**
     * Pay bulk amount for a supplier – FIFO distribution across all pending invoices.
     */
    public function paySupplierBulk(Request $request)
    {
        $supplierId    = intval($request->input('supplier_id', 0));
        $totalAmount   = floatval($request->input('amount', 0));
        $paymentMethod = $request->input('payment_method', 'cash');
        $paymentDate   = $request->input('payment_date', date('Y-m-d'));
        $notes         = $request->input('notes', '');

        if ($supplierId <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Supplier ID']);
        }
        if ($totalAmount <= 0) {
            return response()->json(['status' => false, 'message' => 'Payment amount must be greater than 0']);
        }

        // Fetch all pending invoices for this supplier, oldest first (FIFO)
        $pendingInvoices = Purchase::where('supplier_id', $supplierId)
            ->where('status', 'submitted')
            ->where('balance_amount', '>', 0)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        if ($pendingInvoices->isEmpty()) {
            return response()->json(['status' => false, 'message' => 'No pending invoices found for this supplier']);
        }

        $remaining = $totalAmount;
        $applied   = [];

        DB::beginTransaction();
        try {
            foreach ($pendingInvoices as $invoice) {
                if ($remaining <= 0) break;

                $balance  = floatval($invoice->balance_amount);
                $applying = min($remaining, $balance);
                $remaining -= $applying;

                $newPaid    = floatval($invoice->paid_amount) + $applying;
                $newBalance = max(0.00, $balance - $applying);

                $invoice->update([
                    'paid_amount'    => $newPaid,
                    'balance_amount' => $newBalance
                ]);

                PurchasePayment::create([
                    'purchase_id'    => $invoice->id,
                    'company_id'     => $invoice->company_id,
                    'amount'         => $applying,
                    'payment_method' => $paymentMethod,
                    'payment_date'   => $paymentDate,
                    'notes'          => $notes
                ]);

                $applied[] = [
                    'purchase_id'   => $invoice->id,
                    'purchase_no'   => $invoice->purchase_no,
                    'applied'       => $applying,
                    'new_balance'   => $newBalance
                ];
            }

            DB::commit();

            return response()->json([
                'status'        => true,
                'message'       => 'Bulk payment recorded and distributed across ' . count($applied) . ' invoice(s)',
                'applied'       => $applied,
                'leftover'      => max(0, $remaining)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error recording bulk payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get all Payment-Out records with supplier and purchase details.
     */
    public function getPaymentOuts(Request $request)
    {
        $this->ensureSchemaUpdated();

        $companyId  = intval($request->query('company_id') ?: $request->input('company_id', 0));
        $supplierId = intval($request->query('supplier_id') ?: $request->input('supplier_id', 0));
        $fromDate   = $request->query('from_date');
        $toDate     = $request->query('to_date');

        $query = DB::table('purchase_payments as pp')
            ->leftJoin('purchases as p', 'pp.purchase_id', '=', 'p.id')
            ->leftJoin('suppliers as s', function($join) {
                $join->on('p.supplier_id', '=', 's.id')
                     ->orWhere('pp.supplier_id', '=', 's.id');
            })
            ->select(
                'pp.id',
                'pp.purchase_id',
                'pp.company_id',
                'pp.amount',
                'pp.payment_method',
                'pp.payment_date',
                'pp.notes',
                'pp.created_at',
                'pp.updated_at',
                DB::raw("COALESCE(pp.receipt_no, CONCAT('REC-', pp.id)) as receipt_no"),
                'p.purchase_no',
                'p.total_amount as invoice_total',
                'p.balance_amount as invoice_balance',
                's.id as supplier_id',
                's.supplier_name',
                's.mobile_number as supplier_phone'
            );

        if ($companyId > 0) {
            $query->where(function($q) use ($companyId) {
                $q->where('pp.company_id', $companyId)
                  ->orWhere('p.company_id', $companyId);
            });
        }
        if ($supplierId > 0) {
            $query->where(function($q) use ($supplierId) {
                $q->where('p.supplier_id', $supplierId)
                  ->orWhere('pp.supplier_id', $supplierId);
            });
        }
        if (!empty($fromDate) && !empty($toDate)) {
            $query->whereBetween('pp.payment_date', [$fromDate, $toDate]);
        }

        $payments = $query->orderBy('pp.payment_date', 'desc')
            ->orderBy('pp.id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data'   => $payments
        ]);
    }

    /**
     * Create a new Payment-Out record.
     */
    public function createPaymentOut(Request $request)
    {
        $this->ensureSchemaUpdated();

        $companyId     = intval($request->input('company_id', 0));
        $supplierId    = intval($request->input('supplier_id', 0));
        $totalAmount   = floatval($request->input('amount', 0));
        $paymentMethod = $request->input('payment_method', 'cash');
        $paymentDate   = $request->input('payment_date', date('Y-m-d'));
        $receiptNo     = trim($request->input('receipt_no', ''));
        $notes         = trim($request->input('notes', ''));

        if ($supplierId <= 0) {
            return response()->json(['status' => false, 'message' => 'Please select a Supplier / Party']);
        }
        if ($totalAmount <= 0) {
            return response()->json(['status' => false, 'message' => 'Payment amount must be greater than 0']);
        }

        $supplier = Supplier::find($supplierId);
        if (!$supplier) {
            return response()->json(['status' => false, 'message' => 'Supplier not found']);
        }

        if (!$companyId) {
            $companyId = $supplier->company_id;
        }

        DB::beginTransaction();
        try {
            $pendingInvoices = Purchase::where('supplier_id', $supplierId)
                ->where('status', 'submitted')
                ->where('balance_amount', '>', 0)
                ->orderBy('purchase_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $remaining = $totalAmount;
            $applied   = [];

            if ($pendingInvoices->isNotEmpty()) {
                foreach ($pendingInvoices as $invoice) {
                    if ($remaining <= 0) break;

                    $balance  = floatval($invoice->balance_amount);
                    $applying = min($remaining, $balance);
                    $remaining -= $applying;

                    $newPaid    = floatval($invoice->paid_amount) + $applying;
                    $newBalance = max(0.00, $balance - $applying);

                    $invoice->update([
                        'paid_amount'    => $newPaid,
                        'balance_amount' => $newBalance
                    ]);

                    PurchasePayment::create([
                        'purchase_id'    => $invoice->id,
                        'company_id'     => $companyId,
                        'supplier_id'    => $supplierId,
                        'receipt_no'     => $receiptNo ?: ('REC-' . time()),
                        'amount'         => $applying,
                        'payment_method' => strtolower($paymentMethod),
                        'payment_date'   => $paymentDate,
                        'notes'          => $notes ?: 'Payment-Out voucher settlement'
                    ]);

                    $applied[] = [
                        'purchase_id' => $invoice->id,
                        'purchase_no' => $invoice->purchase_no,
                        'applied'     => $applying,
                        'new_balance' => $newBalance
                    ];
                }
            }

            if ($remaining > 0) {
                $firstPurchase = Purchase::where('supplier_id', $supplierId)->first();
                $purchaseId    = $firstPurchase ? $firstPurchase->id : null;

                PurchasePayment::create([
                    'purchase_id'    => $purchaseId ?: 0,
                    'company_id'     => $companyId,
                    'supplier_id'    => $supplierId,
                    'receipt_no'     => $receiptNo ?: ('REC-' . time()),
                    'amount'         => $remaining,
                    'payment_method' => strtolower($paymentMethod),
                    'payment_date'   => $paymentDate,
                    'notes'          => $notes ? ($notes . ' (Advance)') : 'Advance payment to supplier'
                ]);
            }

            DB::commit();

            return response()->json([
                'status'           => true,
                'message'          => 'Payment-Out recorded successfully',
                'applied'          => $applied,
                'leftover_advance' => $remaining
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error recording Payment-Out: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Delete a Payment-Out voucher and revert invoice balance.
     */
    public function deletePaymentOut(Request $request)
    {
        $id = intval($request->input('id', 0));
        if ($id <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Payment ID']);
        }

        $payment = PurchasePayment::find($id);
        if (!$payment) {
            return response()->json(['status' => false, 'message' => 'Payment record not found']);
        }

        DB::beginTransaction();
        try {
            if ($payment->purchase_id > 0) {
                $purchase = Purchase::find($payment->purchase_id);
                if ($purchase) {
                    $revertedPaid = max(0.00, floatval($purchase->paid_amount) - floatval($payment->amount));
                    $revertedBalance = min(floatval($purchase->total_amount), floatval($purchase->balance_amount) + floatval($payment->amount));
                    $purchase->update([
                        'paid_amount'    => $revertedPaid,
                        'balance_amount' => $revertedBalance
                    ]);
                }
            }

            $payment->delete();
            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Payment-Out voucher deleted successfully and purchase balance restored.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error deleting payment voucher: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Update an existing Payment-Out voucher.
     */
    public function updatePaymentOut(Request $request)
    {
        $id            = intval($request->input('id', 0));
        $newAmount     = floatval($request->input('amount', 0));
        $paymentMethod = $request->input('payment_method', 'cash');
        $paymentDate   = $request->input('payment_date', date('Y-m-d'));
        $receiptNo     = trim($request->input('receipt_no', ''));
        $notes         = trim($request->input('notes', ''));

        if ($id <= 0) {
            return response()->json(['status' => false, 'message' => 'Invalid Payment ID']);
        }
        if ($newAmount <= 0) {
            return response()->json(['status' => false, 'message' => 'Payment amount must be greater than 0']);
        }

        $payment = PurchasePayment::find($id);
        if (!$payment) {
            return response()->json(['status' => false, 'message' => 'Payment record not found']);
        }

        DB::beginTransaction();
        try {
            $oldAmount = floatval($payment->amount);
            $diff      = $newAmount - $oldAmount;

            if ($payment->purchase_id > 0) {
                $purchase = Purchase::find($payment->purchase_id);
                if ($purchase) {
                    $newPaid    = max(0.00, floatval($purchase->paid_amount) + $diff);
                    $newBalance = max(0.00, floatval($purchase->total_amount) - $newPaid);
                    $purchase->update([
                        'paid_amount'    => $newPaid,
                        'balance_amount' => $newBalance
                    ]);
                }
            }

            $payment->update([
                'amount'         => $newAmount,
                'payment_method' => strtolower($paymentMethod),
                'payment_date'   => $paymentDate,
                'receipt_no'     => $receiptNo ?: $payment->receipt_no,
                'notes'          => $notes
            ]);

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Payment-Out updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error updating Payment-Out: ' . $e->getMessage()
            ]);
        }
    }
}
