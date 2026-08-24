<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketCommentAttachment extends Model
{
    use HasFactory;

    protected $guarded = [];
    public $timestamps = false;

    public function comment()
    {
        return $this->belongsTo(TicketComment::class, 'comment_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
