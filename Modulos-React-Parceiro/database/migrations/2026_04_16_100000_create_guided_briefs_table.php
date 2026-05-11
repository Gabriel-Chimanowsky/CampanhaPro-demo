<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guided_briefs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_template_id')->constrained('ai_templates')->cascadeOnDelete();
            $table->foreignId('source_guided_brief_id')->nullable()->constrained('guided_briefs')->nullOnDelete();
            $table->foreignId('brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('brand_dna_persona_id')->nullable()->constrained('brand_dna_personas')->nullOnDelete();
            $table->json('answers');
            $table->json('input_payload');
            $table->text('summary')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'ai_template_id']);
            $table->index('brand_dna_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guided_briefs');
    }
};
