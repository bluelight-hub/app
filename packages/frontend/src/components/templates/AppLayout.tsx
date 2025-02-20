import React, { useState } from 'react';
import MobileHeader from '../organisms/MobileHeader';
import Sidebar from '../organisms/Sidebar';

/**
 * AppLayout template - Defines the main layout structure for the app section
 */
const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* Mobile Sidebar */}
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isMobile
            />

            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Header */}
            <MobileHeader
                title="Dashboard"
                onOpenSidebar={() => setIsMobileMenuOpen(true)}
            />

            {/* Main Content */}
            <main className="py-10 lg:pl-72">
                <div className="px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout; 