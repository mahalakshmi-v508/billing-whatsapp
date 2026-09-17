<?php

namespace App\Console\Commands;

use App\Services\TransactionMessageService;
use Illuminate\Console\Command;

class SendCreditDueReminders extends Command
{
    protected $signature = 'credit-due:send-reminders {--company= : Limit the check to a specific company ID}';

    protected $description = 'Auto-send Credit Due WhatsApp reminders for outstanding credit invoices past their configured credit period';

    public function handle(TransactionMessageService $service): int
    {
        $company = $this->option('company') !== null ? (int) $this->option('company') : 0;
        $stats = $service->checkCreditDueReminders($company);

        $this->info('Credit Due reminder check completed.');
        $this->line('Companies checked : ' . $stats['companies_checked']);
        $this->line('Invoices evaluated: ' . $stats['invoices_evaluated']);
        $this->line('Sent             : ' . $stats['sent']);
        $this->line('Failed           : ' . $stats['failed']);

        $skipped = $stats['skipped'];
        foreach ($skipped as $reason => $count) {
            $this->line("Skipped ({$reason}): {$count}");
        }

        return 0;
    }
}