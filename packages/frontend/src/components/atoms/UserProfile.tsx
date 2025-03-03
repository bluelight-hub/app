import React from 'react';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { BaseAtomProps } from '../../utils/types';

interface UserProfileProps extends BaseAtomProps {
    href: string;
    onClick?: () => void;
    hideText?: boolean;
}

/**
 * User profile component for the sidebar
 */
const UserProfile: React.FC<UserProfileProps> = ({
    href,
    onClick,
    hideText = false,
    'data-testid': dataTestId = 'user-profile'
}) => {
    const profile = useUserProfileStore((state) => state.profile);

    if (!profile) return null;

    return (
        <a
            href={href}
            onClick={onClick}
            data-testid={dataTestId}
            className="flex w-full h-12 items-center gap-x-4 px-6 py-2 text-sm/6 font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
            <img
                className="size-8 rounded-full bg-gray-50 dark:bg-gray-800"
                src={profile.imageUrl}
                alt={profile.name}
            />
            <span className="sr-only">Dein Profil</span>
            {!hideText && <span aria-hidden="true">{profile.name}</span>}
        </a>
    );
};

export default UserProfile; 