<?php

namespace App\Concerns;

use App\Models\User;
use DateTimeZone;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
            'avatar' => $this->avatarRules(),
            'timezone' => $this->timezoneRules(),
            'locale' => $this->localeRules(),
            'role' => $this->roleRules(),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user avatars.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function avatarRules(): array
    {
        return ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'];
    }

    /**
     * Get the validation rules used to validate user timezones.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function timezoneRules(): array
    {
        return [
            'nullable',
            'string',
            Rule::in($this->timezoneIdentifiers()),
        ];
    }

    /**
     * Get the validation rules used to validate user locales.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function localeRules(): array
    {
        return [
            'required',
            'string',
            'max:10',
            Rule::in(array_keys($this->supportedLocales())),
        ];
    }

    /**
     * Get the validation rules used to validate user roles.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function roleRules(): array
    {
        return [
            'nullable',
            'string',
            'max:120',
        ];
    }

    /**
     * Get the list of supported locales for the account settings UI.
     *
     * @return array<string, string>
     */
    protected function supportedLocales(): array
    {
        return [
            'en' => 'English',
            'pt_BR' => 'Português (Brasil)',
        ];
    }

    /**
     * Get the suggested roles for user and chat personalization.
     *
     * @return array<int, string>
     */
    protected function supportedRoles(): array
    {
        return array_values(array_filter(array_map(
            static fn (mixed $role): ?string => is_string($role) && $role !== '' ? $role : null,
            (array) config('chat.roles.suggestions', []),
        )));
    }

    /**
     * Get the list of allowed timezone identifiers.
     *
     * @return array<int, string>
     */
    protected function timezoneIdentifiers(): array
    {
        static $timezones;

        return $timezones ??= DateTimeZone::listIdentifiers();
    }
}
