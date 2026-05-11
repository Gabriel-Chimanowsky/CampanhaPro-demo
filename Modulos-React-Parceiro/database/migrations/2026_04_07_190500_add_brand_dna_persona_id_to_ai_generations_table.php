<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->foreignId('brand_dna_persona_id')
                ->nullable()
                ->after('brand_dna_id')
                ->constrained('brand_dna_personas')
                ->nullOnDelete();

            $table->index(['user_id', 'brand_dna_persona_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('brand_dna_persona_id');
        });
    }
};
