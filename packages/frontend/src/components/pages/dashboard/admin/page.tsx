import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { PiSignOut, PiUsers } from 'react-icons/pi';
import { useCallback } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { logger } from '@/utils/logger.ts';

/**
 * Admin-Dashboard Seite
 *
 * Zentrale Verwaltungsseite für Administratoren mit Zugriff auf
 * Benutzerverwaltung und andere administrative Funktionen.
 * Nutzt das DashboardLayout für konsistente Darstellung.
 */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logoutAdmin } = useAuth();

  const handleLogout = useCallback(async () => {
    await logoutAdmin();

    // In Tauri: Fenster schließen
    if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();
      } catch (error) {
        logger.error('Fehler beim Schließen des Admin-Fensters:', error);
        // Fallback: zur Startseite navigieren
        await navigate({ to: '/' });
      }
    } else {
      // Im Browser: zur Startseite navigieren
      await navigate({ to: '/' });
    }
  }, [logoutAdmin, navigate]);

  const handleNavigateToUsers = useCallback(async () => {
    await navigate({ to: '/admin/users' });
  }, [navigate]);

  return (
    <DashboardLayout maxWidth="lg">
      {/* Dashboard Header */}
      <Box>
        <Heading size="xl" mb={2}>
          Admin-Dashboard
        </Heading>
        <Text color="fg.muted">Willkommen im Admin-Bereich, {user?.username}</Text>
      </Box>

      {/* Admin Functions Card */}
      <Box p={6} borderWidth={1} borderRadius="md" bg="bg.subtle" borderColor="border.default">
        <VStack gap={4} align="start">
          <Box>
            <Text fontWeight="semibold" fontSize="lg">
              Admin-Funktionen
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              Hier können Sie Benutzer verwalten, Einstellungen konfigurieren und mehr.
            </Text>
          </Box>

          <Button colorPalette="blue" variant="solid" size="md" onClick={handleNavigateToUsers} w="full" maxW="sm">
            <PiUsers />
            Benutzerverwaltung
          </Button>
        </VStack>
      </Box>

      {/* Logout Section */}
      <Box>
        <Button colorPalette="red" variant="outline" size="sm" onClick={handleLogout}>
          <PiSignOut />
          Admin-Bereich verlassen
        </Button>
      </Box>
    </DashboardLayout>
  );
}
