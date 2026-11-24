<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Lets an admin (super admin) sign in as a guidance or evaluator account
 * to see exactly what that user sees, then return to their own account.
 *
 * The admin's id is kept in the session under SESSION_KEY while
 * impersonating; HandleInertiaRequests shares it so Layout can show the
 * "Return to admin" banner.
 */
class ImpersonationController extends Controller
{
    public const SESSION_KEY = 'impersonator_id';

    /** Roles an admin may sign in as. Students use the mobile app only. */
    private const IMPERSONATABLE_ROLES = ['guidance', 'evaluator'];

    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        return Inertia::render('UserManagement/Impersonate');
    }

    public function start(Request $request)
    {
        $admin = $request->user();

        if ($admin->role !== 'admin' || $request->session()->has(self::SESSION_KEY)) {
            abort(403, 'Only an admin can sign in as another user.');
        }

        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $target = User::findOrFail($data['user_id']);

        if ($target->id === $admin->id || !in_array($target->role, self::IMPERSONATABLE_ROLES, true)) {
            return back()->with('error', 'You can only sign in as a guidance or evaluator account.');
        }

        Auth::guard('web')->login($target);
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_KEY, $admin->id);

        Log::warning('[Impersonation] Started', [
            'admin_id' => $admin->id,
            'admin_email' => $admin->email,
            'target_id' => $target->id,
            'target_email' => $target->email,
            'target_role' => $target->role,
            'ip' => $request->ip(),
        ]);

        return redirect()->route('/');
    }

    public function stop(Request $request)
    {
        $adminId = $request->session()->get(self::SESSION_KEY);
        $admin = $adminId ? User::find($adminId) : null;

        if (!$admin || $admin->role !== 'admin') {
            $request->session()->forget(self::SESSION_KEY);
            return redirect()->route('/');
        }

        $impersonated = $request->user();

        Auth::guard('web')->login($admin);
        $request->session()->regenerate();
        $request->session()->forget(self::SESSION_KEY);

        Log::warning('[Impersonation] Stopped', [
            'admin_id' => $admin->id,
            'admin_email' => $admin->email,
            'target_id' => optional($impersonated)->id,
            'target_email' => optional($impersonated)->email,
            'ip' => $request->ip(),
        ]);

        return redirect()->route('admin.impersonate');
    }
}
