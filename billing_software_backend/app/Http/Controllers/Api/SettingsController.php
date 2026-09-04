<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CompanySetting;

class SettingsController extends Controller
{
    public function get(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        $companySetting = CompanySetting::where('company_id', $company_id)->first();
        if ($companySetting) {
            return response()->json([
                "status" => true,
                "data" => $companySetting->settings
            ]);
        }

        return response()->json([
            "status" => true,
            "data" => []
        ]);
    }

    public function save(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        $settings = $request->input('settings');

        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"]);
        }

        if (!is_array($settings)) {
            $settings = [];
        }

        CompanySetting::updateOrCreate(
            ['company_id' => $company_id],
            ['settings' => $settings]
        );

        return response()->json(["status" => true]);
    }
}