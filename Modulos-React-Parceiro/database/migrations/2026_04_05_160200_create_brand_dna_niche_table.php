<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dna_niche', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_dna_id')->constrained()->cascadeOnDelete();
            $table->foreignId('niche_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['brand_dna_id', 'niche_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dna_niche');
    }
};
