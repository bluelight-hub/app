import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { findRouteTitle, mainNavigation, adminNavigation } from '../../config/navigation';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useAuth } from '../../hooks/useAuth';
import MobileHeader from '../organisms/MobileHeader';
import Sidebar from '../organisms/Sidebar';

/**
 * AppLayout template - Defines the main layout structure for the app section
 */
const AppLayout: React.FC<{ children?: React.ReactNode }> = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const title = findRouteTitle(location.pathname);
  const isMobile = useMediaQuery('(max-width: 1024px)'); // lg breakpoint in Tailwind
  const _navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Entfernt - die Navigation wird jetzt durch den EinsatzGuard gehandhabt

  // Schließt die Sidebar automatisch, wenn der Viewport auf mobile Größe wechselt
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  // Combine main and admin navigation for admin users
  const navigation = isAdmin() ? [...mainNavigation, ...adminNavigation] : mainNavigation;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Unified Sidebar - entscheidet intern zwischen Mobile und Desktop */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isMobile={isMobile}
        navigation={navigation}
      />

      {/* Mobile Header */}
      <MobileHeader title={title} onOpenSidebar={() => setIsMobileMenuOpen(true)} />

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
