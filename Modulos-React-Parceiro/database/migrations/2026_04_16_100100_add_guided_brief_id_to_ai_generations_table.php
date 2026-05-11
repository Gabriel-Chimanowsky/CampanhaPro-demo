<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->foreignId('guided_brief_id')
                ->nullable()
                ->after('source_generation_id')
                ->constrained('guided_briefs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('guided_brief_id');
        });
    }
};
