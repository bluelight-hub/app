import React from 'react';

interface WorkspaceItemProps {
    href: string;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}

/**
 * Team item component for the sidebar teams section
 */
const WorkspaceItem: React.FC<WorkspaceItemProps> = ({
    href,
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
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[0.625rem] font-medium text-gray-400 dark:text-gray-500 group-hover:border-indigo-600 dark:group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {label.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{label}</span>
        </a>
    );
};

export default WorkspaceItem; 