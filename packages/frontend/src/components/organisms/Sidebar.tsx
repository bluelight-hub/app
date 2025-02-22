import { Button, Menu, MenuProps } from 'antd';
import React from 'react';
import { PiTextOutdent } from 'react-icons/pi';
import { useLocation, useNavigate } from 'react-router';
import { NavigationItem, workspaces } from '../../config/navigation';
import { useThemeInternal } from '../../hooks/useTheme';
import Divider from '../atoms/Divider';
import Logo from '../atoms/Logo';
import UserProfile from '../atoms/UserProfile';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    isMobile?: boolean;
    navigation: NavigationItem[];
}

type MenuItem = Required<MenuProps>['items'][number];

const convertNavigationToMenuItems = (items: NavigationItem[]): MenuItem[] => {
    return items.map((item) => {
        if (item.type === 'item') {
            return {
                key: item.key,
                icon: item.icon && React.createElement(item.icon, { size: 20 }),
                label: item.label,
            } as MenuItem;
        }

        if (item.type === 'group') {
            return {
                type: 'group',
                key: item.key,
                label: item.label,
                children: item.children.map((child) => {
                    if (child.type === 'item') {
                        return {
                            key: child.key,
                            icon: child.icon && React.createElement(child.icon, { size: 20 }),
                            label: child.label,
                        } as MenuItem;
                    }
                    if (child.type === 'submenu') {
                        return {
                            type: 'submenu',
                            key: child.key,
                            icon: child.icon && React.createElement(child.icon, { size: 20 }),
                            label: child.label,
                            children: child.children.map((subChild) => ({
                                key: subChild.key,
                                icon: subChild.icon && React.createElement(subChild.icon, { size: 20 }),
                                label: subChild.label,
                            } as MenuItem)),
                        } as MenuItem;
                    }
                    return null;
                }).filter(Boolean) as MenuItem[],
            } as MenuItem;
        }

        if (item.type === 'submenu') {
            return {
                type: 'submenu',
                key: item.key,
                icon: item.icon && React.createElement(item.icon, { size: 20 }),
                label: item.label,
                children: item.children.map((child) => ({
                    key: child.key,
                    icon: child.icon && React.createElement(child.icon, { size: 20 }),
                    label: child.label,
                } as MenuItem)),
            } as MenuItem;
        }

        return null;
    }).filter(Boolean) as MenuItem[];
};

/**
 * Main sidebar component containing navigation and user profile
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile = false, navigation }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuClick: MenuProps['onClick'] = (info) => {
        navigate(info.key);
        if (isMobile && onClose) {
            onClose();
        }
    };

    // Prüfen ob Dark Mode aktiv ist
    const themeUtils = useThemeInternal();

    const sidebarContent = (
        <div className="flex h-screen flex-col gap-y-5 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex h-16 shrink-0 items-center gap-x-3 px-6">
                <Logo className="h-8 w-auto" />
                <span className="text-xl font-semibold text-gray-900 dark:text-white">Bluelight Hub</span>
            </div>
            <Divider className="-mt-3 mb-3" />
            <nav className="flex flex-1 flex-col">
                <div className="h-[calc(100vh-9.5rem)] overflow-y-auto">
                    <Menu
                        theme={themeUtils.isDark ? 'dark' : 'light'}
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        onClick={handleMenuClick}
                        items={convertNavigationToMenuItems(navigation)}
                        className="border-none bg-transparent"
                    />
                    <Divider />
                    <Menu
                        theme={themeUtils.isDark ? 'dark' : 'light'}
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        onClick={handleMenuClick}
                        items={convertNavigationToMenuItems(workspaces)}
                        className="border-none bg-transparent"
                    />
                </div>
                <div className="mt-auto w-full shrink-0 overflow-hidden">
                    <UserProfile href="#" />
                </div>
            </nav>
        </div>
    );

    if (isMobile && isOpen) {
        return (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/80 dark:bg-black/80 cursor-pointer"
                        onClick={onClose}
                    />

                    {/* Sidebar Container */}
                    <div className="fixed inset-y-0 left-0 flex max-w-xs w-full">
                        {/* Main Sidebar */}
                        <div className="relative flex-1 flex w-full">
                            {sidebarContent}

                            {/* Close Button */}
                            <div className="absolute right-0 top-0 -mr-16 pt-4">
                                <Button
                                    type="text"
                                    className="text-white hover:text-gray-200 flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                                    onClick={onClose}
                                >
                                    <span className="sr-only">Close sidebar</span>
                                    <PiTextOutdent size={24} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            </div>
        );
    }

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            {sidebarContent}
        </div>
    );
};

export default Sidebar; 