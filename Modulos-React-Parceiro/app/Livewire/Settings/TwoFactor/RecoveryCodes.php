<?php

namespace App\Livewire\Settings\TwoFactor;

use App\Livewire\Concerns\RequiresPasswordConfirmation;
use Exception;
use Laravel\Fortify\Actions\GenerateNewRecoveryCodes;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\Component;

class RecoveryCodes extends Component
{
    use RequiresPasswordConfirmation;

    #[Locked]
    public array $recoveryCodes = [];

    public bool $showRecoveryCodes = false;

    /**
     * Mount the component.
     */
    public function mount(): void
    {
        if (! $this->passwordConfirmationIsRequired()) {
            $this->loadRecoveryCodes();
        }
    }

    /**
     * Reveal the recovery codes for the user.
     */
    public function revealRecoveryCodes(): void
    {
        if (! $this->ensurePasswordIsConfirmed()) {
            return;
        }

        if (blank($this->recoveryCodes)) {
            $this->loadRecoveryCodes();
        }

        $this->showRecoveryCodes = true;
    }

    /**
     * Hide the recovery codes from the current view.
     */
    public function hideRecoveryCodes(): void
    {
        $this->showRecoveryCodes = false;
    }

    #[Computed]
    public function requiresPasswordConfirmation(): bool
    {
        return $this->passwordConfirmationIsRequired();
    }

    /**
     * Generate new recovery codes for the user.
     */
    public function regenerateRecoveryCodes(GenerateNewRecoveryCodes $generateNewRecoveryCodes): void
    {
        if (! $this->ensurePasswordIsConfirmed()) {
            return;
        }

        $generateNewRecoveryCodes(auth()->user());

        $this->loadRecoveryCodes();
        $this->showRecoveryCodes = true;
    }

    /**
     * Load the recovery codes for the user.
     */
    private function loadRecoveryCodes(): void
    {
        $user = auth()->user();

        if ($user->hasEnabledTwoFactorAuthentication() && $user->two_factor_recovery_codes) {
            try {
                $this->recoveryCodes = json_decode(decrypt($user->two_factor_recovery_codes), true);
            } catch (Exception) {
                $this->addError('recoveryCodes', 'Failed to load recovery codes');

                $this->recoveryCodes = [];
            }
        }
    }
}
