/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
import { isAdmin, useCurrentUser, useLogout } from '@/features/auth';
import { SessionContextCard } from '@/features/auth/ui';
import { EinsatzDashboard } from '@/features/einsatz/ui/organisms/EinsatzDashboard';
import { useActiveServer } from '@/features/server/hooks';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { ColorModeMenu } from '@/shared/ui/molecules/color-mode-menu.molecule';
import { useRouter } from '@tanstack/react-router';

export function IndexPage() {
  const { isLoading, user, adminSessionStatus, adminStatus } = useCurrentUser();
  const logout = useLogout();
  const { navigate } = useRouter();
  const activeServer = useActiveServer();

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
    <div className="flex h-screen flex-col overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex-shrink-0 space-y-3">
          <div>
            <div>
              <Heading size="2xl" as="h1">
                Willkommen bei BlueLight Hub
              </Heading>
            </div>
          </div>

          <SessionContextCard
            username={user.username}
            role={user.role}
            activeServerName={activeServer?.name}
            adminSessionStatus={adminSessionStatus}
            adminSetupAvailable={adminStatus?.adminSetupAvailable}
            onAdminAction={isAdmin(user.role) ? handleOpenAdminWindow : undefined}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:gap-6">
          <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-2">
            <EinsatzDashboard />
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-4 pt-4">
          <Button appearance="outline" intent="danger" size="sm" onClick={() => logout.mutateAsync()}>
            Abmelden
          </Button>
          <ColorModeMenu placement="top" />
        </div>
      </div>
    </div>
  );
}
