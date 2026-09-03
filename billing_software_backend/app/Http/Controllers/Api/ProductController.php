<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Brand;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function add(Request $request)
    {
        $product_name   = trim($request->input('product_name', ''));
        $product_code   = trim($request->input('product_code', ''));
        $category_id    = intval($request->input('category_id', 0));
        $subcategory_id = intval($request->input('subcategory_id', 0));
        $brand_id       = intval($request->input('brand_id', 0));
        $price          = floatval($request->input('price', 0));
        $stock          = intval($request->input('stock', 0));
        $barcode        = trim($request->input('barcode', ''));
        $unit           = trim($request->input('unit', ''));
        $gst_percentage = floatval($request->input('gst_percentage', 0));
        $company_id     = intval($request->input('company_id', 0));
        $supplier_id    = intval($request->input('supplier_id', 0));
        $sale_price     = floatval($request->input('sale_price', 0));
        $purchase_price = floatval($request->input('purchase_price', 0));

        $new_category_name    = trim($request->input('new_category_name', ''));
        $new_subcategory_name = trim($request->input('new_subcategory_name', ''));
        $new_brand_name       = trim($request->input('new_brand_name', ''));

        if (!$product_name || !$company_id) {
            return response()->json([
                "status" => false,
                "message" => "Product Name and Company ID required"
            ]);
        }

        // Inline Category Creation / Resolution
        if (($category_id <= 0 || !empty($new_category_name)) && !empty($new_category_name)) {
            $cat = Category::where('company_id', $company_id)
                ->whereRaw('LOWER(name) = ?', [strtolower($new_category_name)])
                ->where('is_deleted', 0)
                ->first();
            if (!$cat) {
                $cat = Category::create([
                    'name' => $new_category_name,
                    'company_id' => $company_id,
                    'status' => 'active',
                    'is_deleted' => 0
                ]);
            }
            $category_id = $cat->id;
        }

        // Inline Subcategory Creation / Resolution
        if (($subcategory_id <= 0 || !empty($new_subcategory_name)) && !empty($new_subcategory_name)) {
            $subcat = Subcategory::where('company_id', $company_id)
                ->where('category_id', $category_id)
                ->whereRaw('LOWER(name) = ?', [strtolower($new_subcategory_name)])
                ->where('is_deleted', 0)
                ->first();
            if (!$subcat) {
                $subcat = Subcategory::create([
                    'name' => $new_subcategory_name,
                    'category_id' => $category_id,
                    'company_id' => $company_id,
                    'status' => 'active',
                    'is_deleted' => 0
                ]);
            }
            $subcategory_id = $subcat->id;
        }

        // Inline Brand Creation / Resolution
        if (($brand_id <= 0 || !empty($new_brand_name)) && !empty($new_brand_name)) {
            $brd = Brand::where('company_id', $company_id)
                ->whereRaw('LOWER(name) = ?', [strtolower($new_brand_name)])
                ->where('is_deleted', 0)
                ->first();
            if (!$brd) {
                $brd = Brand::create([
                    'name' => $new_brand_name,
                    'category_id' => $category_id,
                    'subcategory_id' => $subcategory_id,
                    'company_id' => $company_id,
                    'status' => 'active',
                    'is_deleted' => 0
                ]);
            }
            $brand_id = $brd->id;
        }

        $product = Product::create([
            'product_name' => $product_name,
            'product_code' => $product_code ?: null,
            'category_id' => $category_id ?: null,
            'subcategory_id' => $subcategory_id ?: null,
            'brand_id' => $brand_id ?: null,
            'price' => $price,
            'sale_price' => $sale_price ?: null,
            'purchase_price' => $purchase_price ?: null,
            'stock' => $stock,
            'barcode' => $barcode ?: null,
            'unit' => $unit ?: null,
            'gst_percentage' => $gst_percentage,
            'company_id' => $company_id,
            'supplier_id' => $supplier_id ?: null,
            'status' => 'active',
            'is_deleted' => 0
        ]);

        return response()->json([
            "status" => true,
            "message" => "Product created successfully",
            "data" => $product
        ]);
    }

    public function delete(Request $request)
    {
        $id = intval($request->input('id', 0));
        if (!$id) {
            return response()->json([
                "status" => false,
                "message" => "ID required"
            ]);
        }

        Product::where('id', $id)->delete();

        return response()->json([
            "status" => true,
            "message" => "Product permanently deleted"
        ]);
    }

    public function get(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $brand_id = intval($request->input('brand_id') ?: $request->query('brand_id', 0));
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$company_id && $admin_id > 0) {
            $comp = DB::table('companies')->where('admin_id', $admin_id)->first();
            if ($comp) {
                $company_id = $comp->id;
            }
        }

        $query = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('subcategories as sc', 'p.subcategory_id', '=', 'sc.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('companies as comp', 'p.company_id', '=', 'comp.id')
            ->leftJoin('suppliers as sup', 'p.supplier_id', '=', 'sup.id')
            ->select(
                'p.*',
                'c.name as category_name',
                'sc.name as subcategory_name',
                'b.name as brand_name',
                'comp.company_name',
                'comp.gstin as company_gstin',
                'comp.gst_type',
                'sup.supplier_name'
            )
            ->where('p.is_deleted', 0);

        if ($company_id > 0) {
            $query->where('p.company_id', $company_id);
        }

        if ($brand_id > 0) {
            $query->where('p.brand_id', $brand_id);
        }

        $products = $query->orderBy('p.id', 'desc')->get();

        return response()->json([
            "status" => true,
            "data" => $products
        ]);
    }

    public function getById(Request $request)
    {
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                "status" => false,
                "message" => "Product not found"
            ]);
        }

        return response()->json([
            "status" => true,
            "data" => $product
        ]);
    }

    public function getBySupplier(Request $request)
    {
        $supplier_id = intval($request->input('supplier_id') ?: $request->query('supplier_id', 0));

        if (!$supplier_id) {
            return response()->json(["status" => false, "message" => "supplier_id required"]);
        }

        $products = DB::table('products as p')
            ->leftJoin('companies as c', 'p.company_id', '=', 'c.id')
            ->leftJoin('categories as cat', 'p.category_id', '=', 'cat.id')
            ->select('p.*', 'c.company_name', 'cat.name as category_name')
            ->where('p.supplier_id', $supplier_id)
            ->where('p.is_deleted', 0)
            ->orderBy('p.id', 'desc')
            ->get();

        return response()->json(["status" => true, "data" => $products]);
    }

    public function toggleStatusProduct(Request $request)
    {
        $id = intval($request->input('id', 0));
        $status = $request->input('status', '');

        if (!$id || !$status) {
            return response()->json(["status" => false, "message" => "Invalid data"]);
        }

        Product::where('id', $id)->update(['status' => $status]);

        return response()->json(["status" => true, "message" => "Status updated successfully"]);
    }

    public function getByCode(Request $request)
    {
        $company_id   = intval($request->query('company_id', 0));
        $product_code = trim($request->query('product_code', ''));

        if (!$company_id || !$product_code) {
            return response()->json(["status" => false, "message" => "company_id and product_code required"]);
        }

        $product = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('subcategories as sc', 'p.subcategory_id', '=', 'sc.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->select(
                'p.id',
                'p.product_name',
                'p.product_code',
                'p.barcode',
                'p.price',
                'p.unit',
                'p.gst_percentage',
                'p.category_id',
                'p.subcategory_id',
                'p.brand_id',
                'c.name as category_name',
                'sc.name as subcategory_name',
                'b.name as brand_name'
            )
            ->where('p.company_id', $company_id)
            ->where('p.product_code', $product_code)
            ->where('p.is_deleted', 0)
            ->first();

        if (!$product) {
            return response()->json(["status" => false, "message" => "Product not found"]);
        }

        return response()->json(["status" => true, "data" => $product]);
    }

    public function update(Request $request)
    {
        $id             = intval($request->input('id', 0));
        $product_name   = trim($request->input('product_name', ''));
        $product_code   = trim($request->input('product_code', ''));
        $category_id    = intval($request->input('category_id', 0));
        $subcategory_id = intval($request->input('subcategory_id', 0));
        $brand_id       = intval($request->input('brand_id', 0));
        $price          = floatval($request->input('price', 0));
        $stock          = intval($request->input('stock', 0));
        $barcode        = trim($request->input('barcode', ''));
        $unit           = trim($request->input('unit', ''));
        $gst_percentage = floatval($request->input('gst_percentage', 0));
        $supplier_id    = intval($request->input('supplier_id', 0));
        $sale_price     = floatval($request->input('sale_price', 0));
        $purchase_price = floatval($request->input('purchase_price', 0));

        if (!$id || !$product_name) {
            return response()->json(["status" => false, "message" => "ID and Product Name required"]);
        }

        $updateData = [
            'product_name' => $product_name,
            'product_code' => $product_code ?: null,
            'category_id' => $category_id ?: null,
            'subcategory_id' => $subcategory_id ?: null,
            'brand_id' => $brand_id ?: null,
            'price' => $price,
            'stock' => $stock,
            'barcode' => $barcode ?: null,
            'unit' => $unit ?: null,
            'gst_percentage' => $gst_percentage,
            'supplier_id' => $supplier_id ?: null,
            'sale_price' => $sale_price ?: null,
            'purchase_price' => $purchase_price ?: null,
        ];

        Product::where('id', $id)->update($updateData);

        return response()->json(["status" => true, "message" => "Product updated successfully"]);
    }

    public function getProductSaleHistory(Request $request)
    {
        $product_id = intval($request->query('product_id', 0));

        if (!$product_id) {
            return response()->json(["status" => false, "message" => "product_id required"]);
        }

        $invoices = DB::table('invoices')
            ->orderBy('id', 'desc')
            ->get();

        $saleHistory = [];

        foreach ($invoices as $invoice) {
            $products = json_decode($invoice->products, true);
            if (!is_array($products)) continue;

            foreach ($products as $item) {
                if (intval($item['product_id'] ?? 0) === $product_id) {
                    $qty = intval($item['quantity'] ?? 1);
                    $price = floatval($item['price'] ?? 0);
                    $lineTotal = isset($item['total']) ? floatval($item['total']) : $price * $qty;

                    $saleHistory[] = [
                        'invoice_no' => $invoice->invoice_no,
                        'customer_name' => $invoice->customer_name ?? '-',
                        'quantity' => $qty,
                        'price' => $price,
                        'total' => $lineTotal,
                        'date' => $invoice->created_at,
                    ];
                    break;
                }
            }
        }

        return response()->json(["status" => true, "data" => $saleHistory]);
    }
}
