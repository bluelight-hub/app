import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { PiSignOut, PiUsers } from 'react-icons/pi';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth.ts';

/**
 * Admin-Dashboard für authentifizierte Administratoren
 *
 * Zeigt den Admin-Bereich mit Verwaltungsfunktionen.
 * Nur zugänglich für Benutzer mit Admin-Rechten.
 */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    await navigate({ to: '/' });
  }, [logout, navigate]);

  const handleNavigateToUsers = useCallback(async () => {
    await navigate({ to: '/admin/users' });
  }, [navigate]);

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Admin-Dashboard
          </Heading>
          <Text color="fg.muted">Willkommen im Admin-Bereich, {user?.username}</Text>
        </Box>

        <Box p={6} borderWidth={1} borderRadius="md" bg="bg.subtle">
          <VStack gap={4} align="start">
            <Text fontWeight="semibold">Admin-Funktionen</Text>
            <Text fontSize="sm" color="fg.muted">
              Hier können Sie Benutzer verwalten, Einstellungen konfigurieren und mehr.
            </Text>

            <Button colorPalette="blue" variant="solid" size="md" onClick={handleNavigateToUsers} w="full" maxW="sm">
              <PiUsers />
              Benutzerverwaltung
            </Button>
          </VStack>
        </Box>

        <Box>
          <Button colorPalette="red" variant="outline" size="sm" onClick={handleLogout}>
            <PiSignOut />
            Abmelden
          </Button>
        </Box>
      </VStack>
    </Container>
  );
}
