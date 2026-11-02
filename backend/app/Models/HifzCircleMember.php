<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class HifzCircleMember extends Pivot
{
    protected $table = 'hifz_circle_members';

    public $incrementing = true;

    protected function casts(): array
    {
        return ['last_done_on' => 'date'];
    }
}
