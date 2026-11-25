<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'requested_by',
        'file_name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'backed_up_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
