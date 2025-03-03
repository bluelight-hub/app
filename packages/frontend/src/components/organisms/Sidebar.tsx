import React from 'react';
import { NavigationItem } from '../../config/navigation';
import MainSidebar from '../molecules/sidebar/MainSidebar';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    isMobile?: boolean;
    navigation: NavigationItem[];
}

/**
 * Main sidebar component that delegates to specialized sidebar components
 * 
 * This component has been refactored to follow the Atomic Design principles
 * by breaking down the original monolithic component into smaller, reusable parts:
 * 
 * 1. SidebarContent (molecule) - Common content for all sidebars
 * 2. MobileSidebar (molecule) - Mobile-specific sidebar with backdrop
 * 3. DesktopSidebar (molecule) - Desktop-specific sidebar
 * 4. MainSidebar (molecule) - Component that decides which sidebar to display
 */
const Sidebar: React.FC<SidebarProps> = (props) => {
    return <MainSidebar {...props} />;
};

export default Sidebar; 