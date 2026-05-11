<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dna_personas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_dna_id')->constrained('brand_dnas')->cascadeOnDelete();
            $table->string('label', 120);
            $table->text('characteristics');
            $table->string('awareness_level', 60)->nullable();
            $table->text('objections')->nullable();
            $table->text('desired_outcomes')->nullable();
            $table->timestamps();

            $table->index(['brand_dna_id', 'label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dna_personas');
    }
};
