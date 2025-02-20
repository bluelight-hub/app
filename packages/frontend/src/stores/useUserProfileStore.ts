import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserProfile {
    name: string;
    imageUrl: string;
    email?: string;
}

interface UserProfileState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    setProfile: (profile: UserProfile) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>()(
    devtools(
        (set) => ({
            profile: {
                name: 'Robert Retter',
                imageUrl: 'https://randomuser.me/api/portraits/women/11.jpg',
            },
            isLoading: false,
            error: null,
            setProfile: (profile) => set({ profile, error: null }),
            updateProfile: (updates) =>
                set((state) => ({
                    profile: state.profile ? { ...state.profile, ...updates } : null,
                    error: null,
                })),
            clearProfile: () => set({ profile: null, error: null }),
        }),
        { name: 'user-profile-store' }
    )
); 