/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
import { isAdmin, useCurrentUser, useLogout } from '@/features/auth';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { EinsatzDashboard } from '@/features/einsatz/ui/organisms/EinsatzDashboard';
import { useActiveServer } from '@/features/server/hooks';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { ColorModeMenu } from '@/shared/ui/molecules/color-mode-menu.molecule';
import { useRouter } from '@tanstack/react-router';
import { PiShieldCheck, PiShieldWarning, PiSignIn, PiSignOut, PiUserCircle } from 'react-icons/pi';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrationszugang',
  SUPER_ADMIN: 'Super-Admin-Zugang',
  USER: 'Standardzugang',
};

function formatWorkspaceRoleLabel(role?: string): string {
  if (!role) {
    return 'Standardzugang';
  }

  return ROLE_LABELS[role] ?? role;
}

export function IndexPage() {
  const { isLoading, user, adminSessionStatus, adminStatus } = useCurrentUser();
  const logout = useLogout();
  const { navigate } = useRouter();
  const activeServer = useActiveServer();
  const isPrivilegedUser = isAdmin(user?.role);
  const roleLabel = formatWorkspaceRoleLabel(user?.role);
  const adminBadgeLabel = adminSessionStatus === 'authenticated' ? 'Admin aktiv' : adminStatus?.adminSetupAvailable ? 'Admin bereit' : 'Admin inaktiv';
  const adminButtonLabel = adminSessionStatus === 'authenticated' ? 'Admin öffnen' : adminStatus?.adminSetupAvailable ? 'Admin-Setup' : 'Admin-Bereich';

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
    <div className="workspace-start-theme relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.22),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,247,251,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.82),rgba(10,15,25,0.96))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-slate-700/60" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="rounded-[28px] border border-white/70 bg-white/74 p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/58 dark:shadow-none">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <Text size="xs" color="muted" className="font-semibold uppercase tracking-[0.18em]">
                  Arbeitsstart
                </Text>
                <Heading size="2xl" as="h1">
                  Welchen Einsatz willst du jetzt öffnen?
                </Heading>
                <Text color="muted" className="max-w-3xl text-balance">
                  Wähle einen Einsatz oder lege einen neuen an. Du landest direkt im Workspace.
                </Text>
              </div>

              <div className="flex flex-col gap-3 xl:max-w-[32rem] xl:items-end">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="border-sky-200 bg-sky-50/90 text-sky-700 shadow-none dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200">
                    <PiUserCircle className="size-3.5" />
                    Authentifiziert
                  </Badge>
                  <span className="font-semibold text-slate-950 dark:text-slate-50">{user.username}</span>
                  <span className="text-slate-500 dark:text-slate-400">{roleLabel}</span>
                  <span className="text-slate-500 dark:text-slate-400">{activeServer?.name ? `Server ${activeServer.name}` : 'Kein Server aktiv'}</span>
                  {isPrivilegedUser ? (
                    <Badge
                      variant="outline"
                      className={
                        adminSessionStatus === 'authenticated'
                          ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : 'border-amber-200 bg-amber-50/90 text-amber-800 shadow-none dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200'
                      }
                    >
                      {adminSessionStatus === 'authenticated' ? <PiShieldCheck className="size-3.5" /> : <PiShieldWarning className="size-3.5" />}
                      {adminBadgeLabel}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  {isPrivilegedUser ? (
                    <UiButton type="button" variant="outline" size="lg" onClick={handleOpenAdminWindow}>
                      <PiSignIn className="size-3.5" />
                      {adminButtonLabel}
                    </UiButton>
                  ) : null}
                  <ColorModeMenu />
                  <UiButton onClick={() => logout.mutateAsync()} type="button" variant="ghost" size="lg">
                    <PiSignOut className="size-3.5" />
                    Abmelden
                  </UiButton>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <EinsatzDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
