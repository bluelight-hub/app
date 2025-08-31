import { useAuth } from '@/hooks/useAuth.ts';
/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
import { isAdmin } from '@/utils/auth';
import { Button } from '@atoms/button.atom';
import { Card } from '@atoms/card.atom';
import { Heading } from '@atoms/heading.atom';
import { Spinner } from '@atoms/spinner.atom';
import { Text } from '@atoms/text.atom';
import { ColorModeButton } from '@molecules/color-mode-button.molecule.tsx';
import { EinsatzExample } from '@organisms/EinsatzExample';
import { Link, useRouter } from '@tanstack/react-router';
import { PiShieldCheck, PiSignIn } from 'react-icons/pi';

export function IndexPage() {
  const { isLoading, logout, user } = useAuth();
  const { navigate } = useRouter();
  const { adminStatus } = useAuth();

  // Admin-Fenster öffnen Handler
  const handleOpenAdminWindow = async () => {
    const { openAdminWindow } = await import('@/services/windowService');
    await openAdminWindow();
  };

  // WICHTIG: Warte immer auf den initialen Auth-Check bevor wir weiterleiten
  // Dies verhindert Race Conditions beim Page Reload
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Spinner size="lg" className="text-red-500" />
        <Text color="muted">Authentifizierung wird geladen...</Text>
      </div>
    );
  }

  // Nach dem Loading: Prüfe, ob der User vorhanden ist.
  // Nur weiterleiten, wenn wirklich kein User da ist nach dem Auth-Check
  if (!user) {
    void navigate({
      to: '/auth',
    });
    return null;
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-8">
        <div>
          <Heading size="2xl" as="h1">
            Willkommen bei BlueLight Hub
          </Heading>
          <Text color="muted">Sie sind angemeldet als: {user.username}</Text>
        </div>

        {/* Admin Setup Link - nur anzeigen wenn adminSetupAvailable true ist */}
        {adminStatus?.adminSetupAvailable && (
          <Card padding="sm" className="bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col gap-4">
              <div>
                <Text className="font-semibold">Admin-Setup verfügbar</Text>
                <Text size="sm" color="muted">
                  Sie können einen Admin-Account einrichten, solange noch kein Admin existiert.
                </Text>
              </div>
              <Link to="/admin/setup" className="inline-block">
                <Button variant="primary" size="sm">
                  <PiShieldCheck className="mr-2" />
                  Admin-Setup starten
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {isAdmin(user.role) && !adminStatus?.adminSetupAvailable && (
          <Card padding="sm" className="bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col gap-4">
              <div>
                <Text className="font-semibold">Admin-Bereich</Text>
                <Text size="sm" color="muted">
                  Zugang zum Admin-Bereich für berechtigte Benutzer.
                </Text>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleOpenAdminWindow} title="Admin-Dashboard in separatem Fenster öffnen">
                  <PiSignIn className="mr-2" />
                  Admin-Bereich
                </Button>
              </div>
            </div>
          </Card>
        )}

        <EinsatzExample />

        <Button variant="secondary" size="sm" onClick={() => logout.mutateAsync()}>
          Abmelden
        </Button>

        <ColorModeButton />
      </div>
    </div>
  );
}
