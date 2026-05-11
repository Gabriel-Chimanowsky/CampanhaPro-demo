<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_ai_template_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_template_id')->constrained('ai_templates')->cascadeOnDelete();
            $table->foreignId('brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('brand_dna_persona_id')->nullable()->constrained('brand_dna_personas')->nullOnDelete();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->boolean('use_knowledge_base')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'ai_template_id'], 'user_ai_template_preferences_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_ai_template_preferences');
    }
};
