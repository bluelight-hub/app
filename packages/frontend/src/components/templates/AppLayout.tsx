import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { findRouteTitle, mainNavigation } from '../../config/navigation';
import MobileHeader from '../organisms/MobileHeader';
import Sidebar from '../organisms/Sidebar';

/**
 * AppLayout template - Defines the main layout structure for the app section
 */
const AppLayout: React.FC<{ children?: React.ReactNode }> = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const title = findRouteTitle(location.pathname);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
            {/* Unified Sidebar - entscheidet intern zwischen Mobile und Desktop */}
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                navigation={mainNavigation}
            />

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