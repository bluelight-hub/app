import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { RouteUtils } from '@/config/routes';
import { useAuthorization } from '@/hooks/useAuthorization';

export interface BreadcrumbItem {
  /** Label für den Breadcrumb */
  label: string;
  /** Pfad für die Navigation */
  path: string;
  /** Ist der Breadcrumb klickbar? */
  clickable: boolean;
  /** Icon für den Breadcrumb */
  icon?: React.ReactNode;
  /** Ist dies der aktuelle/letzte Breadcrumb? */
  current?: boolean;
}

export interface BreadcrumbsProps {
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Custom Separator zwischen Breadcrumbs */
  separator?: React.ReactNode;
  /** Zeige Home-Icon beim ersten Element */
  showHomeIcon?: boolean;
  /** Maximum Anzahl der angezeigten Breadcrumbs */
  maxItems?: number;
  /** Custom Breadcrumb-Items (überschreibt automatische Generierung) */
  customItems?: BreadcrumbItem[];
  /** Callback wenn ein Breadcrumb geklickt wird */
  onItemClick?: (item: BreadcrumbItem) => void;
}

/**
 * Dynamische Breadcrumb-Komponente
 * Generiert automatisch Breadcrumbs basierend auf der aktuellen Route und Route-Metadaten
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className,
  separator = '/',
  showHomeIcon = true,
  maxItems = 5,
  customItems,
  onItemClick,
}) => {
  const location = useLocation();
  const { canAccessPath } = useAuthorization();

  // Generiere Breadcrumb-Items basierend auf der aktuellen Route
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    // Verwende custom Items falls vorhanden
    if (customItems) {
      return customItems;
    }

    // Generiere automatisch basierend auf der Route
    const items = RouteUtils.generateBreadcrumbs(location.pathname);

    return items.map((item, index) => ({
      ...item,
      current: index === items.length - 1,
      icon: index === 0 && showHomeIcon ? <HomeOutlined /> : undefined,
    }));
  }, [location.pathname, customItems, showHomeIcon]);

  // Begrenze die Anzahl der angezeigten Items
  const displayItems = useMemo(() => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems;
    }

    // Zeige immer das erste und die letzten Items
    const start = breadcrumbItems.slice(0, 1);
    const end = breadcrumbItems.slice(-(maxItems - 2));

    return [
      ...start,
      {
        label: '...',
        path: '',
        clickable: false,
        current: false,
      },
      ...end,
    ];
  }, [breadcrumbItems, maxItems]);

  // Rendere einzelnen Breadcrumb-Item
  const renderBreadcrumbItem = (item: BreadcrumbItem, _index: number) => {
    const handleClick = () => {
      if (onItemClick) {
        onItemClick(item);
      }
    };

    // Nicht klickbare Items oder Ellipsis
    if (!item.clickable || item.label === '...' || item.current) {
      return (
        <span
          className={`${item.current ? 'font-medium text-gray-900' : 'text-gray-500'}`}
          onClick={item.clickable ? handleClick : undefined}
        >
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </span>
      );
    }

    // Prüfe Zugriffsberechtigung für den Link
    const canAccess = canAccessPath(item.path);

    if (!canAccess) {
      return (
        <span className="text-gray-400 cursor-not-allowed">
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </span>
      );
    }

    // Klickbarer Link
    return (
      <Link
        to={item.path}
        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
        onClick={handleClick}
      >
        {item.icon && <span className="mr-1">{item.icon}</span>}
        {item.label}
      </Link>
    );
  };

  // Konvertiere zu Ant Design Breadcrumb Items
  const antdItems = displayItems.map((item, index) => ({
    title: renderBreadcrumbItem(item, index),
    key: item.path || `item-${index}`,
  }));

  // Zeige keine Breadcrumbs wenn keine Items vorhanden
  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className={`breadcrumbs-container ${className || ''}`}>
      <Breadcrumb separator={separator} items={antdItems} className="text-sm" />
    </div>
  );
};

export default Breadcrumbs;
