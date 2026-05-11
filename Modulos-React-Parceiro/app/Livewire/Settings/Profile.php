<?php

namespace App\Livewire\Settings;

use App\Actions\Settings\UpdateProfile;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithFileUploads;

#[Title('Profile settings')]
class Profile extends Component
{
    use ProfileValidationRules;
    use WithFileUploads;

    public string $name = '';

    public string $email = '';

    public string $timezone = '';

    public string $locale = 'en';

    public string $role = '';

    public mixed $avatar = null;

    public bool $removeAvatar = false;

    /**
     * Mount the component.
     */
    public function mount(): void
    {
        $this->fillFromUser(Auth::user());
    }

    /**
     * Validate the avatar when a new file is selected.
     */
    public function updatedAvatar(): void
    {
        $this->removeAvatar = false;

        Validator::make(
            ['avatar' => $this->avatar],
            ['avatar' => $this->avatarRules()],
        )->validate();
    }

    /**
     * Update the profile information for the currently authenticated user.
     */
    public function updateProfileInformation(UpdateProfile $updateProfile): void
    {
        $user = Auth::user();

        $validated = Validator::make(
            $this->profilePayload(),
            $this->profileRules($user->id),
        )->validate();

        $updatedUser = $updateProfile->handle(
            user: $user,
            attributes: collect($validated)->except('avatar')->all(),
            avatar: $validated['avatar'] ?? null,
            removeAvatar: $this->removeAvatar,
        );

        Auth::setUser($updatedUser);

        $this->fillFromUser($updatedUser);
        $this->avatar = null;

        $this->dispatch('profile-updated', name: $updatedUser->name);
    }

    /**
     * Clear a newly selected avatar without removing the saved one.
     */
    public function clearAvatarSelection(): void
    {
        $this->avatar = null;
        $this->resetValidation('avatar');
    }

    /**
     * Mark the current avatar for removal on save.
     */
    public function markAvatarForRemoval(): void
    {
        $this->clearAvatarSelection();
        $this->removeAvatar = true;
    }

    /**
     * Cancel a pending avatar removal.
     */
    public function undoAvatarRemoval(): void
    {
        $this->removeAvatar = false;
    }

    /**
     * Send an email verification notification to the current user.
     */
    public function resendVerificationNotification(): void
    {
        $user = Auth::user();

        if ($user->hasVerifiedEmail()) {
            $this->redirectIntended(default: route('dashboard', absolute: false));

            return;
        }

        $user->sendEmailVerificationNotification();

        Session::flash('status', 'verification-link-sent');
    }

    #[Computed]
    public function hasUnverifiedEmail(): bool
    {
        /** @var MustVerifyEmail $user */
        $user = Auth::user();

        return ! $user->hasVerifiedEmail();
    }

    #[Computed]
    public function showDeleteUser(): bool
    {
        return ! $this->hasUnverifiedEmail();
    }

    #[Computed]
    public function avatarPreviewUrl(): ?string
    {
        if ($this->avatar && method_exists($this->avatar, 'isPreviewable') && $this->avatar->isPreviewable()) {
            return $this->avatar->temporaryUrl();
        }

        if ($this->removeAvatar) {
            return null;
        }

        return Auth::user()->avatarUrl();
    }

    /**
     * Get the locale options available on this screen.
     *
     * @return array<string, string>
     */
    #[Computed]
    public function availableLocales(): array
    {
        return $this->supportedLocales();
    }

    /**
     * Suggested role labels used across profile and chat.
     *
     * @return array<int, string>
     */
    #[Computed]
    public function availableRoles(): array
    {
        return $this->supportedRoles();
    }

    /**
     * Group timezone identifiers by region for the select input.
     *
     * @return array<string, array<string, string>>
     */
    #[Computed]
    public function timezoneGroups(): array
    {
        $groups = [];

        foreach ($this->timezoneIdentifiers() as $identifier) {
            [$region, $city] = array_pad(explode('/', $identifier, 2), 2, null);

            $group = str_replace('_', ' ', $city ? $region : 'Other');
            $label = str_replace('_', ' ', $city ?? $region);

            $groups[$group][$identifier] = $city
                ? str_replace('/', ' / ', $label)
                : $label;
        }

        ksort($groups);

        return $groups;
    }

    /**
     * Normalize the public component state for validation and persistence.
     *
     * @return array<string, mixed>
     */
    protected function profilePayload(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar,
            'timezone' => blank($this->timezone) ? null : $this->timezone,
            'locale' => $this->locale,
            'role' => blank($this->role) ? null : trim($this->role),
        ];
    }

    /**
     * Hydrate the Livewire properties from the authenticated user.
     */
    protected function fillFromUser(User $user): void
    {
        $this->name = $user->name;
        $this->email = $user->email;
        $this->timezone = $user->timezone ?? '';
        $this->locale = $user->locale ?: 'en';
        $this->role = $user->role ?? '';
        $this->removeAvatar = false;
    }
}
