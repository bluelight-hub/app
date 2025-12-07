import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/shared/utils/logger';
import { CloseButton } from '@atoms/close-button.atom';
import { Container } from '@atoms/container.atom';
import { Heading } from '@atoms/heading.atom';
import { IconButton } from '@atoms/icon-button.atom';
import { Spinner } from '@atoms/spinner.atom';
import { Link, Outlet, useLocation, useMatchRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo } from 'react';
import { PiArrowLeft } from 'react-icons/pi';

/**
 * Gemeinsames Layout für alle Admin-Seiten
 *
 * Bietet einen konsistenten Header mit Close-Button und Container
 * für Admin-Setup und Admin-Login Seiten
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasAdminSession, isLoading } = useAdminAuth();

  // Prüfe Admin-Authentifizierung
  useEffect(() => {
    if (isLoading) return;

    const isSetupPage = location.pathname.includes('/admin/setup');

    if (isSetupPage) {
      return;
    }

    if (!hasAdminSession) {
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
          void navigate({ to: '/admin-login' });
        } else {
          // Kein Benutzer eingeloggt - zur Startseite
          void navigate({ to: '/' });
        }
      };

      void handleNoAdminSession();
    }
  }, [isLoading, hasAdminSession, user, location.pathname, navigate]);

  // Hole Meta-Daten aus der aktuellen Route
  const routerState = useRouterState();
  const routeMeta = routerState.matches[routerState.matches.length - 1]?.meta?.[0];

  /**
   * Ermittelt den Titel aus den Route-Meta-Daten oder Fallback
   */
  const pageTitle = useMemo(() => {
    return routeMeta?.title || 'Admin-Bereich';
  }, [routeMeta]);

  /**
   * Schließt das Fenster oder Tab (optimiert mit useCallback)
   */
  const handleClose = useCallback(async () => {
    // Prüfe ob wir in Tauri laufen
    if (isTauri()) {
      // In Tauri: Fenster schließen
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();
      } catch (error) {
        logger.error('Fehler beim Schließen des Fensters:', error);
        // Fallback: Navigiere zur Startseite
        await navigate({ to: '/' });
      }
    } else {
      // Im Browser: Versuche Tab zu schließen oder zur Startseite navigieren
      if (window.opener) {
        window.close();
      } else {
        // Fallback: Navigiere zur Startseite
        await navigate({ to: '/' });
      }
    }
  }, [navigate]);

  const matchRoute = useMatchRoute();

  return (
    <Container maxWidth="6xl" className="py-12">
      <div className="flex flex-col gap-4">
        {/* Header mit Titel und Close-Button */}
        <div className="border-gray-200 border-b pb-4 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex">
              {!matchRoute({ to: '/admin/dashboard' }) && (
                <Link to="/admin/dashboard">
                  <IconButton aria-label="Zurück zum Dashboard" size="lg" className="h-full">
                    <PiArrowLeft />
                  </IconButton>
                </Link>
              )}

              <Heading size="2xl" as="h1">
                {pageTitle}
              </Heading>
            </div>
            <CloseButton className="h-full" onClick={handleClose} size="lg" />
          </div>
        </div>

        {/* Content der jeweiligen Admin-Seite */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Spinner size="xl" />
              <p className="text-gray-600 text-lg dark:text-gray-400">Authentifizierung wird geprüft...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </Container>
  );
}
