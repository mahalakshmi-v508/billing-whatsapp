<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // Company
        DB::table('companies')->insert([
            'company_name' => 'ABC Trading Co.',
            'owner_name' => 'Rajesh Kumar',
            'owner_email' => 'rajesh@abctrading.com',
            'owner_password' => bcrypt('password123'),
            'company_address' => '123 Main Road, Chennai, Tamil Nadu - 600001',
            'company_code' => 'ABC001',
            'gstin' => '33AABCA1234F1Z5',
            'phone' => '9876543210',
            'gst_type' => 'with_gst',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $companyId = 1;

        // Categories
        $categories = [
            ['name' => 'Electronics', 'company_id' => $companyId, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Groceries', 'company_id' => $companyId, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Clothing', 'company_id' => $companyId, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Stationery', 'company_id' => $companyId, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Home & Kitchen', 'company_id' => $companyId, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ];
        DB::table('categories')->insert($categories);

        // Subcategories
        $subcategories = [
            ['name' => 'Mobile Phones', 'category_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Laptops', 'category_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Accessories', 'category_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Rice & Flour', 'category_id' => 2, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Snacks', 'category_id' => 2, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Beverages', 'category_id' => 2, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Mens Wear', 'category_id' => 3, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Womens Wear', 'category_id' => 3, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Pens & Pencils', 'category_id' => 4, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Notebooks', 'category_id' => 4, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Cookware', 'category_id' => 5, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Kitchen Tools', 'category_id' => 5, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
        ];
        DB::table('subcategories')->insert($subcategories);

        // Brands
        $brands = [
            ['name' => 'Samsung', 'category_id' => 1, 'subcategory_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Apple', 'category_id' => 1, 'subcategory_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'OnePlus', 'category_id' => 1, 'subcategory_id' => 1, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'HP', 'category_id' => 1, 'subcategory_id' => 2, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Dell', 'category_id' => 1, 'subcategory_id' => 2, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Boat', 'category_id' => 1, 'subcategory_id' => 3, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Aashirvaad', 'category_id' => 2, 'subcategory_id' => 4, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Lays', 'category_id' => 2, 'subcategory_id' => 5, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Coca Cola', 'category_id' => 2, 'subcategory_id' => 6, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Peter England', 'category_id' => 3, 'subcategory_id' => 7, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Allen Solly', 'category_id' => 3, 'subcategory_id' => 8, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Reynolds', 'category_id' => 4, 'subcategory_id' => 9, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Classmate', 'category_id' => 4, 'subcategory_id' => 10, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Prestige', 'category_id' => 5, 'subcategory_id' => 11, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
            ['name' => 'Pigeon', 'category_id' => 5, 'subcategory_id' => 12, 'company_id' => $companyId, 'status' => 'active', 'created_at' => now()],
        ];
        DB::table('brands')->insert($brands);

        // Suppliers
        $suppliers = [
            [
                'company_id' => $companyId, 'supplier_name' => 'TechHub Distributors',
                'mobile_number' => '9800100001', 'email' => 'techhub@gmail.com',
                'gst_number' => '33BBBFT1234G1Z1', 'address' => 'T Nagar, Chennai',
                'city' => 'Chennai', 'district' => 'Chennai', 'state' => 'Tamil Nadu',
                'pincode' => '600017', 'country' => 'India', 'status' => 'active',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'company_id' => $companyId, 'supplier_name' => 'Fresh Foods Wholesale',
                'mobile_number' => '9800100002', 'email' => 'freshfoods@gmail.com',
                'gst_number' => '33CCCFW5678H1Z2', 'address' => 'Anna Nagar, Chennai',
                'city' => 'Chennai', 'district' => 'Chennai', 'state' => 'Tamil Nadu',
                'pincode' => '600040', 'country' => 'India', 'status' => 'active',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'company_id' => $companyId, 'supplier_name' => 'Style Mart Exports',
                'mobile_number' => '9800100003', 'email' => 'stylemart@gmail.com',
                'gst_number' => '33DDDSE9012I1Z3', 'address' => 'Sowcarpet, Chennai',
                'city' => 'Chennai', 'district' => 'Chennai', 'state' => 'Tamil Nadu',
                'pincode' => '600079', 'country' => 'India', 'status' => 'active',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'company_id' => $companyId, 'supplier_name' => 'Office Supplies Co.',
                'mobile_number' => '9800100004', 'email' => 'officesupplies@gmail.com',
                'gst_number' => '33EEEOS3456J1Z4', 'address' => 'Ambattur, Chennai',
                'city' => 'Chennai', 'district' => 'Chennai', 'state' => 'Tamil Nadu',
                'pincode' => '600058', 'country' => 'India', 'status' => 'active',
                'created_at' => now(), 'updated_at' => now(),
            ],
        ];
        DB::table('suppliers')->insert($suppliers);

        $products = [
            // Electronics - Mobile Phones (unit: Pcs)
            ['product_name' => 'Samsung Galaxy S24', 'product_code' => 'SAM-S24', 'category_id' => 1, 'subcategory_id' => 1, 'brand_id' => 1, 'price' => 74999.00, 'sale_price' => 69999.00, 'purchase_price' => 62000.00, 'stock' => 25, 'barcode' => '8901234567001', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Samsung Galaxy A55', 'product_code' => 'SAM-A55', 'category_id' => 1, 'subcategory_id' => 1, 'brand_id' => 1, 'price' => 39999.00, 'sale_price' => 36999.00, 'purchase_price' => 30000.00, 'stock' => 40, 'barcode' => '8901234567002', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Apple iPhone 15', 'product_code' => 'APL-IP15', 'category_id' => 1, 'subcategory_id' => 1, 'brand_id' => 2, 'price' => 79900.00, 'sale_price' => 74900.00, 'purchase_price' => 68000.00, 'stock' => 15, 'barcode' => '8901234567003', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'OnePlus 12', 'product_code' => 'OP-12', 'category_id' => 1, 'subcategory_id' => 1, 'brand_id' => 3, 'price' => 64999.00, 'sale_price' => 59999.00, 'purchase_price' => 52000.00, 'stock' => 20, 'barcode' => '8901234567004', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Electronics - Laptops (unit: Pcs)
            ['product_name' => 'HP Pavilion 15', 'product_code' => 'HP-PAV15', 'category_id' => 1, 'subcategory_id' => 2, 'brand_id' => 4, 'price' => 62999.00, 'sale_price' => 58999.00, 'purchase_price' => 50000.00, 'stock' => 10, 'barcode' => '8901234567005', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Dell Inspiron 14', 'product_code' => 'DEL-INS14', 'category_id' => 1, 'subcategory_id' => 2, 'brand_id' => 5, 'price' => 55999.00, 'sale_price' => 52999.00, 'purchase_price' => 45000.00, 'stock' => 8, 'barcode' => '8901234567006', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Electronics - Accessories (unit: Pcs)
            ['product_name' => 'Boat Airdopes 141', 'product_code' => 'BOT-AD141', 'category_id' => 1, 'subcategory_id' => 3, 'brand_id' => 6, 'price' => 1299.00, 'sale_price' => 1099.00, 'purchase_price' => 700.00, 'stock' => 100, 'barcode' => '8901234567007', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Boat Rockerz 450', 'product_code' => 'BOT-RK450', 'category_id' => 1, 'subcategory_id' => 3, 'brand_id' => 6, 'price' => 1799.00, 'sale_price' => 1499.00, 'purchase_price' => 900.00, 'stock' => 75, 'barcode' => '8901234567008', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Groceries - Rice & Flour (unit: kg)
            ['product_name' => 'Aashirvaad Atta 5kg', 'product_code' => 'AAS-AT5', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 310.00, 'sale_price' => 295.00, 'purchase_price' => 260.00, 'stock' => 200, 'barcode' => '8901234567009', 'unit' => 'kg', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Aashirvaad Atta 10kg', 'product_code' => 'AAS-AT10', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 580.00, 'sale_price' => 550.00, 'purchase_price' => 480.00, 'stock' => 100, 'barcode' => '8901234567010', 'unit' => 'kg', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Sona Masoori Rice 5kg', 'product_code' => 'SON-R5', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 350.00, 'sale_price' => 330.00, 'purchase_price' => 280.00, 'stock' => 150, 'barcode' => '8901234567030', 'unit' => 'kg', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Toor Dal 1kg', 'product_code' => 'TDL-1K', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 180.00, 'sale_price' => 170.00, 'purchase_price' => 145.00, 'stock' => 300, 'barcode' => '8901234567031', 'unit' => 'kg', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Groceries - Snacks (unit: g / Pcs)
            ['product_name' => 'Lays Classic Salted 52g', 'product_code' => 'LAY-CS52', 'category_id' => 2, 'subcategory_id' => 5, 'brand_id' => 8, 'price' => 20.00, 'sale_price' => 20.00, 'purchase_price' => 15.00, 'stock' => 500, 'barcode' => '8901234567011', 'unit' => 'g', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Lays Magic Masala 52g', 'product_code' => 'LAY-MM52', 'category_id' => 2, 'subcategory_id' => 5, 'brand_id' => 8, 'price' => 20.00, 'sale_price' => 20.00, 'purchase_price' => 15.00, 'stock' => 500, 'barcode' => '8901234567012', 'unit' => 'g', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Haldiram Aloo Bhujia 200g', 'product_code' => 'HAL-AB200', 'category_id' => 2, 'subcategory_id' => 5, 'brand_id' => 8, 'price' => 55.00, 'sale_price' => 55.00, 'purchase_price' => 40.00, 'stock' => 250, 'barcode' => '8901234567032', 'unit' => 'g', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Groceries - Beverages (unit: L / ml)
            ['product_name' => 'Coca Cola 750ml', 'product_code' => 'COC-750', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 40.00, 'sale_price' => 40.00, 'purchase_price' => 30.00, 'stock' => 300, 'barcode' => '8901234567013', 'unit' => 'ml', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Coca Cola 1L', 'product_code' => 'COC-1L', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 60.00, 'sale_price' => 60.00, 'purchase_price' => 45.00, 'stock' => 200, 'barcode' => '8901234567014', 'unit' => 'L', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Amul Milk 500ml', 'product_code' => 'AMU-M500', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 30.00, 'sale_price' => 30.00, 'purchase_price' => 24.00, 'stock' => 400, 'barcode' => '8901234567033', 'unit' => 'ml', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Parle Agro Frooti 1L', 'product_code' => 'PAR-FR1L', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 40.00, 'sale_price' => 40.00, 'purchase_price' => 30.00, 'stock' => 200, 'barcode' => '8901234567034', 'unit' => 'L', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Clothing - Mens (unit: Pcs)
            ['product_name' => 'Peter England Formal Shirt', 'product_code' => 'PE-FS01', 'category_id' => 3, 'subcategory_id' => 7, 'brand_id' => 10, 'price' => 1899.00, 'sale_price' => 1499.00, 'purchase_price' => 800.00, 'stock' => 50, 'barcode' => '8901234567015', 'unit' => 'Pcs', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Peter England Jeans', 'product_code' => 'PE-JN01', 'category_id' => 3, 'subcategory_id' => 7, 'brand_id' => 10, 'price' => 2499.00, 'sale_price' => 1999.00, 'purchase_price' => 1000.00, 'stock' => 35, 'barcode' => '8901234567016', 'unit' => 'Pcs', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Clothing - Womens (unit: Pcs)
            ['product_name' => 'Allen Solly Kurti', 'product_code' => 'AS-KT01', 'category_id' => 3, 'subcategory_id' => 8, 'brand_id' => 11, 'price' => 1599.00, 'sale_price' => 1299.00, 'purchase_price' => 600.00, 'stock' => 40, 'barcode' => '8901234567017', 'unit' => 'Pcs', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Stationery - Pens (unit: Pcs)
            ['product_name' => 'Reynolds Trimax 0.5mm', 'product_code' => 'REY-TX', 'category_id' => 4, 'subcategory_id' => 9, 'brand_id' => 12, 'price' => 35.00, 'sale_price' => 35.00, 'purchase_price' => 20.00, 'stock' => 300, 'barcode' => '8901234567018', 'unit' => 'Pcs', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 4, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Reynolds Click Gel 0.7mm', 'product_code' => 'REY-CG', 'category_id' => 4, 'subcategory_id' => 9, 'brand_id' => 12, 'price' => 25.00, 'sale_price' => 25.00, 'purchase_price' => 14.00, 'stock' => 500, 'barcode' => '8901234567019', 'unit' => 'Pcs', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 4, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Stationery - Notebooks (unit: Pcs)
            ['product_name' => 'Classmate Notebook 200pg', 'product_code' => 'CLA-NB200', 'category_id' => 4, 'subcategory_id' => 10, 'brand_id' => 13, 'price' => 65.00, 'sale_price' => 60.00, 'purchase_price' => 40.00, 'stock' => 400, 'barcode' => '8901234567020', 'unit' => 'Pcs', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 4, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Home & Kitchen - Cookware (unit: Pcs)
            ['product_name' => 'Prestige Pan 28cm', 'product_code' => 'PRE-PN28', 'category_id' => 5, 'subcategory_id' => 11, 'brand_id' => 14, 'price' => 899.00, 'sale_price' => 749.00, 'purchase_price' => 500.00, 'stock' => 30, 'barcode' => '8901234567021', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // Home & Kitchen - Kitchen Tools (unit: Pcs)
            ['product_name' => 'Pigeon Handy Mixer', 'product_code' => 'PGN-HM', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 1250.00, 'sale_price' => 1099.00, 'purchase_price' => 700.00, 'stock' => 20, 'barcode' => '8901234567022', 'unit' => 'Pcs', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // === EXTRA PRODUCTS with diverse units ===

            // unit: Litre (L)
            ['product_name' => 'Surf Excel Liquid Detergent 1L', 'product_code' => 'SRF-LD1L', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 199.00, 'sale_price' => 185.00, 'purchase_price' => 150.00, 'stock' => 100, 'barcode' => '8901234567040', 'unit' => 'L', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Coconut Oil 1L', 'product_code' => 'CNO-1L', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 180.00, 'sale_price' => 170.00, 'purchase_price' => 140.00, 'stock' => 150, 'barcode' => '8901234567041', 'unit' => 'L', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Millilitre (ml)
            ['product_name' => 'Harpic Power Plus 500ml', 'product_code' => 'HRP-PP500', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 99.00, 'sale_price' => 95.00, 'purchase_price' => 70.00, 'stock' => 200, 'barcode' => '8901234567042', 'unit' => 'ml', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Dettol Antiseptic 200ml', 'product_code' => 'DTL-AS200', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 85.00, 'sale_price' => 80.00, 'purchase_price' => 60.00, 'stock' => 250, 'barcode' => '8901234567043', 'unit' => 'ml', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Kilogram (kg)
            ['product_name' => 'Potato 1kg', 'product_code' => 'VEG-POT1K', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 30.00, 'sale_price' => 30.00, 'purchase_price' => 20.00, 'stock' => 500, 'barcode' => '8901234567044', 'unit' => 'kg', 'gst_percentage' => 0.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Onion 1kg', 'product_code' => 'VEG-ONI1K', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 35.00, 'sale_price' => 35.00, 'purchase_price' => 22.00, 'stock' => 400, 'barcode' => '8901234567045', 'unit' => 'kg', 'gst_percentage' => 0.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Chicken Breast 1kg', 'product_code' => 'MNT-CHB1K', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 280.00, 'sale_price' => 260.00, 'purchase_price' => 220.00, 'stock' => 50, 'barcode' => '8901234567046', 'unit' => 'kg', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Gram (g)
            ['product_name' => 'Nescafe Classic Coffee 100g', 'product_code' => 'NES-CC100', 'category_id' => 2, 'subcategory_id' => 6, 'brand_id' => 9, 'price' => 160.00, 'sale_price' => 155.00, 'purchase_price' => 120.00, 'stock' => 200, 'barcode' => '8901234567047', 'unit' => 'g', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Amul Butter 100g', 'product_code' => 'AMU-BT100', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 56.00, 'sale_price' => 56.00, 'purchase_price' => 45.00, 'stock' => 300, 'barcode' => '8901234567048', 'unit' => 'g', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Metre (m)
            ['product_name' => 'Cotton Fabric Roll', 'product_code' => 'FAB-COT-M', 'category_id' => 3, 'subcategory_id' => 7, 'brand_id' => 10, 'price' => 120.00, 'sale_price' => 110.00, 'purchase_price' => 80.00, 'stock' => 200, 'barcode' => '8901234567049', 'unit' => 'm', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Silk Saree Material 5m', 'product_code' => 'FAB-SLK5M', 'category_id' => 3, 'subcategory_id' => 8, 'brand_id' => 11, 'price' => 450.00, 'sale_price' => 420.00, 'purchase_price' => 300.00, 'stock' => 100, 'barcode' => '8901234567050', 'unit' => 'm', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Electric Wire 2core 100m', 'product_code' => 'WR-2C100', 'category_id' => 1, 'subcategory_id' => 3, 'brand_id' => 6, 'price' => 2200.00, 'sale_price' => 2000.00, 'purchase_price' => 1600.00, 'stock' => 50, 'barcode' => '8901234567051', 'unit' => 'm', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Centimetre (cm)
            ['product_name' => 'PVC Pipe 4inch 300cm', 'product_code' => 'PVC-4I300', 'category_id' => 5, 'subcategory_id' => 11, 'brand_id' => 14, 'price' => 350.00, 'sale_price' => 330.00, 'purchase_price' => 250.00, 'stock' => 80, 'barcode' => '8901234567052', 'unit' => 'cm', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Dozen (Doz)
            ['product_name' => 'Banana (Nendran) 1 Dozen', 'product_code' => 'FRU-BAN-D', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 60.00, 'sale_price' => 55.00, 'purchase_price' => 40.00, 'stock' => 100, 'barcode' => '8901234567053', 'unit' => 'Doz', 'gst_percentage' => 0.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Eggs 1 Dozen', 'product_code' => 'EGG-1DZ', 'category_id' => 2, 'subcategory_id' => 4, 'brand_id' => 7, 'price' => 72.00, 'sale_price' => 72.00, 'purchase_price' => 58.00, 'stock' => 200, 'barcode' => '8901234567054', 'unit' => 'Doz', 'gst_percentage' => 0.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Box (Box)
            ['product_name' => 'Madurai Original Match Box', 'product_code' => 'MATCH-BOX', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 25.00, 'sale_price' => 25.00, 'purchase_price' => 15.00, 'stock' => 500, 'barcode' => '8901234567055', 'unit' => 'Box', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 4, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Packet (Pkt)
            ['product_name' => 'Maggi Noodles 70g', 'product_code' => 'MAG-70G', 'category_id' => 2, 'subcategory_id' => 5, 'brand_id' => 8, 'price' => 14.00, 'sale_price' => 14.00, 'purchase_price' => 10.00, 'stock' => 600, 'barcode' => '8901234567056', 'unit' => 'Pkt', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['product_name' => 'Maggi Masala 2pack 70g x 4', 'product_code' => 'MAG-4P70', 'category_id' => 2, 'subcategory_id' => 5, 'brand_id' => 8, 'price' => 52.00, 'sale_price' => 50.00, 'purchase_price' => 38.00, 'stock' => 300, 'barcode' => '8901234567057', 'unit' => 'Pkt', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Roll
            ['product_name' => 'Nylon Thread Roll 500m', 'product_code' => 'THR-NYL500', 'category_id' => 3, 'subcategory_id' => 7, 'brand_id' => 10, 'price' => 45.00, 'sale_price' => 45.00, 'purchase_price' => 28.00, 'stock' => 150, 'barcode' => '8901234567058', 'unit' => 'Roll', 'gst_percentage' => 5.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Sheet
            ['product_name' => 'A4 Printing Paper 500 sheets', 'product_code' => 'A4-500SH', 'category_id' => 4, 'subcategory_id' => 10, 'brand_id' => 13, 'price' => 350.00, 'sale_price' => 330.00, 'purchase_price' => 280.00, 'stock' => 100, 'barcode' => '8901234567059', 'unit' => 'Sheet', 'gst_percentage' => 12.00, 'company_id' => $companyId, 'supplier_id' => 4, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Pair
            ['product_name' => 'Men Sports Shoes', 'product_code' => 'SHO-SPRT', 'category_id' => 3, 'subcategory_id' => 7, 'brand_id' => 10, 'price' => 1999.00, 'sale_price' => 1799.00, 'purchase_price' => 1000.00, 'stock' => 40, 'barcode' => '8901234567060', 'unit' => 'Pair', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 3, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Litre (L) - Cleaning
            ['product_name' => 'Vim Dishwash Liquid 500ml', 'product_code' => 'VIM-DW500', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 99.00, 'sale_price' => 95.00, 'purchase_price' => 70.00, 'stock' => 200, 'barcode' => '8901234567061', 'unit' => 'ml', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],

            // unit: Piece (Pcs) extra
            ['product_name' => 'Nivea Body Lotion 400ml', 'product_code' => 'NIV-BL400', 'category_id' => 5, 'subcategory_id' => 12, 'brand_id' => 15, 'price' => 350.00, 'sale_price' => 330.00, 'purchase_price' => 250.00, 'stock' => 100, 'barcode' => '8901234567062', 'unit' => 'ml', 'gst_percentage' => 18.00, 'company_id' => $companyId, 'supplier_id' => 2, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ];
        DB::table('products')->insert($products);

        // Customers
        $customers = [
            ['name' => 'Ravi Kumar', 'phone' => '9876543211', 'address' => 'Adyar, Chennai', 'type' => 'regular', 'status' => 'active', 'admin_id' => 1, 'created_at' => now()],
            ['name' => 'Priya Sharma', 'phone' => '9876543212', 'address' => 'Velachery, Chennai', 'type' => 'regular', 'status' => 'active', 'admin_id' => 1, 'created_at' => now()],
            ['name' => 'Karthik Raj', 'phone' => '9876543213', 'address' => 'T Nagar, Chennai', 'type' => 'wholesale', 'status' => 'active', 'admin_id' => 1, 'created_at' => now()],
            ['name' => 'Meena Devi', 'phone' => '9876543214', 'address' => 'Porur, Chennai', 'type' => 'regular', 'status' => 'active', 'admin_id' => 1, 'created_at' => now()],
            ['name' => 'Suresh Babu', 'phone' => '9876543215', 'address' => 'Anna Nagar, Chennai', 'type' => 'wholesale', 'status' => 'active', 'admin_id' => 1, 'created_at' => now()],
        ];
        DB::table('customers')->insert($customers);

        // Invoices with product sale history
        $invoices = [
            [
                'invoice_no' => 'INV-001',
                'customer_id' => 1,
                'customer_name' => 'Ravi Kumar',
                'customer_phone' => '9876543211',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 1, 'product_name' => 'Samsung Galaxy S24', 'quantity' => 1, 'price' => 69999.00, 'total' => 69999.00],
                    ['product_id' => 7, 'product_name' => 'Boat Airdopes 141', 'quantity' => 2, 'price' => 1099.00, 'total' => 2198.00],
                ]),
                'sub_total' => 72197.00,
                'gst_total' => 12995.46,
                'total_amount' => 85192.46,
                'paid_amount' => 85192.46,
                'balance_amount' => 0,
                'payment_method' => 'upi',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subDays(15),
            ],
            [
                'invoice_no' => 'INV-002',
                'customer_id' => 2,
                'customer_name' => 'Priya Sharma',
                'customer_phone' => '9876543212',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 16, 'product_name' => 'Peter England Formal Shirt', 'quantity' => 2, 'price' => 1499.00, 'total' => 2998.00],
                    ['product_id' => 18, 'product_name' => 'Allen Solly Kurti', 'quantity' => 1, 'price' => 1299.00, 'total' => 1299.00],
                ]),
                'sub_total' => 4297.00,
                'gst_total' => 214.85,
                'total_amount' => 4511.85,
                'paid_amount' => 4511.85,
                'balance_amount' => 0,
                'payment_method' => 'cash',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subDays(12),
            ],
            [
                'invoice_no' => 'INV-003',
                'customer_id' => 3,
                'customer_name' => 'Karthik Raj',
                'customer_phone' => '9876543213',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 9, 'product_name' => 'Aashirvaad Atta 5kg', 'quantity' => 5, 'price' => 295.00, 'total' => 1475.00],
                    ['product_id' => 11, 'product_name' => 'Lays Classic Salted 52g', 'quantity' => 10, 'price' => 20.00, 'total' => 200.00],
                    ['product_id' => 13, 'product_name' => 'Coca Cola 750ml', 'quantity' => 6, 'price' => 40.00, 'total' => 240.00],
                ]),
                'sub_total' => 1915.00,
                'gst_total' => 134.05,
                'total_amount' => 2049.05,
                'paid_amount' => 2000.00,
                'balance_amount' => 49.05,
                'payment_method' => 'cash',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'partial',
                'company_id' => $companyId,
                'created_at' => now()->subDays(10),
            ],
            [
                'invoice_no' => 'INV-004',
                'customer_id' => 4,
                'customer_name' => 'Meena Devi',
                'customer_phone' => '9876543214',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 3, 'product_name' => 'Apple iPhone 15', 'quantity' => 1, 'price' => 74900.00, 'total' => 74900.00],
                    ['product_id' => 19, 'product_name' => 'Reynolds Trimax 0.5mm', 'quantity' => 5, 'price' => 35.00, 'total' => 175.00],
                    ['product_id' => 21, 'product_name' => 'Classmate Notebook 200pg', 'quantity' => 3, 'price' => 60.00, 'total' => 180.00],
                ]),
                'sub_total' => 75255.00,
                'gst_total' => 13545.90,
                'total_amount' => 88800.90,
                'paid_amount' => 88800.90,
                'balance_amount' => 0,
                'payment_method' => 'upi',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subDays(7),
            ],
            [
                'invoice_no' => 'INV-005',
                'customer_id' => 5,
                'customer_name' => 'Suresh Babu',
                'customer_phone' => '9876543215',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 5, 'product_name' => 'HP Pavilion 15', 'quantity' => 1, 'price' => 58999.00, 'total' => 58999.00],
                    ['product_id' => 7, 'product_name' => 'Boat Airdopes 141', 'quantity' => 3, 'price' => 1099.00, 'total' => 3297.00],
                ]),
                'sub_total' => 62296.00,
                'gst_total' => 11213.28,
                'total_amount' => 73509.28,
                'paid_amount' => 73509.28,
                'balance_amount' => 0,
                'payment_method' => 'online',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subDays(5),
            ],
            [
                'invoice_no' => 'INV-006',
                'customer_id' => 1,
                'customer_name' => 'Ravi Kumar',
                'customer_phone' => '9876543211',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 9, 'product_name' => 'Aashirvaad Atta 5kg', 'quantity' => 3, 'price' => 295.00, 'total' => 885.00],
                    ['product_id' => 13, 'product_name' => 'Coca Cola 750ml', 'quantity' => 12, 'price' => 40.00, 'total' => 480.00],
                    ['product_id' => 11, 'product_name' => 'Lays Classic Salted 52g', 'quantity' => 20, 'price' => 20.00, 'total' => 400.00],
                ]),
                'sub_total' => 1765.00,
                'gst_total' => 113.10,
                'total_amount' => 1878.10,
                'paid_amount' => 1878.10,
                'balance_amount' => 0,
                'payment_method' => 'cash',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subDays(3),
            ],
            [
                'invoice_no' => 'INV-007',
                'customer_id' => 2,
                'customer_name' => 'Priya Sharma',
                'customer_phone' => '9876543212',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 1, 'product_name' => 'Samsung Galaxy S24', 'quantity' => 1, 'price' => 69999.00, 'total' => 69999.00],
                    ['product_id' => 22, 'product_name' => 'Prestige Pan 28cm', 'quantity' => 2, 'price' => 749.00, 'total' => 1498.00],
                    ['product_id' => 23, 'product_name' => 'Pigeon Handy Mixer', 'quantity' => 1, 'price' => 1099.00, 'total' => 1099.00],
                ]),
                'sub_total' => 72596.00,
                'gst_total' => 13067.28,
                'total_amount' => 85663.28,
                'paid_amount' => 50000.00,
                'balance_amount' => 35663.28,
                'payment_method' => 'credit',
                'payment_type' => 'credit',
                'gst_type' => 'with_gst',
                'payment_status' => 'partial',
                'company_id' => $companyId,
                'created_at' => now()->subDays(1),
            ],
            [
                'invoice_no' => 'INV-008',
                'customer_id' => 3,
                'customer_name' => 'Karthik Raj',
                'customer_phone' => '9876543213',
                'cashier_id' => 1,
                'products' => json_encode([
                    ['product_id' => 2, 'product_name' => 'Samsung Galaxy A55', 'quantity' => 2, 'price' => 36999.00, 'total' => 73998.00],
                    ['product_id' => 8, 'product_name' => 'Boat Rockerz 450', 'quantity' => 5, 'price' => 1499.00, 'total' => 7495.00],
                ]),
                'sub_total' => 81493.00,
                'gst_total' => 14668.74,
                'total_amount' => 96161.74,
                'paid_amount' => 96161.74,
                'balance_amount' => 0,
                'payment_method' => 'online',
                'payment_type' => 'cash',
                'gst_type' => 'with_gst',
                'payment_status' => 'paid',
                'company_id' => $companyId,
                'created_at' => now()->subHours(12),
            ],
        ];
        DB::table('invoices')->insert($invoices);

        $this->command->info('Sample data seeded successfully!');
    }
}
