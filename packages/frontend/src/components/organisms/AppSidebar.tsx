import type { MenuProps } from 'antd';
import { Layout, Menu } from "antd";
import React from "react";

const { Sider } = Layout;

interface AppSidebarProps {
    menuItems: MenuProps['items'];
}

/**
 * Application sidebar containing the main navigation menu
 */
const AppSidebar: React.FC<AppSidebarProps> = ({ menuItems }) => {
    return (
        <Sider width={200} style={{ background: 'var(--color-bg-container)' }}>
            <Menu
                mode="inline"
                defaultSelectedKeys={['1']}
                defaultOpenKeys={['sub1']}
                className="h-full border-r-0"
                items={menuItems}
            />
        </Sider>
    );
};

export default AppSidebar; 