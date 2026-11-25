<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CloudTime
{
    /**
     * Ambil waktu saat ini langsung dari Cloud Database (bukan jam PHP lokal).
     */
    public static function carbon(): Carbon
    {
        $driver = DB::getDriverName();

        $row = match ($driver) {
            'sqlite' => DB::selectOne('SELECT CURRENT_TIMESTAMP AS cloud_time'),
            default => DB::selectOne('SELECT NOW() AS cloud_time'),
        };

        return Carbon::parse($row->cloud_time);
    }

    /**
     * Kembalikan waktu Cloud Database dalam format ISO-8601 yang konsisten.
     */
    public static function now(): string
    {
        return self::carbon()->toIso8601String();
    }
}
