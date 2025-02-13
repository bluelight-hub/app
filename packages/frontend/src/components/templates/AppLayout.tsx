import { Plus, X } from "@phosphor-icons/react";
import type { MenuProps } from 'antd';
import { Breadcrumb, Button, Dropdown, Layout, Menu, theme } from 'antd';
import React from 'react';
import mobileLogo from "../../assets/brandbook/mobile-logo.png";
import mobileLogoWhite from "../../assets/brandbook/mobile-white.png";
import { useTheme } from "../../hooks/useTheme";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
const { Header, Content, Sider } = Layout;

const tabItems: MenuProps['items'] = [
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

    const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useWorkspaceStore();

    const handleNewTab = ({ key }: { key: string }) => {
        addTab(key as 'empty' | 'project' | 'settings');
    };

    return (
        <Layout className="h-screen w-screen">
            <Header className="flex items-center gap-2 px-4" style={{ background: colorBgContainer }}>
                <img src={isDark ? mobileLogoWhite : mobileLogo} alt="BlueLight Hub" className="mr-4 h-8" />
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded transition-colors ${tab.active
                            ? 'text-primary-600 bg-primary-50 dark:bg-white/10 dark:text-white'
                            : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-white/60 hover:dark:text-white hover:dark:bg-white/5'
                            }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.title}</span>
                        <X
                            size={16}
                            weight="bold"
                            className="hover:text-red-400"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                        />
                    </div>
                ))}
                <Dropdown menu={{ items: tabItems, onClick: handleNewTab }} placement="bottomLeft">
                    <Button
                        type="text"
                        icon={<Plus weight="bold" />}
                    />
                </Dropdown>
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
                            <div className="text-center text-gray-500">
                                No workspace open. Click the + button to create one.
                            </div>
                        )}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default AppLayout; 