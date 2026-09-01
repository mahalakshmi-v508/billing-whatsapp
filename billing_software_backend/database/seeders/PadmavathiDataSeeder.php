<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PadmavathiDataSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = 1;
        $now = Carbon::now();

        // ── Categories ──
        $categories = ['Beverages', 'Snacks', 'Dairy', 'Stationery', 'Groceries', 'Personal Care', 'Home Care', 'Ice Creams'];
        $catIds = [];
        foreach ($categories as $cat) {
            $existing = DB::table('categories')->where('name', $cat)->where('company_id', $companyId)->where('is_deleted', 0)->first();
            if ($existing) {
                $catIds[$cat] = $existing->id;
            } else {
                $catIds[$cat] = DB::table('categories')->insertGetId([
                    'name'       => $cat,
                    'company_id' => $companyId,
                    'status'     => 'active',
                    'is_deleted' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // ── Subcategories ──
        $subcategories = [
            'Beverages'    => ['Cold Drinks', 'Juices', 'Water', 'Energy Drinks'],
            'Snacks'       => ['Chips', 'Biscuits', 'Namkeen', 'Chocolate'],
            'Dairy'        => ['Milk', 'Curd', 'Butter', 'Cheese'],
            'Stationery'   => ['Pens', 'Notebooks', 'Files', 'Pencils'],
            'Groceries'    => ['Rice', 'Dal', 'Oil', 'Spices'],
            'Personal Care'=> ['Soaps', 'Shampoo', 'Toothpaste', 'Cream'],
            'Home Care'    => ['Detergent', 'Floor Cleaner', 'Dishwash'],
            'Ice Creams'   => ['Cones', 'Cups', 'Sticks'],
        ];
        $subIds = [];
        foreach ($subcategories as $catName => $subs) {
            foreach ($subs as $sub) {
                $existing = DB::table('subcategories')->where('name', $sub)->where('company_id', $companyId)->where('is_deleted', 0)->first();
                if ($existing) {
                    $subIds[$sub] = $existing->id;
                } else {
                    $subIds[$sub] = DB::table('subcategories')->insertGetId([
                        'name'         => $sub,
                        'category_id'  => $catIds[$catName],
                        'company_id'   => $companyId,
                        'status'       => 'active',
                        'is_deleted'   => 0,
                        'created_at'   => $now,
                    ]);
                }
            }
        }

        // ── Brands ──
        $brandMap = [
            'Cold Drinks'   => ['Coca Cola', 'Pepsi', 'Sprite', 'Fanta', 'Mountain Dew'],
            'Juices'        => ['Real', 'Tropicana', 'Paper Boat'],
            'Energy Drinks' => ['Red Bull', 'Sting'],
            'Chips'         => ['Lays', 'Kurkure', 'Haldiram', 'Bingo'],
            'Biscuits'      => ['Parle', 'Britannia', 'Oreo', 'Good Day'],
            'Namkeen'       => ['Haldiram', 'Bikaji', 'Too Yumm'],
            'Chocolate'     => ['Dairy Milk', 'KitKat', 'Perk', '5 Star'],
            'Milk'          => ['Amul', 'Aavin', 'Nandini'],
            'Curd'          => ['Amul', 'Mother Dairy'],
            'Butter'        => ['Amul', 'Britannia'],
            'Cheese'        => ['Amul', 'Britannia'],
            'Pens'          => ['Reynolds', 'Cello', 'Flair'],
            'Notebooks'     => ['Classmate', 'Navneet', 'SQLite'],
            'Pencils'       => ['Nataraj', 'Apsara', 'DOMS'],
            'Rice'          => ['India Gate', 'Daawat', 'Sona Masoori'],
            'Dal'           => ['Tata Sampann', 'Fortune'],
            'Oil'           => ['Fortune', 'Saffola', 'Gemini'],
            'Spices'        => ['Everest', 'MDH', 'Sakthi'],
            'Soaps'         => ['Lifebuoy', 'Lux', 'Dettol', 'Cinthol'],
            'Shampoo'       => ['Head Shoulders', 'Sunsilk', 'Clinic Plus'],
            'Toothpaste'    => ['Colgate', 'Pepsodent', 'Sensodyne'],
            'Cream'         => ['Nivea', 'Fair & Lovely', 'Ponds'],
            'Detergent'     => ['Surf Excel', 'Ariel', 'Wheel'],
            'Floor Cleaner' => ['Lizol', 'Harpic'],
            'Dishwash'      => ['Vim', 'Exo'],
            'Cones'         => ['Amul', 'Kwality Wall\'s'],
            'Cups'          => ['Amul', 'Mother Dairy'],
            'Sticks'        => ['Amul', 'Kwality Wall\'s'],
        ];
        $brandIds = [];
        foreach ($brandMap as $subName => $list) {
            $catName = '';
            foreach ($subcategories as $cn => $subs) {
                if (in_array($subName, $subs)) { $catName = $cn; break; }
            }
            foreach ($list as $b) {
                $existing = DB::table('brands')->where('name', $b)->where('company_id', $companyId)->where('is_deleted', 0)->first();
                if ($existing) {
                    $brandIds[$b] = $existing->id;
                } else {
                    $brandIds[$b] = DB::table('brands')->insertGetId([
                        'name'            => $b,
                        'category_id'     => $catIds[$catName] ?? 1,
                        'subcategory_id'  => $subIds[$subName] ?? 1,
                        'company_id'      => $companyId,
                        'status'          => 'active',
                        'is_deleted'      => 0,
                        'created_at'      => $now,
                    ]);
                }
            }
        }

        // ── Products ──
        $products = [
            // Beverages
            ['product_name'=>'Coca Cola 750ml','product_code'=>'CC750','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Cold Drinks'],'brand_id'=>$brandIds['Coca Cola'],'price'=>40,'sale_price'=>40,'purchase_price'=>35,'stock'=>150,'barcode'=>'8901764001001','unit'=>'Bottle','gst_percentage'=>12],
            ['product_name'=>'Pepsi 750ml','product_code'=>'PE750','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Cold Drinks'],'brand_id'=>$brandIds['Pepsi'],'price'=>40,'sale_price'=>40,'purchase_price'=>35,'stock'=>120,'barcode'=>'8901764001002','unit'=>'Bottle','gst_percentage'=>12],
            ['product_name'=>'Sprite 750ml','product_code'=>'SP750','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Cold Drinks'],'brand_id'=>$brandIds['Sprite'],'price'=>40,'sale_price'=>40,'purchase_price'=>35,'stock'=>130,'barcode'=>'8901764001003','unit'=>'Bottle','gst_percentage'=>12],
            ['product_name'=>'Fanta 600ml','product_code'=>'FN600','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Cold Drinks'],'brand_id'=>$brandIds['Fanta'],'price'=>30,'sale_price'=>30,'purchase_price'=>26,'stock'=>90,'barcode'=>'8901764001004','unit'=>'Bottle','gst_percentage'=>12],
            ['product_name'=>'Mountain Dew 750ml','product_code'=>'MD750','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Cold Drinks'],'brand_id'=>$brandIds['Mountain Dew'],'price'=>40,'sale_price'=>40,'purchase_price'=>35,'stock'=>85,'barcode'=>'8901764001005','unit'=>'Bottle','gst_percentage'=>12],
            ['product_name'=>'Real Mango Juice 1L','product_code'=>'RMJ1','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Juices'],'brand_id'=>$brandIds['Real'],'price'=>99,'sale_price'=>99,'purchase_price'=>85,'stock'=>60,'barcode'=>'8901764001006','unit'=>'Litre','gst_percentage'=>12],
            ['product_name'=>'Tropicana Apple 1L','product_code'=>'TAP1','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Juices'],'brand_id'=>$brandIds['Tropicana'],'price'=>99,'sale_price'=>99,'purchase_price'=>85,'stock'=>55,'barcode'=>'8901764001007','unit'=>'Litre','gst_percentage'=>12],
            ['product_name'=>'Red Bull 250ml','product_code'=>'RB250','category_id'=>$catIds['Beverages'],'subcategory_id'=>$subIds['Energy Drinks'],'brand_id'=>$brandIds['Red Bull'],'price'=>115,'sale_price'=>115,'purchase_price'=>100,'stock'=>40,'barcode'=>'8901764001008','unit'=>'Can','gst_percentage'=>12],

            // Snacks
            ['product_name'=>'Lays Classic Salted 52g','product_code'=>'LCS52','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chips'],'brand_id'=>$brandIds['Lays'],'price'=>20,'sale_price'=>20,'purchase_price'=>16,'stock'=>250,'barcode'=>'8901764002001','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Lays Magic Masala 52g','product_code'=>'LMM52','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chips'],'brand_id'=>$brandIds['Lays'],'price'=>20,'sale_price'=>20,'purchase_price'=>16,'stock'=>200,'barcode'=>'8901764002002','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Kurkure Masala Munch 90g','product_code'=>'KMM90','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chips'],'brand_id'=>$brandIds['Kurkure'],'price'=>20,'sale_price'=>20,'purchase_price'=>16,'stock'=>180,'barcode'=>'8901764002003','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Bingo Mad Angles 80g','product_code'=>'BMA80','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chips'],'brand_id'=>$brandIds['Bingo'],'price'=>20,'sale_price'=>20,'purchase_price'=>16,'stock'=>140,'barcode'=>'8901764002004','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Parle-G Biscuit 80g','product_code'=>'PG80','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Biscuits'],'brand_id'=>$brandIds['Parle'],'price'=>10,'sale_price'=>10,'purchase_price'=>8,'stock'=>400,'barcode'=>'8901764002005','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Britannia Good Day 75g','product_code'=>'BGD75','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Biscuits'],'brand_id'=>$brandIds['Britannia'],'price'=>25,'sale_price'=>25,'purchase_price'=>20,'stock'=>160,'barcode'=>'8901764002006','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Oreo Original 120g','product_code'=>'OR120','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Biscuits'],'brand_id'=>$brandIds['Oreo'],'price'=>30,'sale_price'=>30,'purchase_price'=>25,'stock'=>130,'barcode'=>'8901764002007','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Dairy Milk 40g','product_code'=>'DM40','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chocolate'],'brand_id'=>$brandIds['Dairy Milk'],'price'=>20,'sale_price'=>20,'purchase_price'=>16,'stock'=>200,'barcode'=>'8901764002008','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'KitKat 4 Finger','product_code'=>'KK4F','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chocolate'],'brand_id'=>$brandIds['KitKat'],'price'=>40,'sale_price'=>40,'purchase_price'=>34,'stock'=>100,'barcode'=>'8901764002009','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Perk 40g','product_code'=>'PK40','category_id'=>$catIds['Snacks'],'subcategory_id'=>$subIds['Chocolate'],'brand_id'=>$brandIds['Perk'],'price'=>10,'sale_price'=>10,'purchase_price'=>8,'stock'=>180,'barcode'=>'8901764002010','unit'=>'Piece','gst_percentage'=>18],

            // Dairy
            ['product_name'=>'Amul Taaza Milk 500ml','product_code'=>'ATM5','category_id'=>$catIds['Dairy'],'subcategory_id'=>$subIds['Milk'],'brand_id'=>$brandIds['Amul'],'price'=>28,'sale_price'=>28,'purchase_price'=>24,'stock'=>100,'barcode'=>'8901764003001','unit'=>'Piece','gst_percentage'=>0],
            ['product_name'=>'Aavin Milk 500ml','product_code'=>'AV500','category_id'=>$catIds['Dairy'],'subcategory_id'=>$subIds['Milk'],'brand_id'=>$brandIds['Aavin'],'price'=>26,'sale_price'=>26,'purchase_price'=>22,'stock'=>90,'barcode'=>'8901764003002','unit'=>'Piece','gst_percentage'=>0],
            ['product_name'=>'Amul Butter 100g','product_code'=>'AB100','category_id'=>$catIds['Dairy'],'subcategory_id'=>$subIds['Butter'],'brand_id'=>$brandIds['Amul'],'price'=>56,'sale_price'=>56,'purchase_price'=>48,'stock'=>70,'barcode'=>'8901764003003','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Amul Cheese Slices 200g','product_code'=>'ACS200','category_id'=>$catIds['Dairy'],'subcategory_id'=>$subIds['Cheese'],'brand_id'=>$brandIds['Amul'],'price'=>99,'sale_price'=>99,'purchase_price'=>85,'stock'=>40,'barcode'=>'8901764003004','unit'=>'Pack','gst_percentage'=>12],
            ['product_name'=>'Mother Dairy Curd 400g','product_code'=>'MDC400','category_id'=>$catIds['Dairy'],'subcategory_id'=>$subIds['Curd'],'brand_id'=>$brandIds['Mother Dairy'],'price'=>35,'sale_price'=>35,'purchase_price'=>30,'stock'=>60,'barcode'=>'8901764003005','unit'=>'Pack','gst_percentage'=>0],

            // Groceries
            ['product_name'=>'India Gate Basmati Rice 5kg','product_code'=>'IGBR5','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Rice'],'brand_id'=>$brandIds['India Gate'],'price'=>550,'sale_price'=>550,'purchase_price'=>480,'stock'=>40,'barcode'=>'8901764005001','unit'=>'Kg','gst_percentage'=>5],
            ['product_name'=>'Daawat Basmati Rice 1kg','product_code'=>'DBR1','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Rice'],'brand_id'=>$brandIds['Daawat'],'price'=>130,'sale_price'=>130,'purchase_price'=>110,'stock'=>80,'barcode'=>'8901764005002','unit'=>'Kg','gst_percentage'=>5],
            ['product_name'=>'Tata Sampann Moong Dal 1kg','product_code'=>'TSMD1','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Dal'],'brand_id'=>$brandIds['Tata Sampann'],'price'=>140,'sale_price'=>140,'purchase_price'=>120,'stock'=>50,'barcode'=>'8901764005003','unit'=>'Kg','gst_percentage'=>5],
            ['product_name'=>'Fortune Sunflower Oil 1L','product_code'=>'FSO1','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Oil'],'brand_id'=>$brandIds['Fortune'],'price'=>180,'sale_price'=>180,'purchase_price'=>160,'stock'=>60,'barcode'=>'8901764005004','unit'=>'Litre','gst_percentage'=>5],
            ['product_name'=>'Saffola Gold Oil 1L','product_code'=>'SGO1','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Oil'],'brand_id'=>$brandIds['Saffola'],'price'=>220,'sale_price'=>220,'purchase_price'=>195,'stock'=>45,'barcode'=>'8901764005005','unit'=>'Litre','gst_percentage'=>5],
            ['product_name'=>'Everest Chicken Masala 100g','product_code'=>'ECM100','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Spices'],'brand_id'=>$brandIds['Everest'],'price'=>65,'sale_price'=>65,'purchase_price'=>55,'stock'=>70,'barcode'=>'8901764005006','unit'=>'Pack','gst_percentage'=>5],
            ['product_name'=>'MDH Chana Masala 100g','product_code'=>'MCH100','category_id'=>$catIds['Groceries'],'subcategory_id'=>$subIds['Spices'],'brand_id'=>$brandIds['MDH'],'price'=>72,'sale_price'=>72,'purchase_price'=>60,'stock'=>65,'barcode'=>'8901764005007','unit'=>'Pack','gst_percentage'=>5],

            // Personal Care
            ['product_name'=>'Lifebuoy Soap 100g','product_code'=>'LS100','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Soaps'],'brand_id'=>$brandIds['Lifebuoy'],'price'=>38,'sale_price'=>38,'purchase_price'=>30,'stock'=>200,'barcode'=>'8901764006001','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Lux Soap 100g','product_code'=>'LX100','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Soaps'],'brand_id'=>$brandIds['Lux'],'price'=>40,'sale_price'=>40,'purchase_price'=>32,'stock'=>180,'barcode'=>'8901764006002','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Dettol Soap 75g','product_code'=>'DT75','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Soaps'],'brand_id'=>$brandIds['Dettol'],'price'=>45,'sale_price'=>45,'purchase_price'=>37,'stock'=>150,'barcode'=>'8901764006003','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Head Shoulders 180ml','product_code'=>'HS180','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Shampoo'],'brand_id'=>$brandIds['Head Shoulders'],'price'=>199,'sale_price'=>199,'purchase_price'=>170,'stock'=>50,'barcode'=>'8901764006004','unit'=>'Bottle','gst_percentage'=>18],
            ['product_name'=>'Sunsilk Black 180ml','product_code'=>'SB180','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Shampoo'],'brand_id'=>$brandIds['Sunsilk'],'price'=>130,'sale_price'=>130,'purchase_price'=>110,'stock'=>55,'barcode'=>'8901764006005','unit'=>'Bottle','gst_percentage'=>18],
            ['product_name'=>'Colgate MaxFresh 150g','product_code'=>'CMF150','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Toothpaste'],'brand_id'=>$brandIds['Colgate'],'price'=>90,'sale_price'=>90,'purchase_price'=>75,'stock'=>120,'barcode'=>'8901764006006','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Pepsodent 150g','product_code'=>'PD150','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Toothpaste'],'brand_id'=>$brandIds['Pepsodent'],'price'=>60,'sale_price'=>60,'purchase_price'=>48,'stock'=>100,'barcode'=>'8901764006007','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Nivea Soft Cream 50ml','product_code'=>'NSC50','category_id'=>$catIds['Personal Care'],'subcategory_id'=>$subIds['Cream'],'brand_id'=>$brandIds['Nivea'],'price'=>149,'sale_price'=>149,'purchase_price'=>130,'stock'=>45,'barcode'=>'8901764006008','unit'=>'Piece','gst_percentage'=>18],

            // Home Care
            ['product_name'=>'Surf Excel 1kg','product_code'=>'SE1','category_id'=>$catIds['Home Care'],'subcategory_id'=>$subIds['Detergent'],'brand_id'=>$brandIds['Surf Excel'],'price'=>185,'sale_price'=>185,'purchase_price'=>160,'stock'=>70,'barcode'=>'8901764007001','unit'=>'Kg','gst_percentage'=>18],
            ['product_name'=>'Ariel Matic 1kg','product_code'=>'AM1','category_id'=>$catIds['Home Care'],'subcategory_id'=>$subIds['Detergent'],'brand_id'=>$brandIds['Ariel'],'price'=>220,'sale_price'=>220,'purchase_price'=>195,'stock'=>55,'barcode'=>'8901764007002','unit'=>'Kg','gst_percentage'=>18],
            ['product_name'=>'Vim Dishwash Liquid 500ml','product_code'=>'VDL500','category_id'=>$catIds['Home Care'],'subcategory_id'=>$subIds['Dishwash'],'brand_id'=>$brandIds['Vim'],'price'=>99,'sale_price'=>99,'purchase_price'=>82,'stock'=>80,'barcode'=>'8901764007003','unit'=>'Bottle','gst_percentage'=>18],
            ['product_name'=>'Lizol Floor Cleaner 500ml','product_code'=>'LFC500','category_id'=>$catIds['Home Care'],'subcategory_id'=>$subIds['Floor Cleaner'],'brand_id'=>$brandIds['Lizol'],'price'=>110,'sale_price'=>110,'purchase_price'=>95,'stock'=>60,'barcode'=>'8901764007004','unit'=>'Bottle','gst_percentage'=>18],

            // Ice Creams
            ['product_name'=>'Amul Vanilla Cone','product_code'=>'AVC1','category_id'=>$catIds['Ice Creams'],'subcategory_id'=>$subIds['Cones'],'brand_id'=>$brandIds['Amul'],'price'=>30,'sale_price'=>30,'purchase_price'=>24,'stock'=>80,'barcode'=>'8901764008001','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Amul Chocolate Cup','product_code'=>'ACC1','category_id'=>$catIds['Ice Creams'],'subcategory_id'=>$subIds['Cups'],'brand_id'=>$brandIds['Amul'],'price'=>40,'sale_price'=>40,'purchase_price'=>32,'stock'=>60,'barcode'=>'8901764008002','unit'=>'Piece','gst_percentage'=>18],
            ['product_name'=>'Kwality Wall\'s Magnum Stick','product_code'=>'KMS1','category_id'=>$catIds['Ice Creams'],'subcategory_id'=>$subIds['Sticks'],'brand_id'=>$brandIds['Kwality Wall\'s'],'price'=>90,'sale_price'=>90,'purchase_price'=>75,'stock'=>40,'barcode'=>'8901764008003','unit'=>'Piece','gst_percentage'=>18],
        ];

        $count = 0;
        foreach ($products as $p) {
            $existing = DB::table('products')->where('product_name', $p['product_name'])->where('company_id', $companyId)->where('is_deleted', 0)->first();
            if (!$existing) {
                DB::table('products')->insert(array_merge($p, [
                    'company_id'  => $companyId,
                    'status'      => 'active',
                    'is_deleted'  => 0,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]));
                $count++;
            }
        }

        $this->command->info("Done for padmavathi Collection (Company ID: {$companyId})");
        $this->command->info("Categories: " . DB::table('categories')->where('company_id', $companyId)->where('is_deleted', 0)->count());
        $this->command->info("Brands: " . DB::table('brands')->where('company_id', $companyId)->where('is_deleted', 0)->count());
        $this->command->info("Products added: {$count}");
    }
}
