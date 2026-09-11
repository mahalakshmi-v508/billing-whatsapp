<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function createCustomer(Request $request)
    {
        $admin_id       = intval($request->input('admin_id', 0));
        $name           = trim($request->input('name', ''));
        $phone          = trim($request->input('phone', ''));
        $email          = trim($request->input('email', ''));
        $state          = trim($request->input('state', ''));
        $address        = trim($request->input('address', ''));
        $type           = trim($request->input('type', 'B2C'));
        $credit_enabled = intval($request->input('credit_enabled', 0));
        $credit_limit   = floatval($request->input('credit_limit', 0.00));
        $credit_days    = intval($request->input('credit_days', 0));
        $gst_no         = trim($request->input('gst_no', ''));
        $account_number = trim($request->input('account_number', ''));
        $pan_number     = trim($request->input('pan_number', ''));
        $date_of_birth  = $request->input('date_of_birth', null);
        $loyalty_points = intval($request->input('loyalty_points', 0));
        $advance_balance = floatval($request->input('advance_balance', 0.00));
        $pending_amount = floatval($request->input('pending_amount', 0.00));
        $status         = $request->input('status', 'active');

        $address_line1     = trim($request->input('address_line1', ''));
        $address_line2     = trim($request->input('address_line2', ''));
        $city              = trim($request->input('city', ''));
        $billing_country   = trim($request->input('billing_country', 'India'));
        $billing_pincode   = trim($request->input('billing_pincode', ''));
        $shipping_address          = trim($request->input('shipping_address', ''));
        $shipping_address_line1    = trim($request->input('shipping_address_line1', ''));
        $shipping_address_line2    = trim($request->input('shipping_address_line2', ''));
        $shipping_city             = trim($request->input('shipping_city', ''));
        $shipping_country          = trim($request->input('shipping_country', 'India'));
        $shipping_pincode          = trim($request->input('shipping_pincode', ''));

        if (!$admin_id || !$phone) {
            return response()->json(["status" => false, "message" => "Required fields missing"]);
        }

        $check = Customer::where('phone', $phone)
            ->where('admin_id', $admin_id)
            ->where('is_deleted', 0)
            ->exists();

        if ($check) {
            return response()->json(["status" => false, "message" => "Customer with this phone already exists"]);
        }

        Customer::create([
            'admin_id' => $admin_id,
            'name' => $name ?: 'Customer',
            'phone' => $phone,
            'email' => $email ?: null,
            'state' => $state ?: null,
            'address' => $address,
            'address_line1' => $address_line1 ?: null,
            'address_line2' => $address_line2 ?: null,
            'city' => $city ?: null,
            'billing_country' => $billing_country ?: 'India',
            'billing_pincode' => $billing_pincode ?: null,
            'shipping_address' => $shipping_address ?: null,
            'shipping_address_line1' => $shipping_address_line1 ?: null,
            'shipping_address_line2' => $shipping_address_line2 ?: null,
            'shipping_city' => $shipping_city ?: null,
            'shipping_country' => $shipping_country ?: 'India',
            'shipping_pincode' => $shipping_pincode ?: null,
            'type' => $type,
            'credit_enabled' => $credit_enabled,
            'credit_limit' => $credit_limit,
            'credit_days' => $credit_days,
            'gst_no' => $gst_no ?: null,
            'account_number' => $account_number ?: null,
            'pan_number' => $pan_number ?: null,
            'date_of_birth' => $date_of_birth ?: null,
            'loyalty_points' => $loyalty_points,
            'advance_balance' => $advance_balance,
            'pending_amount' => $pending_amount,
            'status' => $status,
            'is_deleted' => 0,
            'created_at' => now()
        ]);

        return response()->json(["status" => true, "message" => "Customer created successfully"]);
    }

    public function customerSave(Request $request)
    {
        $admin_id   = intval($request->input('admin_id', 0));
        $name       = trim($request->input('name', ''));
        $phone      = trim($request->input('phone', ''));
        $address    = trim($request->input('address', ''));
        $type       = trim($request->input('type', 'B2C'));

        if ($name == "") { $name = "Customer"; }

        if (!$admin_id || !preg_match('/^[0-9]{10}$/', $phone)) {
            return response()->json(["status" => false, "message" => "Invalid customer data"]);
        }

        $customer = Customer::where('phone', $phone)
            ->where('admin_id', $admin_id)
            ->where('is_deleted', 0)
            ->first();

        if ($customer) {
            $customer->update([
                'name' => $name,
                'address' => $address,
                'type' => $type
            ]);

            return response()->json([
                "status"      => true,
                "customer_id" => $customer->id,
                "is_new"      => false
            ]);
        } else {
            $newCustomer = Customer::create([
                'admin_id' => $admin_id,
                'name' => $name,
                'phone' => $phone,
                'address' => $address,
                'type' => $type,
                'credit_enabled' => 0,
                'credit_limit' => 0,
                'credit_days' => 0,
                'is_deleted' => 0,
                'created_at' => now()
            ]);

            return response()->json([
                "status"      => true,
                "customer_id" => $newCustomer->id,
                "is_new"      => true
            ]);
        }
    }

    public function customerSearch(Request $request)
    {
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $q        = trim($request->input('q') ?: $request->query('q', ''));

        if (!$admin_id) {
            return response()->json(["status" => false, "message" => "Admin ID required"]);
        }

        // Auto-sync any credit customers from invoices who are missing in customers table
        $missingCusts = DB::table('invoices')
            ->whereNotNull('customer_name')
            ->where('customer_name', '!=', '')
            ->whereNotIn(DB::raw('LOWER(customer_name)'), ['cash customer', 'customer'])
            ->where(function($b) {
                $b->whereNull('customer_id')->orWhere('customer_id', 0);
            })
            ->select('customer_name', 'customer_phone', DB::raw('SUM(balance_amount) as total_bal'))
            ->groupBy('customer_name', 'customer_phone')
            ->get();

        foreach ($missingCusts as $mc) {
            $c = Customer::firstOrCreate(
                ['admin_id' => $admin_id, 'name' => $mc->customer_name, 'is_deleted' => 0],
                [
                    'phone'          => $mc->customer_phone ?: '',
                    'pending_amount' => floatval($mc->total_bal),
                    'status'         => 'active',
                    'credit_enabled' => 1,
                    'created_at'     => now()
                ]
            );
            DB::table('invoices')
                ->where('customer_name', $mc->customer_name)
                ->where(function($b) {
                    $b->whereNull('customer_id')->orWhere('customer_id', 0);
                })
                ->update(['customer_id' => $c->id]);
        }

        $customers = Customer::where('admin_id', $admin_id)
            ->where('is_deleted', 0)
            ->where(function($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%");
            })
            ->select('id', 'name', 'phone', 'gst_no', 'credit_enabled', 'credit_limit', 'credit_days', 'loyalty_points', 'advance_balance', 'pending_amount')
            ->orderBy('name', 'asc')
            ->limit(10)
            ->get();

        return response()->json(["status" => true, "data" => $customers]);
    }

    public function delete(Request $request)
    {
        $id = intval($request->input('id', 0));
        Customer::where('id', $id)->update(['is_deleted' => 1]);

        return response()->json(["status" => true, "message" => "Customer deleted successfully"]);
    }

    public function getAllCustomer(Request $request)
    {
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        $query = Customer::where('is_deleted', 0);
        if ($admin_id > 0) {
            $query->where('admin_id', $admin_id);
        }

        $customers = $query->orderBy('id', 'desc')->get();

        return response()->json(["status" => true, "data" => $customers]);
    }

    public function getByPhone(Request $request)
    {
        $phone = trim($request->input('phone') ?: $request->query('phone', ''));
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        $customer = Customer::where('phone', $phone)
            ->where('admin_id', $admin_id)
            ->where('is_deleted', 0)
            ->first();

        if (!$customer) {
            return response()->json(["status" => false, "message" => "Customer not found"]);
        }

        return response()->json(["status" => true, "data" => $customer]);
    }

    public function getCustomerById(Request $request)
    {
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $customer = Customer::where('id', $id)->first();

        if (!$customer) {
            return response()->json(["status" => false, "message" => "Customer not found"]);
        }

        return response()->json(["status" => true, "data" => $customer]);
    }

    public function toggleStatusCustomer(Request $request)
    {
        $id = intval($request->input('id', 0));
        $status = $request->input('status', '');

        if (!$id || !$status) {
            return response()->json(["status" => false, "message" => "Invalid data"]);
        }

        Customer::where('id', $id)->update(['status' => $status]);

        return response()->json(["status" => true, "message" => "Status updated successfully"]);
    }

    public function update(Request $request)
    {
        $id             = intval($request->input('id', 0));
        $name           = trim($request->input('name', ''));
        $phone          = trim($request->input('phone', ''));
        $email          = trim($request->input('email', ''));
        $state          = trim($request->input('state', ''));
        $address        = trim($request->input('address', ''));
        $type           = trim($request->input('type', 'B2C'));
        $credit_enabled = intval($request->input('credit_enabled', 0));
        $credit_limit   = floatval($request->input('credit_limit', 0.00));
        $credit_days    = intval($request->input('credit_days', 0));
        $gst_no         = trim($request->input('gst_no', ''));
        $account_number = trim($request->input('account_number', ''));
        $pan_number     = trim($request->input('pan_number', ''));
        $date_of_birth  = $request->input('date_of_birth', null);
        $loyalty_points = intval($request->input('loyalty_points', 0));
        $advance_balance = floatval($request->input('advance_balance', 0.00));
        $pending_amount = floatval($request->input('pending_amount', 0.00));

        $address_line1     = trim($request->input('address_line1', ''));
        $address_line2     = trim($request->input('address_line2', ''));
        $city              = trim($request->input('city', ''));
        $billing_country   = trim($request->input('billing_country', 'India'));
        $billing_pincode   = trim($request->input('billing_pincode', ''));
        $shipping_address          = trim($request->input('shipping_address', ''));
        $shipping_address_line1    = trim($request->input('shipping_address_line1', ''));
        $shipping_address_line2    = trim($request->input('shipping_address_line2', ''));
        $shipping_city             = trim($request->input('shipping_city', ''));
        $shipping_country          = trim($request->input('shipping_country', 'India'));
        $shipping_pincode          = trim($request->input('shipping_pincode', ''));

        if (!$id || !$phone) {
            return response()->json(["status" => false, "message" => "Required fields missing"]);
        }

        Customer::where('id', $id)->update([
            'name' => $name ?: 'Customer',
            'phone' => $phone,
            'email' => $email ?: null,
            'state' => $state ?: null,
            'address' => $address,
            'address_line1' => $address_line1 ?: null,
            'address_line2' => $address_line2 ?: null,
            'city' => $city ?: null,
            'billing_country' => $billing_country ?: 'India',
            'billing_pincode' => $billing_pincode ?: null,
            'shipping_address' => $shipping_address ?: null,
            'shipping_address_line1' => $shipping_address_line1 ?: null,
            'shipping_address_line2' => $shipping_address_line2 ?: null,
            'shipping_city' => $shipping_city ?: null,
            'shipping_country' => $shipping_country ?: 'India',
            'shipping_pincode' => $shipping_pincode ?: null,
            'type' => $type,
            'credit_enabled' => $credit_enabled,
            'credit_limit' => $credit_limit,
            'credit_days' => $credit_days,
            'gst_no' => $gst_no ?: null,
            'account_number' => $account_number ?: null,
            'pan_number' => $pan_number ?: null,
            'date_of_birth' => $date_of_birth ?: null,
            'loyalty_points' => $loyalty_points,
            'advance_balance' => $advance_balance,
            'pending_amount' => $pending_amount
        ]);

        return response()->json(["status" => true, "message" => "Customer updated successfully"]);
    }

    /**
     * Get Captcha Endpoint
     * GET /api/v1/getCaptcha
     */
    public function getCaptcha(Request $request)
    {
        try {
            $sessionId = Str::uuid()->toString();
            $cookieJar = new CookieJar();

            $client = new Client([
                'verify'  => false,
                'cookies' => $cookieJar,
                'timeout' => 15,
                'headers' => [
                    'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept'          => 'application/json, text/plain, */*',
                    'Accept-Language' => 'en-US,en;q=0.9',
                ],
            ]);

            // Step 1: Visit search page to initialize session cookies
            $client->get('https://services.gst.gov.in/services/searchtp');

            // Step 2: Fetch the captcha image
            $captchaResponse = $client->get('https://services.gst.gov.in/services/captcha', [
                'headers' => [
                    'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                ],
            ]);

            $captchaBase64 = base64_encode($captchaResponse->getBody()->getContents());

            // Serialize cookies for later use by getGSTDetails
            $cookiesData = [];
            foreach ($cookieJar as $cookie) {
                $cookiesData[] = [
                    'name'   => $cookie->getName(),
                    'value'  => $cookie->getValue(),
                    'domain' => $cookie->getDomain(),
                    'path'   => $cookie->getPath(),
                ];
            }

            Cache::put('gst_cookies_' . $sessionId, $cookiesData, 600);

            return response()->json([
                'status'    => true,
                'sessionId' => $sessionId,
                'image'     => 'data:image/png;base64,' . $captchaBase64,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error fetching captcha: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Error in fetching captcha'], 500);
        }
    }

    /**
     * Get GST Details Endpoint
     * POST /api/v1/getGSTDetails
     * Body: { sessionId: "...", GSTIN: "...", captcha: "..." }
     */
    public function getGSTDetails(Request $request)
    {
        try {
            $sessionId = trim($request->input('sessionId', ''));
            $gstin     = strtoupper(trim($request->input('GSTIN', '')));
            $captcha   = trim($request->input('captcha', ''));

            if (!$sessionId || !$gstin || !$captcha) {
                return response()->json(['status' => false, 'message' => 'sessionId, GSTIN, and captcha are required'], 400);
            }

            $cookiesData = Cache::get('gst_cookies_' . $sessionId);
            if (!$cookiesData) {
                return response()->json(['status' => false, 'message' => 'Invalid or expired session id'], 400);
            }

            // Rebuild cookie jar from cached cookies
            $cookieJar = new CookieJar();
            foreach ($cookiesData as $c) {
                $cookieJar->setCookie(new \GuzzleHttp\Cookie\SetCookie([
                    'Name'    => $c['name'],
                    'Value'   => $c['value'],
                    'Domain'  => $c['domain'],
                    'Path'    => $c['path'],
                    'Secure'  => false,
                ]));
            }

            $client = new Client([
                'verify'  => false,
                'cookies' => $cookieJar,
                'timeout' => 15,
                'headers' => [
                    'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept'          => 'application/json, text/plain, */*',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'Content-Type'    => 'application/json;charset=UTF-8',
                    'Referer'         => 'https://services.gst.gov.in/services/searchtp',
                ],
            ]);

            // Step 3: Request taxpayer details
            $response = $client->post(
                'https://services.gst.gov.in/services/api/search/taxpayerDetails',
                ['json' => ['gstin' => $gstin, 'captcha' => $captcha]]
            );

            $body = json_decode($response->getBody()->getContents(), true);

            Cache::forget('gst_cookies_' . $sessionId);

            return response()->json($body);
        } catch (\Throwable $e) {
            Log::error('Error fetching GST Details: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Error in fetching GST Details'], 500);
        }
    }
}
