import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { mainNavigation, NavigationItem } from '../../config/navigation';
import MobileHeader from '../organisms/MobileHeader';
import Sidebar from '../organisms/Sidebar';

/**
 * Findet den Titel für die aktuelle Route in der Navigation
 */
const findRouteTitle = (pathname: string): string => {
    const findInItems = (items: NavigationItem[]): string => {
        for (const item of items) {
            if (item.key === pathname) {
                return item.label;
            }
            if ('children' in item && item.children) {
                const found = findInItems(item.children);
                if (found) return found;
            }
        }
        return '';
    };

    return findInItems(mainNavigation) || 'Dashboard';
};

/**
 * AppLayout template - Defines the main layout structure for the app section
 */
const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const title = findRouteTitle(location.pathname);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* Mobile Sidebar */}
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isMobile
                navigation={mainNavigation}
            />

            {/* Desktop Sidebar */}
            <Sidebar navigation={mainNavigation} />

            {/* Mobile Header */}
            <MobileHeader
                title={title}
                onOpenSidebar={() => setIsMobileMenuOpen(true)}
            />

            {/* Main Content */}
            <main className="py-10 lg:pl-72">
                <div className="px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout; 