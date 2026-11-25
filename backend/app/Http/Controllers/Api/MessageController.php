<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Support\CloudTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    /**
     * GET /api/contacts — Mengambil daftar user lain (hanya id dan username, tanpa email/data pribadi).
     */
    public function contacts(Request $request): JsonResponse
    {
        $contacts = User::query()
            ->where('id', '!=', $request->user()->id)
            ->select(['id', 'username'])
            ->orderBy('username')
            ->get();

        return response()->json([
            'contacts' => $contacts,
            'data' => $contacts,
            'cloud_time' => CloudTime::now(),
        ]);
    }

    /**
     * GET /api/messages/{userId} — Mengambil riwayat chat HANYA antara user yang login dan {userId}.
     */
    public function index(Request $request, int $userId): JsonResponse
    {
        $authId = (int) $request->user()->id;

        // Cegah percobaan manipulasi parameter user lain (Anti-IDOR).
        foreach (['sender_id', 'user_id', 'as_user_id'] as $param) {
            if ($request->filled($param) && (int) $request->query($param) !== $authId) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda tidak diperbolehkan membaca percakapan milik user lain.',
                ], 403);
            }
        }

        if ($userId === $authId) {
            return response()->json([
                'message' => 'Tidak dapat membuka ruang percakapan dengan diri sendiri.',
            ], 422);
        }

        $contact = User::query()
            ->select(['id', 'username'])
            ->find($userId);

        if (! $contact) {
            return response()->json([
                'message' => 'Kontak pengguna tidak ditemukan.',
            ], 404);
        }

        $messages = Message::query()
            ->where(function ($query) use ($authId, $userId) {
                $query->where('sender_id', $authId)
                    ->where('receiver_id', $userId);
            })
            ->orWhere(function ($query) use ($authId, $userId) {
                $query->where('sender_id', $userId)
                    ->where('receiver_id', $authId);
            })
            ->orderBy('sent_at', 'asc')
            ->orderBy('id', 'asc')
            ->get(['id', 'sender_id', 'receiver_id', 'message_text', 'sent_at']);

        return response()->json([
            'contact' => $contact,
            'messages' => $messages,
            'data' => $messages,
            'cloud_time' => CloudTime::now(),
        ]);
    }

    /**
     * POST /api/messages — Mengirim pesan baru (receiver_id, message_text), sent_at diisi CURRENT_TIMESTAMP Cloud DB.
     */
    public function store(Request $request): JsonResponse
    {
        $authId = (int) $request->user()->id;

        if ($request->filled('sender_id') && (int) $request->input('sender_id') !== $authId) {
            return response()->json([
                'message' => 'Akses ditolak. Tidak dapat mengirim pesan atas nama pengguna lain.',
            ], 403);
        }

        $validated = $request->validate([
            'receiver_id' => [
                'required',
                'integer',
                'exists:users,id',
                Rule::notIn([$authId]),
            ],
            'message_text' => ['required', 'string', 'max:5000', 'regex:/\S/'],
        ], [
            'receiver_id.not_in' => 'Tidak dapat mengirim pesan ke diri sendiri.',
            'message_text.regex' => 'Isi pesan tidak boleh kosong.',
        ]);

        $message = Message::create([
            'sender_id' => $authId,
            'receiver_id' => (int) $validated['receiver_id'],
            'message_text' => trim($validated['message_text']),
        ]);

        // Ambil sent_at yang di-generate oleh CURRENT_TIMESTAMP Cloud Database.
        $message->refresh();

        return response()->json([
            'message' => 'Pesan berhasil dikirim.',
            'data' => $message,
            'cloud_time' => CloudTime::now(),
        ], 201);
    }
}
