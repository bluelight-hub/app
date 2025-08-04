import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { PiSignOut } from 'react-icons/pi';
import { useAuth } from '@/provider/auth.hooks';

/**
 * Admin-Dashboard für authentifizierte Administratoren
 *
 * Zeigt den Admin-Bereich mit Verwaltungsfunktionen.
 * Nur zugänglich für Benutzer mit Admin-Rechten.
 */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    logout();
    await navigate({ to: '/' });
  };

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
              Hier können Sie später Benutzer verwalten, Einstellungen konfigurieren und mehr.
            </Text>
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
