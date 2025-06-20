import { Layout, Menu, MenuProps, Spin } from 'antd';
import React, { Suspense } from 'react';
import { PiChartBar, PiGear, PiHouse, PiScrollLight, PiUsers, PiX } from 'react-icons/pi';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useThemeInternal } from '@/hooks/useTheme.ts';
import { closeCurrentWindow } from '@/utils/tauri.ts';
import Divider from '../../atoms/Divider';
import Logo from '../../atoms/Logo';
import { StatusIndicator } from '@atoms/StatusIndicator.tsx';
import UserProfile from '../../atoms/UserProfile';

const { Content, Sider } = Layout;

// Lazy load admin pages
const AdminDashboard = React.lazy(() => import('./dashboard/page'));
const AdminUsers = React.lazy(() => import('./users/page'));
const AdminOrganizations = React.lazy(() => import('./organizations/page'));
const AdminSystem = React.lazy(() => import('./system/page'));
const AdminLogs = React.lazy(() => import('./logs/page'));

type MenuItem = Required<MenuProps>['items'][number];

function getItem(label: React.ReactNode, key: React.Key, icon?: React.ReactNode, children?: MenuItem[]): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const adminMenuItems: MenuItem[] = [
  getItem('Dashboard', '/admin', <PiHouse />),
  getItem('Benutzer', '/admin/users', <PiUsers />),
  getItem('Organisationen', '/admin/organizations', <PiChartBar />),
  getItem('System', '/admin/system', <PiGear />),
  getItem('Logs', '/admin/logs', <PiScrollLight />),
];

/**
 * Admin-Anwendung - Separates Fenster für Administratoren
 */
export const AdminApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const themeUtils = useThemeInternal();

  // Prüfe Admin-Berechtigung
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(info.key);
  };

  const handleCloseAdmin = async () => {
    await closeCurrentWindow();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme={themeUtils.isDark ? 'dark' : 'light'}>
        <div className="flex h-full flex-col">
          {/* Header mit Logo */}
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-x-3">
              <Logo className="h-8 w-auto" />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Admin</span>
            </div>
            <button
              onClick={handleCloseAdmin}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <PiX size={20} />
            </button>
          </div>

          <Divider className="-mt-3 mb-3" />

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <Menu
              theme={themeUtils.isDark ? 'dark' : 'light'}
              mode="inline"
              selectedKeys={[location.pathname]}
              onClick={handleMenuClick}
              items={adminMenuItems}
              className="border-none bg-transparent"
            />
          </div>

          {/* Footer */}
          <div className="mt-auto w-full shrink-0 overflow-hidden">
            <div className="px-6 py-2 flex items-center gap-2">
              <StatusIndicator withText />
            </div>
            <UserProfile href="#" />
          </div>
        </div>
      </Sider>

      <Layout>
        <Content className="p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spin size="large" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/organizations" element={<AdminOrganizations />} />
              <Route path="/system" element={<AdminSystem />} />
              <Route path="/logs" element={<AdminLogs />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminApp;
