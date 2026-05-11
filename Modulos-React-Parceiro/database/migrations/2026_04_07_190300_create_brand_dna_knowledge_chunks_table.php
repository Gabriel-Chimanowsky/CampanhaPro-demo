<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dna_knowledge_chunks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_dna_id')->constrained('brand_dnas')->cascadeOnDelete();
            $table->foreignId('brand_dna_knowledge_document_id')->constrained('brand_dna_knowledge_documents')->cascadeOnDelete();
            $table->unsignedInteger('chunk_index');
            $table->longText('content');
            $table->json('embedding')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['brand_dna_id', 'chunk_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dna_knowledge_chunks');
    }
};
