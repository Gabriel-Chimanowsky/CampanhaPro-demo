<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_session_id')->constrained('chat_sessions')->cascadeOnDelete();
            $table->foreignId('context_frame_id')->nullable()->constrained('chat_context_frames')->nullOnDelete();
            $table->string('role', 24);
            $table->longText('content')->nullable();
            $table->string('provider', 80)->nullable();
            $table->string('model', 120)->nullable();
            $table->string('status', 24)->default('pending');
            $table->unsignedInteger('message_index');
            $table->json('meta')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['chat_session_id', 'message_index']);
            $table->index(['chat_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
