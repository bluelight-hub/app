import { Input } from "antd";
import React from "react";
import TabCloseButton from "../atoms/TabCloseButton";

interface WorkspaceTabProps {
    id: string;
    title: string;
    active: boolean;
    isEditing: boolean;
    editingTitle: string;
    isDeleting: boolean;
    showCloseButton: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
    onDeleteClick: (e: React.MouseEvent) => void;
    onTitleChange?: (value: string) => void;
    onTitleSubmit?: () => void;
}

/**
 * Workspace tab component that handles display, editing and deletion
 */
const WorkspaceTab: React.FC<WorkspaceTabProps> = ({
    title,
    active,
    isEditing,
    editingTitle,
    isDeleting,
    showCloseButton,
    onClick,
    onDoubleClick,
    onDeleteClick,
    onTitleChange,
    onTitleSubmit,
}) => {
    return (
        <div
            className={`flex h-full items-center gap-2 px-4 py-2 cursor-pointer rounded transition-colors ${active
                ? 'text-primary-600 bg-primary-50 dark:bg-white/10 dark:text-white'
                : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-white/60 hover:dark:text-white hover:dark:bg-white/5'
                }`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            {isEditing ? (
                <Input
                    size="small"
                    variant="borderless"
                    value={editingTitle}
                    onChange={(e) => onTitleChange?.(e.target.value)}
                    onPressEnter={onTitleSubmit}
                    onBlur={onTitleSubmit}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-32"
                    style={{
                        color: 'var(--primary-950)',
                    }}
                />
            ) : (
                <span>{title}</span>
            )}
            {showCloseButton && (
                <TabCloseButton
                    isDeleting={isDeleting}
                    onClick={onDeleteClick}
                />
            )}
        </div>
    );
};

export default WorkspaceTab; 