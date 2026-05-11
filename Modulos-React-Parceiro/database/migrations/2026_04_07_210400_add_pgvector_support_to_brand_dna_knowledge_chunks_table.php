<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brand_dna_knowledge_chunks', function (Blueprint $table): void {
            $table->timestamp('embedded_at')->nullable()->after('embedding');
        });

        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
        DB::statement('ALTER TABLE brand_dna_knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536)');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE brand_dna_knowledge_chunks DROP COLUMN IF EXISTS embedding_vector');
        }

        Schema::table('brand_dna_knowledge_chunks', function (Blueprint $table): void {
            $table->dropColumn('embedded_at');
        });
    }
};
