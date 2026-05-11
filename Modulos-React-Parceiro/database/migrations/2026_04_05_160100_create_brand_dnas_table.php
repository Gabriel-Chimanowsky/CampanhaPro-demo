<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_dnas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('primary_product', 120);
            $table->string('primary_logo_path')->nullable();
            $table->string('monochrome_logo_path')->nullable();
            $table->string('icon_logo_path')->nullable();
            $table->json('brand_colors');
            $table->string('default_tone', 60);
            $table->string('custom_tone', 120)->nullable();
            $table->text('pitch_bio');
            $table->json('target_age_ranges');
            $table->string('target_gender', 16);
            $table->string('sales_model', 16);
            $table->string('default_language', 12);
            $table->json('forbidden_words')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_dnas');
    }
};
