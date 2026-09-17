<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled tasks
|--------------------------------------------------------------------------
|
| Credit Due reminders run automatically every day. The host must run the
| Laravel scheduler every minute (e.g. cron: * * * * * php artisan schedule:run).
|
*/

Schedule::command('credit-due:send-reminders')->dailyAt('09:00');
