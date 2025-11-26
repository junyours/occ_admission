import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const Profile = ({ user, guidanceCounselor }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: guidanceCounselor?.name || '',
        address: guidanceCounselor?.address || '',
        email: user?.email || '',
        username: user?.username || ''
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        router.put('/guidance/profile', formData, {
            onSuccess: () => {
                setIsEditing(false);
                window.showAlert('Profile updated successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to update profile', 'error');
            }
        });
    };

    const handlePasswordChange = (e) => {
        e.preventDefault();
        
        // Validate that passwords match
        if (passwordData.new_password !== passwordData.new_password_confirmation) {
            window.showAlert('New passwords do not match', 'error');
            return;
        }
        
        // Validate password length
        if (passwordData.new_password.length < 8) {
            window.showAlert('New password must be at least 8 characters long', 'error');
            return;
        }
        
        router.put('/guidance/profile/password', passwordData, {
            onSuccess: () => {
                setIsChangingPassword(false);
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    new_password_confirmation: ''
                });
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                window.showAlert('Password changed successfully', 'success');
            },
            onError: (errors) => {
                if (errors.current_password) {
                    window.showAlert('Current password is incorrect', 'error');
                } else {
                    window.showAlert('Failed to change password', 'error');
                }
            }
        });
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '60ms' }}>
                    {/* Header Section */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '120ms' }}>
                        <div className="px-8 py-8">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                <div className="flex items-start gap-6">
                                    <div className="w-20 h-20 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center text-2xl font-bold">
                                        {(guidanceCounselor?.name || user?.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h1 className="text-3xl font-bold md:text-4xl mb-2">{guidanceCounselor?.name || 'Profile Management'}</h1>
                                        <p className="text-sm text-white/80 mb-6">Manage your account information and preferences</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500">Username</div>
                                                        <div className="text-sm font-semibold text-[#1D293D]">{user?.username || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500">Role</div>
                                                        <div className="text-sm font-semibold text-[#1D293D] capitalize">{user?.role || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500">Member Since</div>
                                                        <div className="text-sm font-semibold text-[#1D293D]">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {guidanceCounselor?.address && (
                                                <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 20s6-5.686 6-10A6 6 0 104 10c0 4.314 6 10 6 10z" /></svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500">Address</div>
                                                            <div className="text-sm font-semibold text-[#1D293D]">{guidanceCounselor.address}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 lg:items-end">
                                    <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1447E6] text-white font-semibold hover:bg-[#1240d0] transition-colors duration-150">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                    <button onClick={() => setIsChangingPassword(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors duration-150">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile Form */}
                    {isEditing && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 animate-up" style={{ animationDelay: '160ms' }}>
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Edit Personal Information</h3>
                                            <p className="text-sm text-slate-500">Update your account details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                disabled
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                                                placeholder="Username is managed by the system"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                placeholder="Enter your email address"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Address
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                placeholder="Enter your address"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-[#1447E6] text-white rounded-xl hover:bg-[#1240d0] transition-colors font-semibold"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Change Password Form */}
                    {isChangingPassword && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Change Password</h3>
                                            <p className="text-sm text-slate-500">Update your account security</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsChangingPassword(false)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handlePasswordChange} className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Current Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    value={passwordData.current_password}
                                                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                                    className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                    placeholder="Enter your current password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                >
                                                    {showCurrentPassword ? (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={passwordData.new_password}
                                                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                                    className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                    placeholder="Enter your new password"
                                                    required
                                                    minLength="8"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                Confirm New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={passwordData.new_password_confirmation}
                                                    onChange={(e) => setPasswordData({...passwordData, new_password_confirmation: e.target.value})}
                                                    className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200 bg-white text-[#1D293D]"
                                                    placeholder="Confirm your new password"
                                                    required
                                                    minLength="8"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <p>Password must be at least 8 characters long</p>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsChangingPassword(false);
                                                setPasswordData({
                                                    current_password: '',
                                                    new_password: '',
                                                    new_password_confirmation: ''
                                                });
                                                setShowCurrentPassword(false);
                                                setShowNewPassword(false);
                                                setShowConfirmPassword(false);
                                            }}
                                            className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-[#1447E6] text-white rounded-xl hover:bg-[#1240d0] transition-colors font-semibold"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </Layout>
    );
};

export default Profile;