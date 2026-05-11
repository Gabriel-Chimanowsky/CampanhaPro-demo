<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_generation_id')->nullable()->constrained('ai_generations')->nullOnDelete();
            $table->foreignId('guided_brief_id')->nullable()->constrained('guided_briefs')->nullOnDelete();
            $table->foreignId('ai_template_id')->nullable()->constrained('ai_templates')->nullOnDelete();
            $table->foreignId('brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('brand_dna_persona_id')->nullable()->constrained('brand_dna_personas')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('campaign_package_id')->nullable()->index();
            $table->foreignId('parent_content_item_id')->nullable()->constrained('content_items')->nullOnDelete();
            $table->foreignId('root_content_item_id')->nullable()->constrained('content_items')->nullOnDelete();
            $table->string('type', 16);
            $table->string('channel')->nullable();
            $table->string('objective')->nullable();
            $table->string('tone')->nullable();
            $table->string('title');
            $table->longText('body')->nullable();
            $table->string('output_file_path')->nullable();
            $table->string('status', 24)->default('in_review');
            $table->boolean('is_favorited')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
            $table->index(['user_id', 'is_favorited']);
            $table->index(['brand_dna_id', 'status']);
            $table->index(['channel', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_items');
    }
};
