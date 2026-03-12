import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { AUTH_KEYS, consumeRedirectAfterLogin, useCurrentUser, useLogout, useUnifiedAuth } from '@/features/auth';
import { useActiveServer, useRequireServer, useServerList, useServerListHealth } from '@/features/server/hooks';
import { removeServer, serverStore, setActiveServer } from '@/features/server/stores/server.store';
import { ServerNavigationActions, ServerSelector } from '@/features/server/ui/molecules';
import { getIndicatorStatus, STATUS_DOT_COLORS, STATUS_LABELS, SYSTEM_QUERY_KEYS, useSystemHealth, useSystemVersion } from '@/features/system';
import type { AuthRequestDto } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { getRedirectFromSearch, navigateToInternalRedirect, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { cn } from '@/shared/ui/cn';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PiArrowsClockwise, PiCaretDown, PiGear, PiPlus } from 'react-icons/pi';
import { toast } from 'sonner';
import { UnifiedAuthForm } from './UnifiedAuthForm';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

type WorkspaceState = 'checking' | 'connected' | 'unreachable' | 'update-required' | 'setup-required';

interface WorkspaceStateConfig {
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  dotClassName: string;
  title: string;
  description: string;
  liveMode: 'polite' | 'assertive';
  role: 'status' | 'alert';
  surfaceClassName: string;
  badgeClassName: string;
}

const WORKSPACE_STATE_CONFIG: Record<WorkspaceState, WorkspaceStateConfig> = {
  checking: {
    badge: 'Prüft Verbindung',
    badgeVariant: 'outline',
    dotClassName: 'bg-sky-500',
    title: 'Verbindung wird geprüft',
    description: 'Der Einstieg synchronisiert gerade Server- und Systemstatus. Sobald die Prüfung abgeschlossen ist, kannst du dich direkt anmelden.',
    liveMode: 'polite',
    role: 'status',
    surfaceClassName: 'border-sky-200/80 bg-sky-50/85 dark:border-sky-950/60 dark:bg-sky-950/25',
    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200',
  },
  connected: {
    badge: 'Bereit',
    badgeVariant: 'outline',
    dotClassName: 'bg-emerald-500',
    title: 'Server bereit',
    liveMode: 'polite',
    role: 'status',
    surfaceClassName: 'border-slate-200/80 bg-white/85 dark:border-slate-800/80 dark:bg-slate-950/50',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  unreachable: {
    badge: 'Nicht erreichbar',
    badgeVariant: 'destructive',
    dotClassName: 'bg-rose-500',
    title: 'Server nicht erreichbar',
    description: 'Es gibt keinen belastbaren Health-Status für den aktiven Server. Prüfe die Verbindung oder richte den Server bei Bedarf neu ein.',
    liveMode: 'assertive',
    role: 'alert',
    surfaceClassName: 'border-amber-200/80 bg-amber-50/90 dark:border-amber-950/60 dark:bg-amber-950/30',
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200',
  },
  'update-required': {
    badge: 'Update erforderlich',
    badgeVariant: 'outline',
    dotClassName: 'bg-rose-500',
    title: 'Update erforderlich',
    description: 'Frontend und Backend sprechen aktuell nicht dieselbe Hauptversion. Aktualisiere die Anwendung oder wechsle auf einen kompatiblen Server.',
    liveMode: 'assertive',
    role: 'alert',
    surfaceClassName: 'border-rose-200/80 bg-rose-50/90 dark:border-rose-950/60 dark:bg-rose-950/30',
    badgeClassName: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200',
  },
  'setup-required': {
    badge: 'Setup erforderlich',
    badgeVariant: 'outline',
    dotClassName: 'bg-indigo-500',
    title: 'Server zuerst einrichten',
    description: 'Für diesen Einstieg fehlt noch ein vollständiger Serverkontext. Richte den Server zuerst ein, bevor du dich anmeldest.',
    liveMode: 'assertive',
    role: 'alert',
    surfaceClassName: 'border-indigo-200/80 bg-indigo-50/90 dark:border-indigo-950/60 dark:bg-indigo-950/30',
    badgeClassName: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-200',
  },
};

function getConnectionStatusLabel(status: 'connected' | 'checking' | 'disconnected' | undefined): string {
  switch (status) {
    case 'connected':
      return 'Erreichbar';
    case 'checking':
      return 'Wird geprüft';
    case 'disconnected':
      return 'Nicht erreichbar';
    default:
      return 'Unbekannt';
  }
}

function resolveWorkspaceState({
  activeServerId,
  activeConnectionStatus,
  healthLoading,
  healthError,
  mismatchSeverity,
  setupComplete,
  versionLoading,
  isSwitching,
}: {
  activeServerId: string | null | undefined;
  activeConnectionStatus: 'connected' | 'checking' | 'disconnected' | undefined;
  healthLoading: boolean;
  healthError: boolean;
  mismatchSeverity: 'critical' | 'warning' | 'none';
  setupComplete: boolean;
  versionLoading: boolean;
  isSwitching: boolean;
}): WorkspaceState {
  if (!activeServerId || !setupComplete) {
    return 'setup-required';
  }

  if (isSwitching || healthLoading || versionLoading || activeConnectionStatus === 'checking') {
    return 'checking';
  }

  if (healthError || activeConnectionStatus === 'disconnected') {
    return 'unreachable';
  }

  if (mismatchSeverity === 'critical') {
    return 'update-required';
  }

  return 'connected';
}

/**
 * Vereinheitlichtes Login-Fenster mit moderner Einstiegsshell
 *
 * Kombiniert Serverstatus, Serverwahl und Authentifizierung in einem
 * ruhigen, informationsdichten Workspace ohne die bestehende Auth-Logik
 * fachlich zu verändern.
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

  // State für Lösch-Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Loading-State beim Server-Wechsel um Race Conditions zu verhindern
  const [isSwitching, setIsSwitching] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const redirectTargetRef = useRef<string | null>(null);

  const { user, authStatus } = useCurrentUser();
  const unifiedAuth = useUnifiedAuth();
  const logout = useLogout();

  const { connectionMode, setupComplete, isLoading: healthLoading, isError: healthError, error: healthQueryError } = useSystemHealth();
  const { frontendVersion, backendVersion, mismatchSeverity, isLoading: versionLoading } = useSystemVersion();

  const indicatorStatus = getIndicatorStatus(healthLoading, healthError, connectionMode);
  const activeConnectionStatus = activeServer ? connectionStatus.get(activeServer.id) : undefined;
  const workspaceState = resolveWorkspaceState({
    activeServerId: activeServer?.id,
    activeConnectionStatus,
    healthLoading,
    healthError,
    mismatchSeverity,
    setupComplete,
    versionLoading,
    isSwitching,
  });
  const workspaceStateConfig = WORKSPACE_STATE_CONFIG[workspaceState];
  const statusRegionDescription =
    workspaceState === 'connected' && connectionMode === 'offline'
      ? 'Der Server ist erreichbar, arbeitet aber aktuell im eingeschränkten Modus.'
      : workspaceState === 'checking' && isSwitching
        ? 'Der Serverwechsel wird abgeschlossen und der neue Kontext geprüft.'
        : workspaceStateConfig.description;

  // Server-Callbacks
  const handleServerChange = useCallback(
    async (serverId: string) => {
      if (isSwitching) return;

      const serverName = servers.find((server) => server.id === serverId)?.name ?? 'Unbekannt';

      setIsSwitching(true);
      try {
        await setActiveServer(serverId);
        toast.success('Server gewechselt', {
          description: `Verbindung zu "${serverName}" aktiv`,
        });
        await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
        await queryClient.invalidateQueries({ queryKey: SYSTEM_QUERY_KEYS.health() });
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

  const handleRefreshStatus = useCallback(async () => {
    await Promise.all([queryClient.refetchQueries({ queryKey: SYSTEM_QUERY_KEYS.health() }), queryClient.refetchQueries({ queryKey: SYSTEM_QUERY_KEYS.version() })]);
  }, [queryClient]);

  const handleAddServer = useCallback(() => {
    navigate({ to: '/server/setup' });
  }, [navigate]);

  const handleManageServers = useCallback(() => {
    navigate({ to: '/server/manage' });
  }, [navigate]);

  const handleReconfigureServer = useCallback(
    (serverId: string) => {
      const server = servers.find((entry) => entry.id === serverId);
      if (server) {
        // Verhindert, dass ein alter/pendender Auth-Check den Setup-Flow blockiert.
        void queryClient.cancelQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
        queryClient.removeQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
        void navigate({ to: '/server/setup', search: { server: server.url } });
      }
    },
    [navigate, queryClient, servers],
  );

  const handleDeleteServer = useCallback(
    (serverId: string) => {
      const server = servers.find((entry) => entry.id === serverId);
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

    const isActiveServer = serverToDelete === activeServer?.id;
    const willBeLastServer = servers.length === 1;
    const serverName = servers.find((server) => server.id === serverToDelete)?.name;

    if (isActiveServer) {
      toast.warning('Aktiver Server', {
        description: 'Du wirst von diesem Server abgemeldet.',
      });
    }

    setIsDeleting(true);
    try {
      if (isActiveServer) {
        await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
      }

      await removeServer(serverToDelete);

      setDeleteDialogOpen(false);
      setServerToDelete(null);

      if (willBeLastServer) {
        return;
      }

      toast.success('Server gelöscht', {
        description: `"${serverName}" wurde entfernt`,
      });
      await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
      await queryClient.invalidateQueries({ queryKey: SYSTEM_QUERY_KEYS.health() });
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
      setAuthErrorMessage(null);
      unifiedAuth.mutate(authData, {
        onSuccess: async (response) => {
          const successMessage = response.isNewUser ? 'Willkommen! Ihr Account wurde erfolgreich erstellt.' : 'Sie wurden erfolgreich angemeldet.';

          setAuthErrorMessage(null);
          toast.success('Erfolgreich', {
            description: successMessage,
          });

          await queryClient.refetchQueries({
            queryKey: AUTH_KEYS.auth.queries.authCheck,
          });
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userAuth');

          setAuthErrorMessage(message);
          toast.error('Authentifizierung fehlgeschlagen', {
            description: message,
          });
        },
      });
    },
    [unifiedAuth, queryClient],
  );

  const handleAuthFormValueChange = useCallback(() => {
    if (authErrorMessage) {
      setAuthErrorMessage(null);
    }

    if (unifiedAuth.error) {
      unifiedAuth.reset?.();
    }
  }, [authErrorMessage, unifiedAuth]);

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      const redirectTarget = resolveRedirectTarget('/');
      navigateToInternalRedirect(router, redirectTarget, { replace: true });
    }
  }, [authStatus, user, router, resolveRedirectTarget]);

  const prioritizeStatusOnSmallScreens = workspaceState !== 'connected';
  const [isStatusExpanded, setIsStatusExpanded] = useState(prioritizeStatusOnSmallScreens);

  useEffect(() => {
    setIsStatusExpanded(prioritizeStatusOnSmallScreens);
  }, [prioritizeStatusOnSmallScreens]);

  const handleStatusCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isStatusExpanded) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }

      setIsStatusExpanded(true);
    },
    [isStatusExpanded],
  );

  const isHydrated = !serverLoading;
  if (serverLoading || (!hasServer && isHydrated)) {
    return (
      <AuthLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <Spinner size="xl" />
            </div>
            <Text size="sm" color="muted">
              Einstieg wird vorbereitet...
            </Text>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const versionStateLabel = mismatchSeverity === 'critical' ? 'Update erforderlich' : mismatchSeverity === 'warning' ? 'Versionshinweis' : backendVersion ? 'Synchron' : 'Frontend lokal';

  const footerBadges = [
    {
      label: STATUS_LABELS[indicatorStatus],
      variant: indicatorStatus === 'error' ? ('error' as const) : indicatorStatus === 'offline' ? ('warning' as const) : ('default' as const),
      dotColor: STATUS_DOT_COLORS[indicatorStatus],
    },
  ];

  return (
    <AuthLayout>
      <AuthCard className="mx-auto w-full max-w-6xl" padding="none">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={cn(
              'border-slate-200/80 border-b bg-slate-50/85 p-6 lg:border-r lg:border-b-0 lg:p-8 dark:border-slate-800/80 dark:bg-slate-900/60',
              'flex h-full flex-col',
              prioritizeStatusOnSmallScreens ? 'order-1 lg:order-none' : 'order-2 lg:order-none',
            )}
          >
            <div className="flex h-full flex-col gap-6">
              <div className="space-y-3">
                <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.2em] dark:text-sky-300">
                  Einstieg
                </Text>
                <Heading as="h1" size="2xl">
                  Arbeitsfähigkeit prüfen
                </Heading>
              </div>

              <Card
                role={workspaceStateConfig.role}
                aria-live={workspaceStateConfig.liveMode}
                className={cn('rounded-xl shadow-none', !isStatusExpanded && 'cursor-pointer', workspaceStateConfig.surfaceClassName)}
                onClick={handleStatusCardClick}
              >
                <CardHeader className="gap-3 p-4 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.14em] dark:text-slate-400">
                        Systemstatus
                      </Text>
                      <Heading as="h2" size="lg">
                        {workspaceStateConfig.title}
                      </Heading>
                      {isStatusExpanded && <CardDescription className="text-slate-600 dark:text-slate-300">{statusRegionDescription}</CardDescription>}
                    </div>

                    <div className="flex items-center gap-1.5 self-start">
                      <Badge variant={workspaceStateConfig.badgeVariant} className={cn('rounded-md shadow-none', workspaceStateConfig.badgeClassName)}>
                        <span className={cn('size-2 rounded-full', workspaceStateConfig.dotClassName)} aria-hidden="true" />
                        {workspaceStateConfig.badge}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="rounded-md"
                        aria-controls="login-system-status-details"
                        aria-expanded={isStatusExpanded}
                        aria-label={isStatusExpanded ? 'Systemstatus einklappen' : 'Systemstatus ausklappen'}
                        onClick={() => setIsStatusExpanded((current) => !current)}
                      >
                        <PiCaretDown className={cn('size-4 transition-transform', isStatusExpanded && 'rotate-180')} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isStatusExpanded && (
                  <CardContent id="login-system-status-details" className="space-y-4 p-4 pt-0">
                    <dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200/80 bg-white/80 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-950/50">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
                        <Text as="dt" size="xs" className="font-medium text-slate-500 dark:text-slate-400">
                          Aktiver Server
                        </Text>
                        <Text as="dd" size="sm" className="text-right font-semibold text-slate-900 dark:text-slate-100">
                          {activeServer?.name ?? 'Noch kein Server'}
                        </Text>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
                        <Text as="dt" size="xs" className="font-medium text-slate-500 dark:text-slate-400">
                          Erreichbarkeit
                        </Text>
                        <Text as="dd" size="sm" className="text-right font-semibold text-slate-900 dark:text-slate-100">
                          {getConnectionStatusLabel(activeConnectionStatus)}
                        </Text>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
                        <Text as="dt" size="xs" className="font-medium text-slate-500 dark:text-slate-400">
                          Versionsstand
                        </Text>
                        <Text as="dd" size="sm" className="text-right font-semibold text-slate-900 dark:text-slate-100">
                          {versionStateLabel}
                        </Text>
                      </div>
                    </dl>

                    {workspaceState === 'update-required' && (
                      <Text size="sm" className="text-slate-600 dark:text-slate-300">
                        Frontend {frontendVersion}
                        {backendVersion ? ` · Backend ${backendVersion}` : ''}
                      </Text>
                    )}

                    {workspaceState === 'unreachable' && healthQueryError && (
                      <Text size="sm" className="text-slate-600 dark:text-slate-300">
                        Letzter Fehler: {healthQueryError.message}
                      </Text>
                    )}
                  </CardContent>
                )}
              </Card>

              <div className="mt-auto space-y-2 pt-2">
                {(workspaceState === 'checking' || workspaceState === 'unreachable' || workspaceState === 'update-required') && (
                  <Button size="sm" variant="outline" className="w-full rounded-md" onClick={() => void handleRefreshStatus()}>
                    Erneut prüfen
                  </Button>
                )}

                <ServerNavigationActions
                  actions={[
                    activeServer
                      ? {
                          id: 'auth-setup-reconfigure',
                          label: 'Server neu einrichten',
                          icon: PiArrowsClockwise,
                          onClick: () => handleReconfigureServer(activeServer.id),
                        }
                      : {
                          id: 'auth-setup-add',
                          label: 'Server hinzufügen',
                          icon: PiPlus,
                          onClick: handleAddServer,
                        },
                    {
                      id: 'auth-manage',
                      label: 'Server verwalten',
                      icon: PiGear,
                      onClick: handleManageServers,
                    },
                  ]}
                />
              </div>
            </div>
          </aside>

          <section className={cn('p-6 lg:p-8', prioritizeStatusOnSmallScreens ? 'order-2 lg:order-none' : 'order-1 lg:order-none')}>
            <div className="mx-auto flex h-full max-w-xl flex-col">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <LogoWithIndicator size="lg" status={indicatorStatus} animateIndicator={false} />
                  <div className="space-y-2">
                    <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.2em] dark:text-sky-300">
                      Bluelight Hub
                    </Text>
                    <Heading as="h2" size="2xl">
                      Anmeldung
                    </Heading>
                    <Text size="sm" color="muted">
                      Melde dich mit deinem Benutzerprofil am ausgewählten Server an. Der bekannte Ein-Feld-Flow und alle Redirect-Regeln bleiben unverändert.
                    </Text>
                  </div>
                </div>

                {servers.length >= 1 && (
                  <Card className="rounded-xl border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40">
                    <CardHeader className="p-4 pb-3">
                      <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">
                        Serverauswahl
                      </Text>
                      <CardDescription>Bei Bedarf Server wechseln oder neu einrichten, ohne den Einstieg zu verlassen.</CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-0">
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
                          await logout.mutateAsync();
                          await setActiveServer(targetServerId);
                          await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.auth.queries.authCheck });
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                <UnifiedAuthForm
                  onSubmit={handleAuth}
                  isLoading={unifiedAuth.isPending}
                  errorMessage={authErrorMessage}
                  onValueChange={handleAuthFormValueChange}
                  className="border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40"
                />
              </div>

              <div className="mt-8">
                <AuthFooter
                  badges={footerBadges}
                  version={
                    mismatchSeverity === 'critical' || mismatchSeverity === 'warning' ? (backendVersion ? `Frontend ${frontendVersion} · Backend ${backendVersion}` : frontendVersion) : frontendVersion
                  }
                />
              </div>
            </div>
          </section>
        </div>
      </AuthCard>

      <Dialog.Confirm
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Server löschen"
        message={`Möchtest du "${servers.find((server) => server.id === serverToDelete)?.name ?? 'diesen Server'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isProcessing={isDeleting}
      />
    </AuthLayout>
  );
}
