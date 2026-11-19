<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role' => 'user',
        ]);

        return $this->tokenResponse($user, $request->validated('device_name') ?? 'lunabbia-frontend', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['A megadott e-mail-cím vagy jelszó nem megfelelő.'],
            ]);
        }

        return $this->tokenResponse($user, $request->validated('device_name') ?? 'lunabbia-frontend');
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->userData($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sikeres kijelentkezés.']);
    }

    private function tokenResponse(User $user, string $deviceName, int $status = 200): JsonResponse
    {
        $abilities = $user->isAdmin() ? ['admin'] : ['customer'];
        $token = $user->createToken($deviceName, $abilities)->plainTextToken;

        return response()->json([
            'message' => 'Sikeres belépés.',
            'data' => [
                'user' => $this->userData($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], $status);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}

