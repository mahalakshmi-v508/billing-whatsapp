<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('whatsapp-chat', function () {
    return true;
});
