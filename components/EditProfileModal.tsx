import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import { X, Check, Loader2, UserCircle, Upload, Shield } from 'lucide-react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdate: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState<UserRole>(user.role);
    const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dynamic Avatar Generation Helper
    const generateAvatarUrl = (userName: string, userRole: UserRole) => {
        const encodedName = encodeURIComponent(userName || 'User');
        let bg = '64748b'; // Default Slate

        switch (userRole) {
            case UserRole.ADMIN: bg = '0284c7'; break; // Blue
            case UserRole.DEVELOPER: bg = '7c3aed'; break; // Purple
            case UserRole.REPORTER: bg = 'ea580c'; break; // Orange
            default: bg = '64748b';
        }

        return `https://ui-avatars.com/api/?name=${encodedName}&background=${bg}&color=fff`;
    };

    useEffect(() => {
        if (isOpen) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setAvatarUrl(user.avatar || '');
            setError(null);
        }
    }, [isOpen, user]);

    // Auto-update avatar if it's a default UI Avatar and name/role changes
    useEffect(() => {
        if (!isOpen) return;

        // Check if current avatar is empty or is a generated one (ui-avatars.com)
        const isGenerated = !avatarUrl || avatarUrl.includes('ui-avatars.com');

        if (isGenerated && name) {
            const newAvatar = generateAvatarUrl(name, role);
            // Only update if it's actually different to avoid cycles, though React prevents that mostly
            if (newAvatar !== avatarUrl) {
                setAvatarUrl(newAvatar);
            }
        }
    }, [name, role, isOpen]); // removed avatarUrl from dependency to prevent loop if we were careless, but logic is safe

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const updates = { name, email, role, avatar: avatarUrl };
            const success = await StorageService.updateUserProfile(user.id, updates);

            if (success) {
                onUpdate({ ...user, ...updates });
                onClose();
            } else {
                setError("Failed to update profile");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsLoading(true);
            try {
                const path = await StorageService.uploadFile(file);
                if (path) {
                    const url = StorageService.getPublicUrl(path);
                    setAvatarUrl(url);
                }
            } catch (err) {
                setError("Failed to upload avatar");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <UserCircle className="mr-2 text-blue-600" /> Edit Profile
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center mb-6">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                        <UserCircle className="w-16 h-16" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-8 h-8 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <div className="relative">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full p-3 pl-10 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                            >
                                {Object.values(UserRole).map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2 flex justify-end space-x-3 bg-gray-50/50 dark:bg-slate-900/20">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50 transition-all flex items-center"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
