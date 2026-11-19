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
        return response()->json([
            'data' => $this->userData($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:40'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'street_address' => ['nullable', 'string', 'max:150'],
            'address_extra' => ['nullable', 'string', 'max:100'],
        ]);

        $user = $request->user();
        $user->fill($validated);

        $addressFields = [
            'postal_code',
            'city',
            'street_address',
            'address_extra',
        ];

        if (array_intersect($addressFields, array_keys($validated))) {
            $locality = trim(
                ($user->postal_code ?? '') . ' ' . ($user->city ?? '')
            );

            $addressParts = array_filter([
                $locality,
                $user->street_address,
                $user->address_extra,
            ], fn ($part) => $part !== null && trim($part) !== '');

            $address = implode(', ', $addressParts);

            if (mb_strlen($address) > 255) {
                throw ValidationException::withMessages([
                    'address' => ['A teljes szállítási cím legfeljebb 255 karakter lehet.'],
                ]);
            }

            $user->address = $address !== '' ? $address : null;
        }

        $user->save();

        return response()->json([
            'message' => 'A szállítási adatok sikeresen mentve.',
            'data' => $this->userData($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Sikeres kijelentkezés.',
        ]);
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
            'phone' => $user->phone,
            'address' => $user->address,
            'postal_code' => $user->postal_code,
            'city' => $user->city,
            'street_address' => $user->street_address,
            'address_extra' => $user->address_extra,
        ];
    }
}