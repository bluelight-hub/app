import React from 'react';
import { NavigationItem } from '../../../config/navigation';
import DesktopSidebar from './DesktopSidebar';
import MobileSidebar from './MobileSidebar';

interface MainSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  navigation: NavigationItem[];
}

/**
 * Main sidebar component that renders either the mobile or desktop sidebar
 * based on the provided props
 */
const MainSidebar: React.FC<MainSidebarProps> = ({
  isOpen = false,
  onClose = () => {},
  isMobile = false,
  navigation,
}) => {
  // Always render both sidebars, but let CSS and conditional rendering
  // determine which one is visible
  return (
    <>
      {/* Mobile sidebar - only visible when isMobile is true and isOpen is true */}
      {isMobile && <MobileSidebar isOpen={isOpen} onClose={onClose} navigation={navigation} />}

      {/* Desktop sidebar - always rendered but only visible on larger screens */}
      <DesktopSidebar navigation={navigation} />
    </>
  );
};

export default MainSidebar;
