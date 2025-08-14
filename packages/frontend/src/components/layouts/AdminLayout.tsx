import { Box, Container, HStack, Heading, IconButton, Spinner, Text, VStack } from '@chakra-ui/react';
import { Outlet, useLocation, useNavigate, useRouterState } from '@tanstack/react-router';
import { PiX } from 'react-icons/pi';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { logger } from '@/utils/logger';

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
    // WICHTIG: Warte immer bis der initiale Auth-Check abgeschlossen ist
    // Dies verhindert falsche Redirects beim Page Reload
    if (isLoading) return;

    // Spezielle Behandlung für Admin-Setup Seiten
    const isSetupPage = location.pathname.includes('/admin/setup');

    // Setup-Seiten benötigen keine Admin-Authentifizierung
    if (isSetupPage) {
      return;
    }

    // Für alle anderen Admin-Seiten: Prüfe ob Admin-Session vorhanden ist
    // Nur redirecten wenn der Auth-Check abgeschlossen ist (isLoading = false)
    if (!hasAdminSession) {
      // Wenn Benutzer eingeloggt ist aber keine Admin-Session hat,
      // leite zu Admin-Login weiter
      if (user) {
        void navigate({ to: '/admin-login' });
      } else {
        // Kein Benutzer eingeloggt - zurück zur Startseite
        void navigate({ to: '/' });
      }
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

  return (
    <Container maxW="6xl" py={{ base: '12', md: '24' }} px={{ base: '4', sm: '8' }}>
      <VStack gap="8" align="stretch">
        {/* Header mit Titel und Close-Button */}
        <Box borderBottomWidth="1px" borderColor="border.default" pb="4" mb="4">
          <HStack justify="space-between" align="start">
            <Heading size="2xl">{pageTitle}</Heading>
            <IconButton aria-label="Fenster schließen" variant="ghost" size="lg" onClick={handleClose}>
              <PiX />
            </IconButton>
          </HStack>
        </Box>

        {/* Content der jeweiligen Admin-Seite */}
        <Box>
          {isLoading ? (
            <VStack gap="4" py="12">
              <Spinner size="xl" color="primary.500" />
              <Text color="fg.muted" fontSize="lg">
                Authentifizierung wird geprüft...
              </Text>
            </VStack>
          ) : (
            <Outlet />
          )}
        </Box>
      </VStack>
    </Container>
  );
}
