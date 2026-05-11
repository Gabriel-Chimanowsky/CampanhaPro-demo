<?php

namespace App\Models;

use Database\Factories\NicheFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Niche extends Model
{
    /** @use HasFactory<NicheFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
    ];

    public function brandDnas(): BelongsToMany
    {
        return $this->belongsToMany(BrandDna::class)->withTimestamps();
    }
}
