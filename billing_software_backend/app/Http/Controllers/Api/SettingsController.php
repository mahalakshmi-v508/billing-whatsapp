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

        try {
            $companySetting = CompanySetting::where('company_id', $company_id)->first();
            if ($companySetting) {
                return response()->json([
                    "status" => true,
                    "data" => $companySetting->settings
                ]);
            }
        } catch (\Throwable $e) {
            // Table might not exist yet or connection issue
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

    public function getTerms(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            $user = auth()->user();
            if ($user && !empty($user->company_id)) {
                $company_id = intval($user->company_id);
            }
        }

        $defaultTerms = [
            [
                'id' => 'tc-1',
                'text' => 'Goods once sold cannot be returned.',
                'applies_to_sale' => true,
                'applies_to_estimate' => true,
                'applies_to_credit_note' => false,
                'is_enabled' => true,
            ],
            [
                'id' => 'tc-2',
                'text' => 'Payment should be made within 30 days.',
                'applies_to_sale' => true,
                'applies_to_estimate' => true,
                'applies_to_credit_note' => true,
                'is_enabled' => true,
            ],
            [
                'id' => 'tc-3',
                'text' => 'Subject to availability.',
                'applies_to_sale' => true,
                'applies_to_estimate' => true,
                'applies_to_credit_note' => false,
                'is_enabled' => true,
            ],
            [
                'id' => 'tc-4',
                'text' => 'Credit note is valid only against the original invoice.',
                'applies_to_sale' => false,
                'applies_to_estimate' => false,
                'applies_to_credit_note' => true,
                'is_enabled' => true,
            ],
            [
                'id' => 'tc-5',
                'text' => 'All disputes are subject to local jurisdiction.',
                'applies_to_sale' => true,
                'applies_to_estimate' => true,
                'applies_to_credit_note' => true,
                'is_enabled' => true,
            ],
        ];

        $terms = $defaultTerms;
        if ($company_id > 0) {
            try {
                $cs = CompanySetting::where('company_id' , $company_id)->first();
                if ($cs && isset($cs->settings['terms_conditions']) && is_array($cs->settings['terms_conditions']) && count($cs->settings['terms_conditions']) > 0) {
                    $terms = $cs->settings['terms_conditions'];
                }
            } catch (\Throwable $e) {}
        }

        $page = trim($request->input('page') ?: $request->query('page', ''));
        if (!empty($page)) {
            $filtered = [];
            foreach ($terms as $item) {
                if (empty($item['is_enabled'])) {
                    continue;
                }
                if ($page === 'sale' && !empty($item['applies_to_sale'])) {
                    $filtered[] = $item;
                } elseif ($page === 'estimate' && !empty($item['applies_to_estimate'])) {
                    $filtered[] = $item;
                } elseif ($page === 'credit_note' && !empty($item['applies_to_credit_note'])) {
                    $filtered[] = $item;
                }
            }
            return response()->json([
                'status' => true,
                'data' => array_values($filtered)
            ]);
        }

        return response()->json([
            'status' => true,
            'data' => array_values($terms)
        ]);
    }

    public function saveTerms(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        $terms = $request->input('terms', []);

        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID required'], 400);
        }

        if (!is_array($terms)) {
            $terms = [];
        }

        try {
            $cs = CompanySetting::firstOrNew(['company_id' => $company_id]);
            $existing = is_array($cs->settings) ? $cs->settings : [];
            $existing['terms_conditions'] = array_values($terms);
            $cs->settings = $existing;
            $cs->save();

            return response()->json([
                'status' => true,
                'message' => 'Terms & conditions saved successfully',
                'data' => array_values($terms)
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}