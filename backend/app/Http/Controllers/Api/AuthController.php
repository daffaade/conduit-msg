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
            'name'     => ['nullable', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'name'     => $validated['name'] ?? $validated['username'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Refresh to get created_at / updated_at set by CURRENT_TIMESTAMP on Cloud DB.
        $user->refresh();

        $token     = $user->createToken('auth_token')->plainTextToken;
        $cloudTime = CloudTime::now();

        return response()->json([
            'message'    => 'Registrasi berhasil.',
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => $user,
            'cloud_time' => $cloudTime,
        ], 201);
    }

    /**
     * POST /api/login — Login dengan `login` (username/email), atau field terpisah `email`/`username` + `password`.
     *
     * Accepts any of:
     *   { "login": "alice" }          — single field (username or email)
     *   { "email": "alice@..." }      — email only
     *   { "username": "alice" }       — username only
     *   { "email": "...", "username": "alice" } — both (must match the same user)
     */
    public function login(Request $request): JsonResponse
    {
        if ($request->filled('login')) {
            // Single unified field: match against username OR email.
            $validated  = $request->validate([
                'login'    => ['required', 'string'],
                'password' => ['required', 'string'],
            ]);
            $identifier = trim($validated['login']);
            $user = User::query()
                ->where('username', $identifier)
                ->orWhere('email', $identifier)
                ->first();
        } else {
            // Separate email / username fields.
            $validated = $request->validate([
                'email'    => ['required_without:username', 'nullable', 'string', 'email'],
                'username' => ['required_without:email', 'nullable', 'string', 'regex:/^[a-zA-Z0-9_.-]+$/'],
                'password' => ['required', 'string'],
            ]);
            $user = User::query()
                ->when(! empty($validated['email']),    fn ($q) => $q->where('email',    trim($validated['email'])))
                ->when(! empty($validated['username']), fn ($q) => $q->where('username', trim($validated['username'])))
                ->first();
        }

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Username/email atau password salah.',
            ], 401);
        }

        $token     = $user->createToken('auth_token')->plainTextToken;
        $cloudTime = CloudTime::now();

        return response()->json([
            'message'    => 'Login berhasil.',
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => $user,
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
     * GET /api/me — Data pribadi user yang sedang login + cloud_time (FR-04).
     */
    public function me(Request $request): JsonResponse
    {
        $cloudTime = CloudTime::now();

        return response()->json([
            'user'        => $request->user(),
            'cloud_time'  => $cloudTime,
            'server_time' => $cloudTime,
        ]);
    }

    /**
     * GET /api/server-time — Sinkronisasi jam Cloud Database untuk UI React (FR-04).
     */
    public function serverTime(): JsonResponse
    {
        $cloudTime = CloudTime::now();

        return response()->json([
            'cloud_time'  => $cloudTime,
            'server_time' => $cloudTime,
        ]);
    }

    /**
     * GET /api/users/{userId} — Profil pribadi; 403 jika user lain mencoba akses (FR-02).
     */
    public function showProfile(Request $request, int $userId): JsonResponse
    {
        $authUser = $request->user();

        if ((int) $authUser->id !== $userId) {
            return response()->json([
                'message' => 'Akses ditolak. Anda tidak diperbolehkan melihat data pribadi milik user lain.',
            ], 403);
        }

        return response()->json([
            'user'       => $authUser,
            'cloud_time' => CloudTime::now(),
        ]);
    }
}
