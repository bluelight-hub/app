import { adminSidebarItems } from '@/features/admin/lib/admin-sidebar-config';
import { useCurrentUser } from '@/features/auth';
import { setRedirectAfterLogin } from '@/features/auth/stores/auth.store';
import { getCurrentPathWithQueryAndHash, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { logger } from '@/shared/lib/logger';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import type { BreadcrumbItem } from '@/shared/ui/molecules/breadcrumbs.molecule';
import { Breadcrumbs } from '@/shared/ui/molecules/breadcrumbs.molecule';
import { Sidebar, SidebarDrawer } from '@/shared/ui/organisms/sidebar.organism';
import { Outlet, useLocation, useNavigate, useRouterState } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiGear, PiList, PiSignOut } from 'react-icons/pi';

/**
 * Gemeinsames Layout für alle Admin-Seiten
 *
 * Bietet Sidebar-Navigation, Breadcrumbs und einen responsiven
 * Content-Bereich für alle Admin-Unterseiten.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authStatus, adminSessionStatus } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const redirectTarget = useMemo(() => {
    return sanitizeInternalRedirectPath(getCurrentPathWithQueryAndHash(location.pathname)) ?? '/';
  }, [location.pathname]);

  // Prüfe Admin-Authentifizierung
  useEffect(() => {
    if (authStatus === 'pending' || adminSessionStatus === 'pending') return;

    const isSetupPage = location.pathname.includes('/admin/setup');

    if (isSetupPage) {
      return;
    }

    if (adminSessionStatus !== 'authenticated') {
      setRedirectAfterLogin(redirectTarget);

      const handleNoAdminSession = async () => {
        if (isTauri()) {
          const { isInAdminWindow } = await import('@/services/windowService');
          const inAdminWindow = await isInAdminWindow();

          if (inAdminWindow) {
            // Wir sind im Admin-Fenster - schließe es immer wenn keine Admin-Session
            try {
              const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
              const currentWindow = getCurrentWebviewWindow();
              await currentWindow.close();
              // Das Fenster wird geschlossen, keine weitere Navigation nötig
              return;
            } catch (error) {
              logger.error('Fehler beim Schließen des Admin-Fensters:', error);
            }
          }
        }

        // Wir sind im Hauptfenster oder Browser
        if (user) {
          // Benutzer eingeloggt aber keine Admin-Session - zu Admin-Login
          void navigate({
            to: '/admin-login',
            search: {
              redirect: redirectTarget,
            },
            replace: true,
          });
        } else {
          // Kein Benutzer eingeloggt - zu Login mit Redirect-Ziel
          void navigate({
            to: '/auth',
            search: {
              redirect: redirectTarget,
            },
            replace: true,
          });
        }
      };

      void handleNoAdminSession();
    }
  }, [authStatus, adminSessionStatus, user, location.pathname, navigate, redirectTarget]);

  // Breadcrumbs aus Route-Meta-Daten generieren
  const routerState = useRouterState();
  const breadcrumbItems = useMemo(() => {
    const items: BreadcrumbItem[] = [{ label: 'Admin', to: '/admin/dashboard' }];

    const lastMatch = routerState.matches[routerState.matches.length - 1];
    const title = lastMatch?.meta?.[0]?.title;
    if (title) {
      items.push({ label: title });
    }

    return items;
  }, [routerState.matches]);

  /**
   * Schließt das Fenster oder navigiert zur Startseite
   */
  const handleClose = useCallback(async () => {
    if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();
      } catch (error) {
        logger.error('Fehler beim Schließen des Fensters:', error);
        await navigate({ to: '/' });
      }
    } else {
      if (window.opener) {
        window.close();
      } else {
        await navigate({ to: '/' });
      }
    }
  }, [navigate]);

  const isGuardPending = authStatus === 'pending' || adminSessionStatus === 'pending';

  // Sidebar-Header: Icon + Titel
  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <PiGear className="size-6 text-white/70" />
      <span className="text-lg font-semibold text-white">Admin Panel</span>
    </div>
  );

  // Sidebar-Footer: Schließen/Logout-Button
  const sidebarFooter = (
    <button type="button" onClick={handleClose} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      <PiSignOut className="size-5 shrink-0" />
      <span>Schließen</span>
    </button>
  );

  if (isGuardPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-canvas">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" />
          <p className="text-lg text-text-secondary">Authentifizierung wird geprüft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-canvas">
      {/* Desktop-Sidebar — auf Mobile ausgeblendet */}
      <div className="hidden lg:flex">
        <Sidebar items={adminSidebarItems} header={sidebarHeader} footer={sidebarFooter} variant="dark" />
      </div>

      {/* Mobile Drawer */}
      <SidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} items={adminSidebarItems} header={sidebarHeader} footer={sidebarFooter} variant="dark" />

      {/* Content-Bereich */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header — auf Desktop ausgeblendet */}
        <div className="border-border-primary flex items-center gap-3 border-b px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Navigation öffnen">
            <PiList className="h-6 w-6" />
          </button>
          <span className="font-semibold">Admin Panel</span>
        </div>

        {/* Hauptinhalt */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
