import { Button } from "antd";
import React from "react";
import { PiTrash, PiX } from "react-icons/pi";

interface TabCloseButtonProps {
    isDeleting: boolean;
    onClick: (e: React.MouseEvent) => void;
}

/**
 * Close button for workspace tabs with delete confirmation
 */
const TabCloseButton: React.FC<TabCloseButtonProps> = ({ isDeleting, onClick }) => {
    return (
        <Button
            type="text"
            className={`flex items-center justify-center !p-0 ml-1 opacity-60 hover:opacity-100 transition-all ${isDeleting
                ? 'text-red-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                }`}
            size="small"
            icon={isDeleting ? <PiTrash size={14} /> : <PiX size={14} />}
            onClick={onClick}
        />
    );
};

export default TabCloseButton; 