import { Button, Menu, MenuProps } from 'antd';
import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PiShieldCheck } from 'react-icons/pi';
import { NavigationItem, workspaces } from '../../../config/navigation';
import { useThemeInternal } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { convertNavigationToMenuItems } from '../../../utils/navigationConverter';
import { openAdminWindow } from '../../../utils/tauri';
import Divider from '../../atoms/Divider';
import Logo from '../../atoms/Logo';
import { StatusIndicator } from '../../atoms/StatusIndicator';
import UserProfile from '../../atoms/UserProfile';

interface SidebarContentProps {
  navigation: NavigationItem[];
  onNavigate?: () => void;
}

/**
 * Common sidebar content used by both mobile and desktop sidebars
 */
const SidebarContent: React.FC<SidebarContentProps> = ({ navigation, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const themeUtils = useThemeInternal();
  const { isAdmin } = useAuth();

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(info.key);
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex h-screen flex-col gap-y-5 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header with Logo */}
      <div className="flex h-16 shrink-0 items-center gap-x-3 px-6">
        <Logo className="h-8 w-auto" />
        <span className="text-xl font-semibold text-gray-900 dark:text-white">Bluelight Hub</span>
      </div>

      <Divider className="-mt-3 mb-3" />

      {/* Navigation Menus */}
      <nav className="flex flex-1 flex-col">
        <div className="h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Main Navigation */}
          <Menu
            theme={themeUtils.isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={convertNavigationToMenuItems(navigation)}
            className="border-none bg-transparent"
          />

          <Divider />

          {/* Workspaces Navigation */}
          <Menu
            theme={themeUtils.isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={convertNavigationToMenuItems(workspaces)}
            className="border-none bg-transparent"
          />
        </div>

        {/* User Profile (Footer) */}
        <div className="mt-auto w-full shrink-0 overflow-hidden">
          <div className="px-6 py-2 flex items-center gap-2">
            <StatusIndicator withText />
          </div>

          {/* Action Buttons */}
          {isAdmin() ? (
            // Für Admins: Profile und Admin Panel Buttons nebeneinander
            <div className="px-6 py-2 flex gap-2">
              <UserProfile href="#" hideText />
              <Button
                type="default"
                icon={<PiShieldCheck />}
                onClick={openAdminWindow}
                className="flex-1"
                size="middle"
              >
                Admin Panel
              </Button>
            </div>
          ) : (
            // Für normale Nutzer: Nur Profile Button
            <UserProfile href="#" />
          )}
        </div>
      </nav>
    </div>
  );
};

export default SidebarContent;
