<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_ai_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('default_brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('last_brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('last_brand_dna_persona_id')->nullable()->constrained('brand_dna_personas')->nullOnDelete();
            $table->string('last_provider')->nullable();
            $table->string('last_model')->nullable();
            $table->boolean('last_use_brand_dna')->default(false);
            $table->boolean('last_use_knowledge_base')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_ai_preferences');
    }
};
