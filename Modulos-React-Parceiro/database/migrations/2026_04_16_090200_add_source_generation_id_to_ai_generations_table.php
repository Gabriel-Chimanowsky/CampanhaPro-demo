<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->foreignId('source_generation_id')
                ->nullable()
                ->after('ai_template_id')
                ->constrained('ai_generations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('source_generation_id');
        });
    }
};
