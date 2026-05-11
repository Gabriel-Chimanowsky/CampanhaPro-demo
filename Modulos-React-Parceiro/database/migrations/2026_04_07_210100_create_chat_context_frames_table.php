<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_context_frames', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_session_id')->constrained('chat_sessions')->cascadeOnDelete();
            $table->foreignId('inherits_from_id')->nullable()->constrained('chat_context_frames')->nullOnDelete();
            $table->foreignId('brand_dna_id')->nullable()->constrained('brand_dnas')->nullOnDelete();
            $table->foreignId('brand_dna_persona_id')->nullable()->constrained('brand_dna_personas')->nullOnDelete();
            $table->boolean('knowledge_enabled')->default(false);
            $table->boolean('web_search_enabled')->default(false);
            $table->longText('system_snapshot')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['chat_session_id', 'brand_dna_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_context_frames');
    }
};
