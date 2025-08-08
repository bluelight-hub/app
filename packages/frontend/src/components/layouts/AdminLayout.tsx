import { Box, Container, HStack, Heading, IconButton, Spinner, Text, VStack } from '@chakra-ui/react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { PiX } from 'react-icons/pi';
import { isTauri } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { logger } from '@/utils/logger.ts';

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
  const { isAdmin, isLoading } = useAdminAuth();

  // Prüfe Admin-Authentifizierung
  useEffect(() => {
    // Warte bis Loading fertig ist
    if (isLoading) return;

    // Spezielle Behandlung für Admin-Setup und Admin-Login Seiten
    const isSetupPage = location.pathname.includes('/admin/setup');
    const isLoginPage = location.pathname.includes('/admin/login');

    // Setup und Login-Seiten benötigen keine Admin-Authentifizierung
    if (isSetupPage || isLoginPage) {
      return;
    }

    // Für alle anderen Admin-Seiten: Prüfe Admin-Authentifizierung
    if (!isAdmin) {
      // Wenn Benutzer eingeloggt ist aber keine Admin-Rechte aktiviert hat,
      // leite zu Admin-Login weiter
      if (user) {
        navigate({ to: '/admin/login' });
      } else {
        // Kein Benutzer eingeloggt - zurück zur Startseite
        navigate({ to: '/' });
      }
    }
  }, [isLoading, isAdmin, user, location.pathname, navigate]);

  /**
   * Ermittelt den Titel basierend auf der aktuellen Route
   */
  const getPageTitle = () => {
    if (location.pathname.includes('/admin/setup')) {
      return 'Admin-Setup';
    }
    if (location.pathname.includes('/admin/login')) {
      return 'Administrator-Anmeldung';
    }
    if (location.pathname.includes('/admin/dashboard')) {
      return 'Admin-Dashboard';
    }
    if (location.pathname.includes('/admin/users')) {
      return 'Benutzerverwaltung';
    }
    return 'Admin-Bereich';
  };

  /**
   * Schließt das Fenster oder Tab
   */
  const handleClose = async () => {
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
        navigate({ to: '/' });
      }
    } else {
      // Im Browser: Versuche Tab zu schließen oder zur Startseite navigieren
      if (window.opener) {
        window.close();
      } else {
        // Fallback: Navigiere zur Startseite
        navigate({ to: '/' });
      }
    }
  };

  return (
    <Container maxW="6xl" py={{ base: '12', md: '24' }} px={{ base: '4', sm: '8' }}>
      <VStack gap="8" align="stretch">
        {/* Header mit Titel und Close-Button */}
        <Box borderBottomWidth="1px" borderColor="border.default" pb="4" mb="4">
          <HStack justify="space-between" align="start">
            <Heading size="2xl">{getPageTitle()}</Heading>
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
