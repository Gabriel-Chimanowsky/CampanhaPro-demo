<?php

namespace App\Livewire\Concerns;

use Laravel\Fortify\Features;

trait RequiresPasswordConfirmation
{
    protected function passwordConfirmationIsRequired(): bool
    {
        if (! Features::canManageTwoFactorAuthentication()) {
            return false;
        }

        if (! Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')) {
            return false;
        }

        $confirmedAt = (int) session('auth.password_confirmed_at', 0);
        $passwordTimeout = (int) config('auth.password_timeout', 900);

        return $confirmedAt < now()->subSeconds($passwordTimeout)->unix();
    }

    protected function ensurePasswordIsConfirmed(string $fragment = 'security'): bool
    {
        if (! $this->passwordConfirmationIsRequired()) {
            return true;
        }

        session()->put('url.intended', route('settings.edit')."#{$fragment}");

        $this->redirect(route('password.confirm'), navigate: true);

        return false;
    }
}
