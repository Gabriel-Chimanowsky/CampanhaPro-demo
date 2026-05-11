<?php

namespace App\Actions\Settings;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class UpdateProfile
{
    /**
     * Persist profile changes for the given user.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function handle(User $user, array $attributes, ?UploadedFile $avatar = null, bool $removeAvatar = false): User
    {
        $oldAvatarPath = $user->avatar_path;
        $newAvatarPath = null;

        if ($avatar) {
            $newAvatarPath = $avatar->store("avatars/{$user->id}", 'public');
            $attributes['avatar_path'] = $newAvatarPath;
            $removeAvatar = false;
        } elseif ($removeAvatar) {
            $attributes['avatar_path'] = null;
        }

        $emailChanged = array_key_exists('email', $attributes) && $attributes['email'] !== $user->email;

        $user->fill($attributes);

        if ($emailChanged) {
            $user->forceFill(['email_verified_at' => null]);
        }

        $user->save();

        if ($oldAvatarPath && ($avatar || $removeAvatar) && $oldAvatarPath !== $newAvatarPath) {
            Storage::disk('public')->delete($oldAvatarPath);
        }

        return $user->refresh();
    }
}
