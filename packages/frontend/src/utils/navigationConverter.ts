import { MenuProps } from 'antd';
import React from 'react';
import {
    NavigationGroup,
    NavigationItem,
    NavigationItemWithClick,
    NavigationSubmenu
} from '../config/navigation';

export type MenuItem = Required<MenuProps>['items'][number];

/**
 * Converts a navigation item with click to a menu item
 */
const convertItemToMenuItem = (item: NavigationItemWithClick): MenuItem => ({
    key: item.key,
    icon: item.icon && React.createElement(item.icon, { size: 20 }),
    label: item.label,
});

/**
 * Converts a navigation submenu to a menu item
 */
const convertSubmenuToMenuItem = (submenu: NavigationSubmenu): MenuItem => ({
    type: 'submenu',
    key: submenu.key,
    icon: submenu.icon && React.createElement(submenu.icon, { size: 20 }),
    label: submenu.label,
    children: submenu.children.map(convertItemToMenuItem),
});

/**
 * Converts a navigation group to a menu item
 */
const convertGroupToMenuItem = (group: NavigationGroup): MenuItem => ({
    type: 'group',
    key: group.key,
    label: group.label,
    children: group.children.map((child) => {
        if (child.type === 'item') {
            return convertItemToMenuItem(child);
        }
        if (child.type === 'submenu') {
            return convertSubmenuToMenuItem(child);
        }
        return null;
    }).filter(Boolean) as MenuItem[],
});

/**
 * Converts navigation items from the application's navigation structure
 * to Ant Design Menu items
 * 
 * This improved version uses specialized converter functions for each
 * navigation type for better typesafety and maintainability.
 * 
 * @param items Array of navigation items to convert
 * @returns Array of Ant Design menu items
 */
export const convertNavigationToMenuItems = (items: NavigationItem[]): MenuItem[] => {
    return items.map((item) => {
        if (item.type === 'item') {
            return convertItemToMenuItem(item);
        }
        if (item.type === 'group') {
            return convertGroupToMenuItem(item);
        }
        if (item.type === 'submenu') {
            return convertSubmenuToMenuItem(item);
        }
        return null;
    }).filter(Boolean) as MenuItem[];
}; 