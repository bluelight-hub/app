import { PicnicTable, Plus, Trash, X } from "@phosphor-icons/react";
import type { MenuProps } from 'antd';
import { Breadcrumb, Button, Dropdown, Empty, Input, Layout, Menu, theme, Tooltip } from 'antd';
import React, { useState } from 'react';
import mobileLogo from "../../assets/brandbook/mobile-logo.png";
import mobileLogoWhite from "../../assets/brandbook/mobile-white.png";
import { useTheme } from "../../hooks/useTheme";
import { useWorkspaceStore, WorkspaceTab } from "../../stores/useWorkspaceStore";
const { Header, Content, Sider } = Layout;

const tabItems: Array<NonNullable<MenuProps['items']>[number] & { key: WorkspaceTab['type'] }> = [
    {
        key: 'workspace',
        label: 'Workspace',
    },
    {
        key: 'dashboard',
        label: 'Dashboard',
    },
    {
        key: 'administration',
        label: 'Administration',
    },
];

const menuItems: MenuProps['items'] = [
    {
        key: 'dashboard',
        label: 'Dashboard',
    },
    {
        key: 'einsatztagebuch',
        label: 'Einsatztagebuch',
    },
];

/**
 * AppLayout template - Defines the main layout structure for the app section
 */
const AppLayout: React.FC = () => {
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    const { isDark } = useTheme();

    const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTabTitle } = useWorkspaceStore();
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [tabToDelete, setTabToDelete] = useState<string | null>(null);

    const handleNewTab = ({ key }: { key: string }) => {
        addTab(key as WorkspaceTab['type']);
    };

    const handleDoubleClick = (tab: WorkspaceTab) => {
        setEditingTabId(tab.id);
        setEditingTitle(tab.title);
    };

    const handleTitleSubmit = () => {
        if (editingTabId && editingTitle.trim()) {
            updateTabTitle(editingTabId, editingTitle.trim());
        }
        setEditingTabId(null);
    };

    // Reset delete state when switching tabs
    const handleTabClick = (tabId: string) => {
        setTabToDelete(null);
        setActiveTab(tabId);
    };

    const handleDeleteClick = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        if (tabToDelete === tabId) {
            removeTab(tabId);
            setTabToDelete(null);
        } else {
            setTabToDelete(tabId);
            setTimeout(() => {
                setTabToDelete(null);
            }, 1000);
        }
    };

    return (
        <Layout className="h-screen w-screen">
            <Header className="flex items-center gap-2 px-4" style={{ background: colorBgContainer }}>
                <img src={isDark ? mobileLogoWhite : mobileLogo} alt="BlueLight Hub" className="mr-4 h-8" />
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`flex h-full items-center gap-2 px-4 py-2 cursor-pointer rounded transition-colors ${tab.active
                            ? 'text-primary-600 bg-primary-50 dark:bg-white/10 dark:text-white'
                            : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-white/60 hover:dark:text-white hover:dark:bg-white/5'
                            }`}
                        onClick={() => handleTabClick(tab.id)}
                        onDoubleClick={() => handleDoubleClick(tab)}
                    >
                        {editingTabId === tab.id ? (
                            <Input
                                size="small"
                                variant="borderless"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onPressEnter={handleTitleSubmit}
                                onBlur={handleTitleSubmit}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-32"
                                style={{
                                    color: 'var(--primary-950)',
                                }}
                            />
                        ) : (
                                <span>{tab.title}</span>
                        )}
                        {tabs.length > 1 && (
                            <Button
                                type="text"
                                className={`flex items-center justify-center !p-0 ml-1 opacity-60 hover:opacity-100 transition-all ${tabToDelete === tab.id
                                    ? 'text-red-500'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                    }`}
                                size="small"
                                icon={tabToDelete === tab.id ? <Trash size={14} weight="bold" /> : <X size={14} weight="bold" />}
                                onClick={(e) => handleDeleteClick(e, tab.id)}
                            />
                        )}
                    </div>
                ))}
                {/* TODO: Implementierung noch nicht ganz klar: Kommt vielleicht. */}
                <Tooltip title="Implementierung noch nicht ganz klar: Kommt vielleicht.">
                    <Dropdown disabled menu={{ items: tabItems, onClick: handleNewTab }} placement="bottomLeft">
                        <Button
                            type="text"
                        icon={<Plus weight="bold" />}
                        />
                    </Dropdown>
                </Tooltip>
            </Header>
            <Layout>
                <Sider width={200} style={{ background: colorBgContainer }}>
                    <Menu
                        mode="inline"
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['sub1']}
                        className="h-full border-r-0"
                        items={menuItems}
                    />
                </Sider>
                <Layout className="p-0 px-6 pb-6">
                    <Breadcrumb
                        items={[{ title: 'Home' }, { title: 'List' }, { title: 'App' }]}
                        className="my-4"
                    />
                    <Content
                        className="p-6 m-0 min-h-[280px]"
                        style={{
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        {activeTabId ? (
                            <div>Content for tab: {tabs.find(tab => tab.id === activeTabId)?.title}</div>
                        ) : (
                                <Empty image={<PicnicTable size={48} className="text-gray-200 dark:text-gray-800" />}
                                    className="text-center text-gray-500"
                                    description="Kein Arbeitsbereich geöffnet. Klicken Sie auf die Schaltfläche +, um einen zu erstellen." />
                        )}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default AppLayout; 