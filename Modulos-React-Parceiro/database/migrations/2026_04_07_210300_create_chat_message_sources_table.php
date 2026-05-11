<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_message_sources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->string('source_type', 24);
            $table->foreignId('brand_dna_knowledge_document_id')->nullable()->constrained('brand_dna_knowledge_documents')->nullOnDelete();
            $table->foreignId('brand_dna_knowledge_chunk_id')->nullable()->constrained('brand_dna_knowledge_chunks')->nullOnDelete();
            $table->string('title', 200)->nullable();
            $table->string('url')->nullable();
            $table->text('excerpt')->nullable();
            $table->decimal('score', 10, 6)->nullable();
            $table->unsignedInteger('rank')->default(1);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['chat_message_id', 'rank']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_message_sources');
    }
};
