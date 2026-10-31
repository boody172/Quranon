<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * The only way to create an admin. There is no sign-up form for the dashboard.
 */
#[Signature('quranon:admin {email} {--name=Admin}')]
#[Description('Create the dashboard admin, or reset their password')]
class MakeAdmin extends Command
{
    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->secret('Password (min 12 characters)');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => ['required', 'email'], 'password' => ['required', Password::min(12)->letters()->numbers()]],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => $user->name ?? $this->option('name'),
            'password' => $password,
            'is_admin' => true,
        ])->save();

        $this->info("Admin ready: {$email}");

        return self::SUCCESS;
    }
}
