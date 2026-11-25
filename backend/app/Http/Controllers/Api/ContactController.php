<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * FR-02: Only expose id and username of other registered users (never email/password).
     */
    public function index(Request $request): JsonResponse
    {
        $contacts = User::query()
            ->where('id', '!=', $request->user()->id)
            ->orderBy('username')
            ->get(['id', 'username']);

        return response()->json([
            'contacts' => $contacts,
        ]);
    }
}
