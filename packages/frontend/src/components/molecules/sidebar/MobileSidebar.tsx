import { Button } from 'antd';
import React from 'react';
import { PiTextOutdent } from 'react-icons/pi';
import { NavigationItem } from '../../../config/navigation';
import SidebarContent from './SidebarContent';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
}

/**
 * Mobile-specific sidebar implementation with backdrop and close button
 * Only visible when isOpen is true
 */
const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose, navigation }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop with click handler to close */}
      <div
        className="fixed inset-0 bg-gray-900/80 dark:bg-black/80 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <div className="fixed inset-y-0 left-0 flex max-w-xs w-full">
        {/* Sidebar Wrapper */}
        <div className="relative flex-1 flex w-full">
          {/* Content */}
          <SidebarContent navigation={navigation} onNavigate={onClose} />

          {/* Close Button */}
          <div className="absolute right-0 top-0 -mr-16 pt-4">
            <Button
              type="text"
              className="text-white hover:text-gray-200 flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-white"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <span className="sr-only">Close sidebar</span>
              <PiTextOutdent size={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
