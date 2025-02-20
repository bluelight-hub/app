import React from 'react';

interface NavigationItemProps {
    href: string;
    icon?: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}

/**
 * Navigation item component for the sidebar
 */
const NavigationItem: React.FC<NavigationItemProps> = ({
    href,
    icon,
    label,
    isActive = false,
    onClick,
}) => {
    const baseClasses = "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold";
    const activeClasses = "bg-gray-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400";
    const inactiveClasses = "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800";

    return (
        <a
            href={href}
            onClick={onClick}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {icon}
            {label}
        </a>
    );
};

export default NavigationItem; 