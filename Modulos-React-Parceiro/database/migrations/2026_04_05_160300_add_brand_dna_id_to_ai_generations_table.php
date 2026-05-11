<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->foreignId('brand_dna_id')
                ->nullable()
                ->after('ai_template_id')
                ->constrained('brand_dnas')
                ->nullOnDelete();

            $table->index(['user_id', 'brand_dna_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('brand_dna_id');
        });
    }
};
