<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dna_knowledge_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_dna_id')->constrained('brand_dnas')->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('title', 160);
            $table->string('source_url')->nullable();
            $table->string('source_filename')->nullable();
            $table->longText('content')->nullable();
            $table->text('summary')->nullable();
            $table->json('meta')->nullable();
            $table->string('ingestion_status', 24)->default('pending');
            $table->text('ingestion_error')->nullable();
            $table->timestamp('ingested_at')->nullable();
            $table->timestamp('last_processed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['brand_dna_id', 'type']);
            $table->index(['brand_dna_id', 'ingestion_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dna_knowledge_documents');
    }
};
