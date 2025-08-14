import { ColorModeButton } from '@molecules/color-mode-button.molecule.tsx';
import { Link, useRouter } from '@tanstack/react-router';
import { Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { PiShieldCheck, PiSignIn } from 'react-icons/pi';

/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
import { isAdmin } from '@/utils/auth';
import { useAuth } from '@/hooks/useAuth.ts';

export function IndexPage() {
  const { isLoading, logout, user } = useAuth();
  const { navigate } = useRouter();
  const { adminStatus } = useAuth();

  // Admin-Fenster öffnen Handler
  const handleOpenAdminWindow = async () => {
    const { openAdmin } = await import('@/services/windowService');
    await openAdmin();
  };

  // WICHTIG: Warte immer auf den initialen Auth-Check bevor wir redirecten
  // Dies verhindert Race Conditions beim Page Reload
  if (isLoading) {
    return (
      <VStack colorPalette="teal" className="flex flex-col items-center justify-center min-h-screen">
        <Spinner color="colorPalette.fg" />
        <Text color="colorPalette.fg">Authentifizierung wird geladen...</Text>
      </VStack>
    );
  }

  // Nach dem Loading: Prüfe ob User vorhanden ist
  // Nur redirecten wenn wirklich kein User da ist nach dem Auth-Check
  if (!user) {
    navigate({
      to: '/auth',
    });
    return null;
  }

  return (
    <Box p={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Willkommen bei BlueLight Hub
          </Text>
          <Text color="fg.muted">Sie sind angemeldet als: {user.username}</Text>
        </Box>

        {/* Admin Setup Link - nur anzeigen wenn adminSetupAvailable true ist */}
        {adminStatus?.adminSetupAvailable && (
          <Box p={4} borderWidth={1} borderRadius="md" bg="bg.subtle">
            <VStack gap={4} align="start">
              <Box>
                <Text fontWeight="semibold">Admin-Setup verfügbar</Text>
                <Text fontSize="sm" color="fg.muted">
                  Sie können einen Admin-Account einrichten, solange noch kein Admin existiert.
                </Text>
              </Box>
              <Button asChild colorPalette="primary" variant="solid" size="sm">
                <Link to="/admin/setup">
                  <PiShieldCheck />
                  Admin-Setup starten
                </Link>
              </Button>
            </VStack>
          </Box>
        )}

        {isAdmin(user.role) && !adminStatus?.adminSetupAvailable && (
          <Box p={4} borderWidth={1} borderRadius="md" bg="bg.subtle">
            <VStack gap={4} align="start">
              <Box>
                <Text fontWeight="semibold">Admin-Bereich</Text>
                <Text fontSize="sm" color="fg.muted">
                  Zugang zum Admin-Bereich für berechtigte Benutzer.
                </Text>
              </Box>
              <HStack gap={2}>
                <Button colorPalette="primary" variant="outline" size="sm" onClick={handleOpenAdminWindow} title="Admin-Dashboard in separatem Fenster öffnen">
                  <PiSignIn />
                  Admin-Bereich
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        <Button colorPalette="primary" variant="outline" size="sm" onClick={() => logout.mutateAsync()}>
          Abmelden
        </Button>

        <ColorModeButton />
      </VStack>
    </Box>
  );
}
