<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dna_examples', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_dna_id')->constrained('brand_dnas')->cascadeOnDelete();
            $table->string('title', 120);
            $table->longText('content');
            $table->string('content_type', 80)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['brand_dna_id', 'content_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dna_examples');
    }
};
