import type { MenuProps } from 'antd';
import { Button, Dropdown, Layout, Tooltip } from "antd";
import React, { useState } from "react";
import { PiPlus } from 'react-icons/pi';
import { WorkspaceTab as WorkspaceTabType } from "../../stores/useWorkspaceStore";
import Logo from "../atoms/Logo";
import WorkspaceTab from "../molecules/WorkspaceTab";

const { Header } = Layout;

interface AppHeaderProps {
    tabs: WorkspaceTabType[];
    tabItems: Array<NonNullable<MenuProps['items']>[number] & { key: WorkspaceTabType['type'] }>;
    onNewTab: ({ key }: { key: string }) => void;
    onTabClick: (tabId: string) => void;
    onTabTitleUpdate: (tabId: string, title: string) => void;
    onTabRemove: (tabId: string) => void;
}

/**
 * Main application header containing workspace tabs and controls
 */
const AppHeader: React.FC<AppHeaderProps> = ({
    tabs,
    tabItems,
    onNewTab,
    onTabClick,
    onTabTitleUpdate,
    onTabRemove,
}) => {
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [tabToDelete, setTabToDelete] = useState<string | null>(null);

    const handleDoubleClick = (tab: WorkspaceTabType) => {
        setEditingTabId(tab.id);
        setEditingTitle(tab.title);
    };

    const handleTitleSubmit = () => {
        if (editingTabId && editingTitle.trim()) {
            onTabTitleUpdate(editingTabId, editingTitle.trim());
        }
        setEditingTabId(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        if (tabToDelete === tabId) {
            onTabRemove(tabId);
            setTabToDelete(null);
        } else {
            setTabToDelete(tabId);
            setTimeout(() => {
                setTabToDelete(null);
            }, 1000);
        }
    };

    return (
        <Header className="flex items-center gap-2 px-4" style={{ background: 'var(--color-bg-container)' }}>
            <Logo className="mr-4 h-8" />
            {tabs.map((tab) => (
                <WorkspaceTab
                    key={tab.id}
                    {...tab}
                    isEditing={editingTabId === tab.id}
                    editingTitle={editingTitle}
                    isDeleting={tabToDelete === tab.id}
                    showCloseButton={tabs.length > 1}
                    onClick={() => onTabClick(tab.id)}
                    onDoubleClick={() => handleDoubleClick(tab)}
                    onDeleteClick={(e) => handleDeleteClick(e, tab.id)}
                    onTitleChange={setEditingTitle}
                    onTitleSubmit={handleTitleSubmit}
                />
            ))}
            <Tooltip title="Implementierung noch nicht ganz klar: Kommt vielleicht.">
                <Dropdown disabled menu={{ items: tabItems, onClick: onNewTab }} placement="bottomLeft">
                    <Button type="text" icon={<PiPlus size={24} />} />
                </Dropdown>
            </Tooltip>
        </Header>
    );
};

export default AppHeader; 