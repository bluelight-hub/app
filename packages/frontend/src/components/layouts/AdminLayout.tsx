import { Box, Container, HStack, Heading, IconButton, Spinner, Text, VStack } from '@chakra-ui/react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { PiX } from 'react-icons/pi';
import { useAuth } from '@/hooks/useAuth';

/**
 * Gemeinsames Layout für alle Admin-Seiten
 *
 * Bietet einen konsistenten Header mit Close-Button und Container
 * für Admin-Setup und Admin-Login Seiten
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useAuth();

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
  const handleClose = () => {
    // Prüfe ob wir in Tauri laufen
    if (window.__TAURI__) {
      // In Tauri: Fenster schließen
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.close();
      });
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
