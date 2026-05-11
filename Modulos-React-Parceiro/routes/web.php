<?php

use App\Http\Controllers\Ai\StoreChatTurnController;
use App\Http\Controllers\Ai\StreamChatMessageController;
use App\Http\Controllers\Ai\UpdateChatSessionContextController;
use App\Http\Controllers\Install\InstallerController;
use App\Livewire\Ai\ChatWorkspace;
use App\Livewire\Ai\ContentItemShow;
use App\Livewire\Ai\ContentLibrary;
use App\Livewire\Ai\GenerationHistory;
use App\Livewire\Ai\GenerationShow;
use App\Livewire\Ai\RunTemplate;
use App\Livewire\Ai\TemplateCatalog;
use App\Livewire\BrandDna\BrandDnaForm;
use App\Livewire\BrandDna\BrandDnaIndex;
use App\Livewire\Dashboard\Dashboard;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => auth()->check() ? redirect()->route('dashboard') : redirect()->route('login'))->name('home');

Route::prefix('install')->name('install.')->group(function (): void {
    Route::get('/', [InstallerController::class, 'index'])->name('index');
    Route::get('requirements', [InstallerController::class, 'requirements'])->name('requirements');
    Route::get('environment', [InstallerController::class, 'environment'])->name('environment');
    Route::post('environment', [InstallerController::class, 'storeEnvironment'])->name('environment.store');
    Route::get('database', [InstallerController::class, 'database'])->name('database');
    Route::post('database', [InstallerController::class, 'storeDatabase'])->name('database.store');
    Route::get('run', [InstallerController::class, 'run'])->name('run');
    Route::post('run', [InstallerController::class, 'execute'])->name('run.execute');
    Route::get('finish', [InstallerController::class, 'finish'])->name('finish');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', Dashboard::class)->name('dashboard');

    Route::prefix('dashboard/ai')->name('ai.')->group(function (): void {
        Route::get('templates', TemplateCatalog::class)->name('templates.index');
        Route::get('library', ContentLibrary::class)->name('library.index');
        Route::get('library/{contentItem}', ContentItemShow::class)->name('library.show');
        Route::get('templates/{template:slug}', RunTemplate::class)->name('templates.show');
        Route::get('generations', GenerationHistory::class)->name('generations.index');
        Route::get('generations/{generation}', GenerationShow::class)->name('generations.show');
        Route::get('chat', ChatWorkspace::class)->name('chat.index');
        Route::get('chat/{chatSession}', ChatWorkspace::class)->name('chat.show');
        Route::patch('chat/{chatSession}/context', UpdateChatSessionContextController::class)->name('chat.context.update');
        Route::post('chat/turns', StoreChatTurnController::class)->name('chat.turns.store');
        Route::get('chat/messages/{chatMessage}/stream', StreamChatMessageController::class)->name('chat.messages.stream');
    });

    Route::prefix('dashboard/brand-dna')->name('brands.')->group(function (): void {
        Route::get('/', BrandDnaIndex::class)->name('index');
        Route::get('create', BrandDnaForm::class)->name('create');
        Route::get('{brandDna}/edit', BrandDnaForm::class)->name('edit');
    });
});

require __DIR__.'/settings.php';
