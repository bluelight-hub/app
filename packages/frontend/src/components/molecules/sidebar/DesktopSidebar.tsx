import React from 'react';
import { NavigationItem } from '../../../config/navigation';
import SidebarContent from './SidebarContent';

interface DesktopSidebarProps {
  navigation: NavigationItem[];
}

/**
 * Desktop-specific sidebar implementation
 * Always visible on large screens (lg and above)
 */
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ navigation }) => {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <SidebarContent navigation={navigation} />
    </div>
  );
};

export default DesktopSidebar;
