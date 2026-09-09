<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\PublicInvoiceController;

Route::get('/', function () {
    return view('welcome');
});

// Public web invoice view shared via transaction messages ([Invoice_Link]).
Route::get('invoice/web/{invoice_no}', [PublicInvoiceController::class, 'show'])
    ->where('invoice_no', '[A-Za-z0-9\-_]+');
