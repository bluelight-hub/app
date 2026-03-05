import { AUTH_KEYS, consumeRedirectAfterLogin, useCurrentUser, useUnifiedAuth, useLogout } from '@/features/auth';
import { useRequireServer, useServerList, useActiveServer, useServerListHealth } from '@/features/server/hooks';
import { setActiveServer, removeServer } from '@/features/server/stores/server.store';
import { serverStore } from '@/features/server/stores/server.store';
import { ServerSelector } from '@/features/server/ui/molecules';
import { getIndicatorStatus, STATUS_DOT_COLORS, STATUS_LABELS, useSystemHealth, useSystemVersion } from '@/features/system';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { getRedirectFromSearch, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import type { AuthRequestDto } from '@/shared';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UnifiedAuthForm } from './UnifiedAuthForm';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

/**
 * Vereinheitlichtes Login-Fenster mit Combobox
 *
 * Bietet eine einzelne Combobox für Anmeldung bestehender
 * und automatische Registrierung neuer Benutzer.
 */
export function LoginWindow(_props: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Server-Guard: Redirect zu /server/setup wenn kein Server konfiguriert
  const { isLoading: serverLoading, hasServer } = useRequireServer();

  // Server-Verwaltung
  const servers = useServerList();
  const activeServer = useActiveServer();
  const connectionStatus = useStore(serverStore, (state) => state.connectionStatus);

  // Health-Checks für alle Server in der Liste aktivieren
  useServerListHealth();

  // State für Lösch-Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Issue 7 Fix: Loading-State beim Server-Wechsel um Race Conditions zu verhindern
  const [isSwitching, setIsSwitching] = useState(false);
  const redirectTargetRef = useRef<string | null>(null);

  const { user, authStatus } = useCurrentUser();
  const unifiedAuth = useUnifiedAuth();
  const logout = useLogout();

  const { connectionMode, isLoading: healthLoading, isError: healthError } = useSystemHealth();
  const { frontendVersion, mismatchSeverity } = useSystemVersion();

  // Alle Hooks MUESSEN vor Early Returns aufgerufen werden (React Rules of Hooks)
  const indicatorStatus = getIndicatorStatus(healthLoading, healthError, connectionMode);

  // Server-Callbacks
  const handleServerChange = useCallback(
    async (serverId: string) => {
      // Issue 7 Fix: Verhindere parallele Server-Wechsel (Race Condition)
      if (isSwitching) return;

      // F4-Fix: Server-Name VOR async Operationen capturen um Stale Closure zu vermeiden
      const serverName = servers.find((s) => s.id === serverId)?.name ?? 'Unbekannt';

      setIsSwitching(true);
      try {
        await setActiveServer(serverId);
        // F7-Fix: Nur auth-bezogene Queries invalidieren statt alle
        await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
        await queryClient.invalidateQueries({ queryKey: ['system-health'] });
        toast.success('Server gewechselt', {
          description: `Verbindung zu "${serverName}" aktiv`,
        });
      } catch (error) {
        toast.error('Serverwechsel fehlgeschlagen', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching, queryClient, servers],
  );

  const handleAddServer = useCallback(() => {
    navigate({ to: '/server/setup' });
  }, [navigate]);

  const handleManageServers = useCallback(() => {
    navigate({ to: '/server/manage' });
  }, [navigate]);

  const handleReconfigureServer = useCallback(
    (serverId: string) => {
      const server = servers.find((s) => s.id === serverId);
      if (server) {
        // Navigiere zu /server/setup mit der Server-URL als Query-Parameter
        navigate({ to: '/server/setup', search: { server: server.url } });
      }
    },
    [navigate, servers],
  );

  const handleDeleteServer = useCallback(
    (serverId: string) => {
      // F6-Fix: Validierung ob Server noch existiert (Multi-Tab Szenario)
      const server = servers.find((s) => s.id === serverId);
      if (!server) {
        toast.error('Server nicht gefunden', {
          description: 'Dieser Server wurde bereits gelöscht',
        });
        return;
      }

      setServerToDelete(serverId);
      setDeleteDialogOpen(true);
    },
    [servers],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!serverToDelete) return;

    // F1-Fix: Prüfe ob aktiver Server gelöscht wird
    const isActiveServer = serverToDelete === activeServer?.id;
    // F8-Fix: Prüfe ob letzter Server gelöscht wird (für Redirect-Handling)
    const willBeLastServer = servers.length === 1;
    const serverName = servers.find((s) => s.id === serverToDelete)?.name;

    if (isActiveServer) {
      toast.warning('Aktiver Server', {
        description: 'Du wirst von diesem Server abgemeldet.',
      });
    }

    setIsDeleting(true);
    try {
      // F1-Fix: Auth-State invalidieren wenn aktiver Server gelöscht wird
      if (isActiveServer) {
        await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
      }

      await removeServer(serverToDelete);

      // F8-Fix: Dialog sofort schließen um Memory Leaks bei Redirect zu vermeiden
      setDeleteDialogOpen(false);
      setServerToDelete(null);

      // H6: Early return BEFORE toast wenn letzter Server geloescht wird
      // useRequireServer wird automatisch redirecten - kein Toast noetig
      if (willBeLastServer) {
        return; // Early return - skip toast, redirect pending
      }

      // Toast nur wenn nicht redirected wird
      toast.success('Server gelöscht', {
        description: `"${serverName}" wurde entfernt`,
      });
      // F7-Fix: Nur auth-bezogene Queries invalidieren
      await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
      await queryClient.invalidateQueries({ queryKey: ['system-health'] });
    } catch (error) {
      toast.error('Löschen fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [serverToDelete, servers, queryClient, activeServer]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setServerToDelete(null);
  }, []);

  const resolveRedirectTarget = useCallback((fallbackTarget: string): string => {
    if (redirectTargetRef.current) {
      return redirectTargetRef.current;
    }

    const redirectFromSearch = getRedirectFromSearch(window.location.search);
    if (redirectFromSearch) {
      consumeRedirectAfterLogin();
      redirectTargetRef.current = redirectFromSearch;
      return redirectFromSearch;
    }

    const redirectFromStore = sanitizeInternalRedirectPath(consumeRedirectAfterLogin());
    if (redirectFromStore) {
      redirectTargetRef.current = redirectFromStore;
      return redirectFromStore;
    }

    redirectTargetRef.current = fallbackTarget;
    return fallbackTarget;
  }, []);

  const handleAuth = useCallback(
    (authData: AuthRequestDto) => {
      unifiedAuth.mutate(authData, {
        onSuccess: async (response) => {
          const successMessage = response.isNewUser ? 'Willkommen! Ihr Account wurde erfolgreich erstellt.' : 'Sie wurden erfolgreich angemeldet.';

          toast.success('Erfolgreich', {
            description: successMessage,
          });

          // Warte explizit auf Refetch der Auth-Daten BEVOR Navigation
          // Dies stellt sicher, dass AppGuard den neuen User sieht
          await queryClient.refetchQueries({
            queryKey: AUTH_KEYS.auth.queries.authCheck,
          });
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userAuth');

          toast.error('Authentifizierung fehlgeschlagen', {
            description: message,
          });
        },
      });
    },
    [unifiedAuth, queryClient],
  );

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      const redirectTarget = resolveRedirectTarget('/');
      void navigate({ to: redirectTarget as never, replace: true });
    }
  }, [authStatus, user, navigate, resolveRedirectTarget]);

  // Early Returns NACH allen Hooks
  // H7: Loading-State während Server-Store Hydration ODER wenn kein Server (Redirect pending)
  // Verhindert Flash des Login-Formulars bevor Redirect
  // isHydrated = !serverLoading, also hasServer && !serverLoading bedeutet Store ist hydriert
  const isHydrated = !serverLoading;
  if (serverLoading || (!hasServer && isHydrated)) {
    return (
      <AuthLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="xl" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard className="mx-5 w-full max-w-md">
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="space-y-6 text-center">
            <LogoWithIndicator size="lg" status={indicatorStatus} />
            <Heading size="2xl" className="text-gray-900 dark:text-white">
              Bluelight Hub
            </Heading>
            <Text size="md" color="muted">
              Einsatzmanagement-System
            </Text>
          </div>

          {/* Server-Anzeige - Dropdown wird IMMER angezeigt (auch bei 1 Server) für konsistente UX */}
          {servers.length >= 1 && (
            <div className="w-full">
              <ServerSelector
                servers={servers}
                activeServer={activeServer}
                connectionStatus={connectionStatus}
                onServerChange={handleServerChange}
                onAddServer={handleAddServer}
                onReconfigureServer={handleReconfigureServer}
                onDeleteServer={handleDeleteServer}
                onManageServers={handleManageServers}
                disabled={isSwitching}
                isAuthenticated={!!user}
                onLogoutAndSwitch={async (targetServerId: string) => {
                  // AC4: Logout durchführen, dann Server wechseln
                  await logout.mutateAsync();
                  await setActiveServer(targetServerId);
                  // Bereits auf /auth, nur Queries invalidieren
                  await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
                }}
              />
            </div>
          )}

          {/* Form Container */}
          <div className="w-full">
            <UnifiedAuthForm onSubmit={handleAuth} isLoading={unifiedAuth.isPending} error={unifiedAuth.error ?? null} />
          </div>

          {/* Footer */}
          <AuthFooter
            badges={[
              {
                label: STATUS_LABELS[indicatorStatus],
                variant: 'default',
                dotColor: STATUS_DOT_COLORS[indicatorStatus],
              },
              ...(mismatchSeverity === 'critical' ? [{ label: 'Update erforderlich', variant: 'error' as const, dotColor: 'red' as const }] : []),
            ]}
            version={`v${frontendVersion}`}
          />
        </div>
      </AuthCard>

      {/* Lösch-Bestätigungs-Dialog */}
      <Dialog.Confirm
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Server löschen"
        message={`Möchtest du "${servers.find((s) => s.id === serverToDelete)?.name ?? 'diesen Server'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isProcessing={isDeleting}
      />
    </AuthLayout>
  );
}
