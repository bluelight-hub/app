import { consumeRedirectAfterLogin, useCurrentUser, useLogout, useUnifiedAuth } from '@/features/auth';
import { AUTH_KEYS } from '@/features/auth/api/queries';
import { useActiveServer, useRequireServer, useServerList, useServerListHealth } from '@/features/server/hooks';
import { serverStore, setActiveServer } from '@/features/server/stores/server.store';
import { ServerSelector } from '@/features/server/ui/molecules';
import { getIndicatorStatus, STATUS_DOT_COLORS, STATUS_LABELS, useSystemHealth, useSystemVersion } from '@/features/system';
import type { AuthRequestDto } from '@/shared';
import { normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { getRedirectFromSearch, navigateToInternalRedirect, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UnifiedAuthForm } from './UnifiedAuthForm';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

type AuthFeedbackAction = 'retry' | 'switch' | 'manage' | 'admin-login';

interface AuthFeedback {
  status: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  fieldMessage: string;
  actions: AuthFeedbackAction[];
}

function isConnectionIssueMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('verbindungsfehler') ||
    normalizedMessage.includes('server konnte nicht erreicht werden') ||
    normalizedMessage.includes('server ist vorübergehend nicht erreichbar') ||
    normalizedMessage.includes('dienst ist vorübergehend nicht verfügbar') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror')
  );
}

function createAuthFeedback(message: string): AuthFeedback {
  const normalizedMessage = message.toLowerCase();

  if (isConnectionIssueMessage(message)) {
    return {
      status: 'error',
      title: 'Server momentan nicht erreichbar',
      description: 'Prüfen Sie die Verbindung, versuchen Sie es erneut oder wählen Sie einen anderen Server.',
      fieldMessage: message,
      actions: ['retry', 'switch', 'manage'],
    };
  }

  if (normalizedMessage.includes('administrator') || normalizedMessage.includes('berechtigung')) {
    return {
      status: 'warning',
      title: 'Aktuelle Anmeldung reicht für diese Aktion nicht aus',
      description: 'Nutzen Sie den normalen Einstieg weiter oder öffnen Sie den Admin-Login für Verwaltungsaufgaben.',
      fieldMessage: message,
      actions: ['retry', 'admin-login', 'switch'],
    };
  }

  if (normalizedMessage.includes('gesperrt') || normalizedMessage.includes('abgelaufen')) {
    return {
      status: 'warning',
      title: 'Anmeldung muss erneut bestätigt werden',
      description: 'Versuchen Sie die Anmeldung erneut oder wechseln Sie bei Bedarf den Server.',
      fieldMessage: message,
      actions: ['retry', 'switch', 'manage'],
    };
  }

  return {
    status: 'error',
    title: 'Anmeldung fehlgeschlagen',
    description: 'Überprüfen Sie Ihre Eingaben. Benutzername und Serverauswahl bleiben erhalten.',
    fieldMessage: message,
    actions: ['retry', 'switch'],
  };
}

/**
 * Vereinheitlichtes Login-Fenster mit Combobox
 *
 * Bietet eine einzelne Combobox für Anmeldung bestehender
 * und automatische Registrierung neuer Benutzer.
 */
export function LoginWindow(_props: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Server-Guard: Redirect zu /server/setup wenn kein Server konfiguriert
  const { isLoading: serverLoading, hasServer } = useRequireServer();

  // Server-Verwaltung
  const servers = useServerList();
  const activeServer = useActiveServer();
  const connectionStatus = useStore(serverStore, (state) => state.connectionStatus);

  // Health-Checks für alle Server in der Liste aktivieren
  useServerListHealth();

  // Issue 7 Fix: Loading-State beim Server-Wechsel um Race Conditions zu verhindern
  const [isSwitching, setIsSwitching] = useState(false);
  const redirectTargetRef = useRef<string | null>(null);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);
  const [authFormError, setAuthFormError] = useState<string | null>(null);

  const { user, authStatus } = useCurrentUser();
  const unifiedAuth = useUnifiedAuth();
  const logout = useLogout();

  const { connectionMode, isLoading: healthLoading, isError: healthError, setupComplete, query: healthQuery } = useSystemHealth();
  const { frontendVersion, backendVersion, mismatchSeverity, isLoading: versionLoading, query: versionQuery } = useSystemVersion();

  // Alle Hooks MUESSEN vor Early Returns aufgerufen werden (React Rules of Hooks)
  const indicatorStatus = getIndicatorStatus(healthLoading, healthError, connectionMode);

  // Server-Callbacks
  const handleServerChange = useCallback(
    async (serverId: string) => {
      // Issue 7 Fix: Verhindere parallele Server-Wechsel (Race Condition)
      if (isSwitching) return;

      // F4-Fix: Server-Name VOR async Operationen capturen um Stale Closure zu vermeiden
      const nextServer = servers.find((server) => server.id === serverId);
      const serverName = nextServer?.name ?? 'Unbekannt';

      setIsSwitching(true);
      setAuthFeedback(null);
      setAuthFormError(null);
      try {
        await setActiveServer(serverId);
        if (nextServer?.url) {
          const nextServerScope = normalizeServerBaseUrl(nextServer.url);
          await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheckScoped(nextServerScope) });
          await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.publicUsersScoped(nextServerScope) });
        }
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

  const handleOpenAdminLogin = useCallback(() => {
    navigate({ to: '/admin-login' });
  }, [navigate]);

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
    async (authData: AuthRequestDto) => {
      setAuthFeedback(null);
      setAuthFormError(null);

      try {
        const response =
          typeof unifiedAuth.mutateAsync === 'function'
            ? await unifiedAuth.mutateAsync(authData)
            : await new Promise<Awaited<ReturnType<typeof unifiedAuth.mutateAsync>>>((resolve, reject) => {
                unifiedAuth.mutate(authData, {
                  onSuccess: (result) => resolve(result),
                  onError: (error) => reject(error),
                });
              });
        const successMessage = response.isNewUser ? 'Willkommen! Ihr Account wurde erfolgreich erstellt.' : 'Sie wurden erfolgreich angemeldet.';

        toast.success('Erfolgreich', {
          description: successMessage,
        });
      } catch (error) {
        const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userAuth');
        const feedback = createAuthFeedback(message);

        setAuthFeedback(feedback);
        setAuthFormError(feedback.fieldMessage);
      }
    },
    [unifiedAuth],
  );

  const handleRetryContext = useCallback(async () => {
    await Promise.allSettled([healthQuery.refetch(), versionQuery.refetch()]);
  }, [healthQuery, versionQuery]);

  const handleFocusServerSelector = useCallback(() => {
    document.getElementById('login-server-selector-button')?.focus();
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      const redirectTarget = resolveRedirectTarget('/app/einsaetze');
      navigateToInternalRedirect(router, redirectTarget, { replace: true });
    }
  }, [authStatus, user, router, resolveRedirectTarget]);

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

  const activeConnectionStatus = activeServer ? connectionStatus.get(activeServer.id) : undefined;
  const isContextBusy = isSwitching || healthLoading || versionLoading;
  const activeServerName = activeServer?.name ?? 'Der aktive Server';

  const contextAlert = (() => {
    if (indicatorStatus === 'error') {
      return {
        status: 'error' as const,
        title: 'Aktiver Server nicht erreichbar',
        description: `${activeServerName} antwortet aktuell nicht. Prüfen Sie die Verbindung oder wählen Sie einen anderen Server.`,
        actions: ['retry', 'switch', 'manage'] as const,
      };
    }

    if (indicatorStatus === 'offline') {
      return {
        status: 'warning' as const,
        title: 'Verbindung eingeschränkt',
        description: `${activeServerName} meldet gerade keinen stabilen Betriebszustand. Sie können die Prüfung erneut anstoßen oder den Server wechseln.`,
        actions: ['retry', 'switch', 'manage'] as const,
      };
    }

    if (indicatorStatus === 'checking' || activeConnectionStatus === 'checking') {
      return {
        status: 'info' as const,
        title: 'Verbindung wird geprüft',
        description: `Der Status von ${activeServerName} wird gerade aktualisiert.`,
        actions: ['switch', 'manage'] as const,
      };
    }

    if (!setupComplete) {
      return {
        status: 'warning' as const,
        title: 'Servereinrichtung unvollständig',
        description: `${activeServerName} ist noch nicht vollständig eingerichtet. Öffnen Sie das Setup oder prüfen Sie die Serverkonfiguration.`,
        actions: ['setup', 'manage'] as const,
      };
    }

    if (mismatchSeverity === 'critical') {
      return {
        status: 'error' as const,
        title: 'Versionen nicht kompatibel',
        description: `Frontend ${frontendVersion} und Backend ${backendVersion ?? 'unbekannt'} passen nicht zusammen. Wählen Sie einen anderen Server oder prüfen Sie die Installation.`,
        actions: ['retry', 'switch', 'manage'] as const,
      };
    }

    if (mismatchSeverity === 'warning') {
      return {
        status: 'warning' as const,
        title: 'Versionen weichen ab',
        description: `Frontend ${frontendVersion} und Backend ${backendVersion ?? 'unbekannt'} unterscheiden sich. Die Anmeldung bleibt möglich, aber Verhalten kann abweichen.`,
        actions: ['switch', 'manage'] as const,
      };
    }

    return null;
  })();

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

          {contextAlert && (
            <Alert
              status={contextAlert.status}
              title={contextAlert.title}
              description={contextAlert.description}
              role={contextAlert.status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              aria-atomic="true"
              aria-busy={isContextBusy}
            >
              <div className="mt-4 flex flex-wrap gap-2">
                {contextAlert.actions.includes('retry') && (
                  <Button
                    type="button"
                    size="sm"
                    appearance="outline"
                    intent={contextAlert.status === 'error' ? 'danger' : contextAlert.status === 'warning' ? 'warning' : 'info'}
                    onClick={() => void handleRetryContext()}
                    loading={isContextBusy}
                  >
                    Erneut prüfen
                  </Button>
                )}
                {contextAlert.actions.includes('switch') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleFocusServerSelector}>
                    Server wechseln
                  </Button>
                )}
                {contextAlert.actions.includes('manage') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleManageServers}>
                    Server verwalten
                  </Button>
                )}
                {contextAlert.actions.includes('setup') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleAddServer}>
                    Setup öffnen
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* Server-Anzeige - Dropdown wird IMMER angezeigt (auch bei 1 Server) für konsistente UX */}
          {servers.length >= 1 && (
            <div className="w-full">
              <ServerSelector
                buttonId="login-server-selector-button"
                servers={servers}
                activeServer={activeServer}
                connectionStatus={connectionStatus}
                onServerChange={handleServerChange}
                onAddServer={handleAddServer}
                onManageServers={handleManageServers}
                disabled={isSwitching}
                isAuthenticated={!!user}
                onLogoutAndSwitch={async (targetServerId: string) => {
                  // AC4: Logout durchführen, dann Server wechseln
                  const targetServer = servers.find((server) => server.id === targetServerId);
                  await logout.mutateAsync();
                  await setActiveServer(targetServerId);
                  setAuthFeedback(null);
                  setAuthFormError(null);
                  if (targetServer?.url) {
                    const targetServerScope = normalizeServerBaseUrl(targetServer.url);
                    await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheckScoped(targetServerScope) });
                    await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.publicUsersScoped(targetServerScope) });
                  }
                }}
              />
            </div>
          )}

          {/* Form Container */}
          <div className="w-full">
            <UnifiedAuthForm onSubmit={handleAuth} isLoading={unifiedAuth.isPending} error={authFormError} />
          </div>

          {authFeedback && (
            <Alert
              status={authFeedback.status}
              title={authFeedback.title}
              description={authFeedback.description}
              role={authFeedback.status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="mt-4 flex flex-wrap gap-2">
                {authFeedback.actions.includes('retry') && (
                  <Button
                    type="button"
                    size="sm"
                    appearance="outline"
                    intent={authFeedback.status === 'warning' ? 'warning' : 'danger'}
                    onClick={() => {
                      setAuthFeedback(null);
                      setAuthFormError(null);
                    }}
                  >
                    Erneut versuchen
                  </Button>
                )}
                {authFeedback.actions.includes('switch') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleFocusServerSelector}>
                    Server wechseln
                  </Button>
                )}
                {authFeedback.actions.includes('manage') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleManageServers}>
                    Server verwalten
                  </Button>
                )}
                {authFeedback.actions.includes('admin-login') && (
                  <Button type="button" size="sm" appearance="outline" intent="secondary" onClick={handleOpenAdminLogin}>
                    Admin-Login öffnen
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* Footer */}
          <AuthFooter
            badges={[
              ...(indicatorStatus !== 'online'
                ? [
                    {
                      label: STATUS_LABELS[indicatorStatus],
                      variant: indicatorStatus === 'error' ? ('error' as const) : indicatorStatus === 'offline' ? ('warning' as const) : ('info' as const),
                      dotColor: STATUS_DOT_COLORS[indicatorStatus],
                    },
                  ]
                : []),
              ...(mismatchSeverity === 'critical' ? [{ label: 'Update erforderlich', variant: 'error' as const, dotColor: 'red' as const }] : []),
            ]}
            version={`v${frontendVersion}`}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
