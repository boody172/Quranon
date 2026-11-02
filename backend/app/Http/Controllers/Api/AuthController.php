<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return $this->tokenResponse($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'البريد أو كلمة المرور غير صحيحة.']);
        }

        return $this->tokenResponse($user);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->present($request->user())]);
    }

    /** Permanently deletes the account and everything tied to it (App Store guideline 5.1.1(v)). */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();

        if (! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages(['password' => 'كلمة المرور غير صحيحة.']);
        }

        $user->tokens()->delete();
        $user->delete(); // saved items cascade; orders are kept anonymised for accounting

        return response()->json(status: 204);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(status: 204);
    }

    private function tokenResponse(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $user->createToken('app')->plainTextToken,
            'user' => $this->present($user),
        ], $status);
    }

    private function present(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'plus_until' => $user->plus_until?->toIso8601String()];
    }
}
