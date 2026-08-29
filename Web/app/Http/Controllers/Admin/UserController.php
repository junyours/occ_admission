<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function managePassword()
    {
        return Inertia::render('UserManagement/ManagePassword');
    }

    public function searchUser(Request $request)
    {
        $query = $request->input('query', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $users = User::where('username', 'like', "%{$query}%")
            ->orWhere('email', 'like', "%{$query}%")
            ->orWhere('role', 'like', "%{$query}%")
            ->select('id', 'username', 'email', 'role')
            ->limit(10)
            ->get();

        return response()->json($users);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'password' => 'required|string|min:6',
        ]);

        $user = User::findOrFail($request->user_id);
        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    public function viewUsers(){
        return Inertia::render('UserManagement/Users');
    }
}
