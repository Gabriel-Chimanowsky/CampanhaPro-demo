<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_item_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('content_item_id')->constrained('content_items')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->longText('body')->nullable();
            $table->string('output_file_path')->nullable();
            $table->text('edit_instruction')->nullable();
            $table->string('edit_mode', 24);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('change_reason')->nullable();
            $table->json('brief_snapshot')->nullable();
            $table->json('context_snapshot')->nullable();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->timestamps();

            $table->unique(['content_item_id', 'version_number']);
            $table->index(['content_item_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_item_versions');
    }
};
