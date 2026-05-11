<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brand_dnas', function (Blueprint $table): void {
            $table->text('brand_description')->nullable()->after('pitch_bio');
            $table->text('competitive_differentiators')->nullable()->after('brand_description');
            $table->json('writing_styles')->nullable()->after('default_language');
            $table->json('frequent_terms')->nullable()->after('writing_styles');
            $table->text('communication_notes')->nullable()->after('forbidden_words');
        });
    }

    public function down(): void
    {
        Schema::table('brand_dnas', function (Blueprint $table): void {
            $table->dropColumn([
                'brand_description',
                'competitive_differentiators',
                'writing_styles',
                'frequent_terms',
                'communication_notes',
            ]);
        });
    }
};
