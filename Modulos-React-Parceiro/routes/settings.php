<?php

use App\Livewire\Settings\Overview;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::livewire('settings', Overview::class)->name('settings.edit');

    Route::redirect('settings/profile', 'settings')->name('profile.edit');
    Route::redirect('settings/security', 'settings')->name('security.edit');
    Route::redirect('settings/appearance', 'settings')->name('appearance.edit');
});
