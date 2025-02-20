import { Button } from 'antd';
import React from 'react';
import { PiTextIndent } from 'react-icons/pi';
import { useUserProfileStore } from '../../stores/useUserProfileStore';

interface MobileHeaderProps {
    title: string;
    onOpenSidebar: () => void;
}

/**
 * Mobile header component with menu button and user profile
 */
const MobileHeader: React.FC<MobileHeaderProps> = ({
    title,
    onOpenSidebar,
}) => {
    const profile = useUserProfileStore((state) => state.profile);

    if (!profile) return null;

    return (
        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm dark:shadow-gray-800 sm:px-6 lg:hidden">
            <Button
                type="text"
                className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
                onClick={onOpenSidebar}
            >
                <span className="sr-only">Open sidebar</span>
                <PiTextIndent size={24} />
            </Button>
            <div className="flex-1 text-sm/6 font-semibold text-gray-900 dark:text-gray-100">{title}</div>
            <a href="#">
                <span className="sr-only">Your profile</span>
                <img
                    className="size-8 rounded-full bg-gray-50 dark:bg-gray-800"
                    src={profile.imageUrl}
                    alt={profile.name}
                />
            </a>
        </div>
    );
};

export default MobileHeader; 