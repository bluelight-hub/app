import React, { useMemo } from 'react';
import { Avatar, Dropdown, Layout, Menu, Typography } from 'antd';
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { RouteDefinition, RouteUtils } from '@/config/routes';
import { useAuthorization } from '@/hooks/useAuthorization';
import { useActiveNavigation } from '@/hooks/useActiveNavigation';
import NavigationLink from './NavigationLink';
import { useAuth } from '@/hooks/useAuth';
import { MenuItem } from '@/utils/navigationConverter.ts';

const { Sider } = Layout;
const { Text } = Typography;

export interface AdminSidebarProps {
  /** Ist die Sidebar zusammengeklappt? */
  collapsed?: boolean;
  /** Callback für Collapse-Status-Änderung */
  onCollapse?: (collapsed: boolean) => void;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Breite der Sidebar */
  width?: number;
  /** Breite der zusammengeklappten Sidebar */
  collapsedWidth?: number;
}

/**
 * Admin Navigation Sidebar mit rollenbasierter Menüfilterung
 */
const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed = false,
  onCollapse,
  className,
  width = 256,
  collapsedWidth = 80,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { authorizedRoutes } = useAuthorization();
  const { currentPath } = useActiveNavigation();

  // Filtere und gruppiere autorisierte Routen für die Navigation
  const navigationItems = useMemo(() => {
    const routes = authorizedRoutes.filter((route) => route.showInNavigation);
    const grouped = RouteUtils.getRoutesByCategory();

    return Object.entries(grouped)
      .map(([category, categoryRoutes]) => {
        const authorizedCategoryRoutes = categoryRoutes.filter((route) =>
          routes.some((authRoute) => authRoute.id === route.id),
        );

        if (authorizedCategoryRoutes.length === 0) return null;

        return {
          category,
          routes: authorizedCategoryRoutes,
        };
      })
      .filter(Boolean);
  }, [authorizedRoutes]);

  // Konvertiere Routen zu Ant Design Menu Items
  const menuItems = useMemo(() => {
    const items: MenuItem[] = [];

    navigationItems.forEach((group, groupIndex) => {
      if (!group) return;

      // Füge Kategorie-Header hinzu (nur wenn nicht collapsed)
      if (!collapsed && group.routes.length > 0) {
        items.push({
          type: 'group',
          label: getCategoryDisplayName(group.category),
          key: `group-${group.category}`,
        });
      }

      // Füge Routen hinzu
      group.routes.forEach((route: RouteDefinition) => {
        items.push({
          key: route.path,
          icon: getRouteIcon(route.icon),
          label: (
            <NavigationLink
              to={route.path}
              checkAccess={false} // Bereits in authorizedRoutes gefiltert
              className="w-full"
            >
              {route.title}
            </NavigationLink>
          ),
          title: route.description,
        });
      });

      // Füge Divider zwischen Gruppen hinzu (aber nicht nach der letzten)
      if (groupIndex < navigationItems.length - 1 && !collapsed) {
        items.push({
          type: 'divider',
          key: `divider-${groupIndex}`,
        });
      }
    });

    return items;
  }, [navigationItems, collapsed]);

  // User Dropdown Menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
      onClick: () => navigate('/admin/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Einstellungen',
      onClick: () => navigate('/admin/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Abmelden',
      onClick: logout,
    },
  ];

  // Bestimme aktuell ausgewählte Menu Items
  const selectedKeys = useMemo(() => {
    const route = RouteUtils.findByPath(currentPath);
    return route ? [route.path] : [];
  }, [currentPath]);

  return (
    <Sider
      width={width}
      collapsedWidth={collapsedWidth}
      collapsed={collapsed}
      onCollapse={onCollapse}
      className={`admin-sidebar ${className || ''}`}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div className="admin-sidebar__header p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BH</span>
              </div>
              <div>
                <Text className="font-semibold text-white">Bluelight Hub</Text>
                <br />
                <Text className="text-xs text-gray-300">Admin Panel</Text>
              </div>
            </div>
          )}

          <button onClick={() => onCollapse?.(!collapsed)} className="p-1 rounded hover:bg-gray-700 text-white">
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="admin-sidebar__navigation flex-1">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={selectedKeys}
          items={menuItems}
          inlineCollapsed={collapsed}
          className="border-none"
        />
      </div>

      {/* User Profile Footer */}
      <div className="admin-sidebar__footer p-4 border-t border-gray-700">
        {collapsed ? (
          <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
            <Avatar icon={<UserOutlined />} className="cursor-pointer w-full flex items-center justify-center" />
          </Dropdown>
        ) : (
          <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
            <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700 p-2 rounded">
              <Avatar icon={<UserOutlined />} />
              <div className="flex-1 min-w-0">
                <Text className="text-white font-medium block truncate">{user?.name || 'Admin User'}</Text>
                <Text className="text-gray-300 text-xs block truncate">{user?.role || 'Administrator'}</Text>
              </div>
            </div>
          </Dropdown>
        )}
      </div>
    </Sider>
  );
};

// Helper Funktionen
function getCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    overview: 'Übersicht',
    management: 'Verwaltung',
    system: 'System',
    monitoring: 'Überwachung',
    tools: 'Tools',
    analytics: 'Analytics',
    configuration: 'Konfiguration',
    other: 'Weitere',
  };

  return categoryNames[category] || category;
}

function getRouteIcon(iconName?: string): React.ReactNode {
  // Diese Funktion würde die entsprechenden Icons basierend auf dem Namen zurückgeben
  // Implementierung abhängig von der verwendeten Icon-Bibliothek

  const iconMap: Record<string, React.ReactNode> = {
    House: <UserOutlined />, // Placeholder - echte Icons verwenden
    Users: <UserOutlined />,
    Buildings: <UserOutlined />,
    Gear: <SettingOutlined />,
    FileText: <UserOutlined />,
    Database: <UserOutlined />,
    Code: <UserOutlined />,
    ChartBar: <UserOutlined />,
    Sliders: <SettingOutlined />,
  };

  return iconName ? iconMap[iconName] || <UserOutlined /> : <UserOutlined />;
}

export default AdminSidebar;
