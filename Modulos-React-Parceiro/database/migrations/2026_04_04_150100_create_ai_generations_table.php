<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_template_id')->constrained('ai_templates')->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('provider');
            $table->string('model')->nullable();
            $table->string('status', 16);
            $table->json('input_payload');
            $table->longText('prompt_snapshot')->nullable();
            $table->longText('output_text')->nullable();
            $table->string('output_file_path')->nullable();
            $table->text('error_message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generations');
    }
};
