<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\CloudTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * POST /api/register — Registrasi akun user baru.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-zA-Z0-9_.-]+$/', 'unique:users,username'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'name' => $validated['name'] ?? $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Ambil kembali created_at & updated_at yang diisi CURRENT_TIMESTAMP Cloud DB.
        $user->refresh();

        $token = $user->createToken('auth_token')->plainTextToken;
        $cloudTime = CloudTime::now();

        return response()->json([
            'message' => 'Registrasi berhasil.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'cloud_time' => $cloudTime,
        ], 201);
    }

    /**
     * POST /api/login — Login dengan login (username/email) + password.
     */
    public function login(Request $request): JsonResponse
    {
        if (! $request->filled('login')) {
            $fallbackLogin = $request->input('username') ?? $request->input('email');
            if ($fallbackLogin !== null) {
                $request->merge(['login' => $fallbackLogin]);
            }
        }

        $validated = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($validated['login']);

        $user = User::query()
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Username/email atau password salah.',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $cloudTime = CloudTime::now();

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'cloud_time' => $cloudTime,
        ]);
    }

    /**
     * POST /api/logout — Revoke token aktif (auth:sanctum).
     */
    public function logout(Request $request): JsonResponse
    {
        $accessToken = $request->user()->currentAccessToken();

        if ($accessToken && method_exists($accessToken, 'delete')) {
            $accessToken->delete();
        }

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * GET /api/me — Mengembalikan data pribadi user yang sedang login + cloud_time dari SELECT NOW().
     */
    public function me(Request $request): JsonResponse
    {
        $cloudTime = CloudTime::now();

        return response()->json([
            'user' => $request->user(),
            'cloud_time' => $cloudTime,
            'server_time' => $cloudTime,
        ]);
    }

    /**
     * GET /api/server-time — Endpoint sinkronisasi jam Cloud Database.
     */
    public function serverTime(): JsonResponse
    {
        $cloudTime = CloudTime::now();

        return response()->json([
            'cloud_time' => $cloudTime,
            'server_time' => $cloudTime,
        ]);
    }

    /**
     * GET /api/users/{userId} — Proteksi privasi profil (hanya boleh mengakses data pribadi milik sendiri).
     */
    public function showProfile(Request $request, int $userId): JsonResponse
    {
        $authUser = $request->user();

        if ((int) $authUser->id !== $userId) {
            return response()->json([
                'message' => 'Akses ditolak. Anda tidak diperbolehkan melihat atau mengakses data pribadi milik user lain.',
            ], 403);
        }

        return response()->json([
            'user' => $authUser,
            'cloud_time' => CloudTime::now(),
        ]);
    }
}
