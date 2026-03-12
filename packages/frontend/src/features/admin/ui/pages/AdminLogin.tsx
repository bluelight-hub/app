import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { consumeRedirectAfterLogin, SessionContextCard, useAdminLogin, useCurrentUser } from '@/features/auth';
import { useActiveServer } from '@/features/server/hooks';
import { getIndicatorStatus, STATUS_DOT_COLORS, STATUS_LABELS, SYSTEM_QUERY_KEYS, useSystemHealth, useSystemVersion } from '@/features/system';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { getRedirectFromSearch, navigateToInternalRedirect, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { InlineSpinner, Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { cn } from '@/shared/ui/cn';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PiArrowsClockwise, PiCaretDown, PiEye, PiEyeClosed, PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';
import { z } from 'zod';

const adminLoginSchema = z.object({
  password: z.string().trim().min(1, 'Passwort ist erforderlich'),
});

type AdminWorkspaceState = 'checking' | 'connected' | 'unreachable' | 'update-required' | 'setup-required';

interface AdminWorkspaceStateConfig {
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

interface AdminActionBlockConfig {
  status: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  actionLabel?: string;
}

const ADMIN_WORKSPACE_STATE_CONFIG: Record<AdminWorkspaceState, AdminWorkspaceStateConfig> = {
  checking: {
    badge: 'Prüft Kontext',
    badgeVariant: 'outline',
    dotClassName: 'bg-sky-500',
    title: 'Admin-Kontext wird geprüft',
    description: 'Server-, System- und Versionsstatus werden aktualisiert. Sobald der Kontext bereit ist, kannst du die Admin-Sitzung öffnen.',
    liveMode: 'polite',
    role: 'status',
    surfaceClassName: 'border-sky-200/80 bg-sky-50/85 dark:border-sky-950/60 dark:bg-sky-950/25',
    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200',
  },
  connected: {
    badge: 'Bereit',
    badgeVariant: 'outline',
    dotClassName: 'bg-emerald-500',
    title: 'Admin-Zugang bereit',
    description: 'Deine normale Benutzersitzung ist aktiv. Mit dem Admin-Passwort schaltest du jetzt eine separate Verwaltungs-Sitzung für diesen Server frei.',
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
    description: 'Ohne belastbaren Serverstatus sollte keine Admin-Sitzung geöffnet werden. Prüfe zuerst Verbindung und Serverkontext.',
    liveMode: 'assertive',
    role: 'alert',
    surfaceClassName: 'border-amber-200/80 bg-amber-50/90 dark:border-amber-950/60 dark:bg-amber-950/30',
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200',
  },
  'update-required': {
    badge: 'Update erforderlich',
    badgeVariant: 'outline',
    dotClassName: 'bg-rose-500',
    title: 'Versionsstand blockiert Admin-Zugang',
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
    title: 'Serverkontext fehlt',
    description: 'Für diese Sitzung fehlt ein vollständiger Serverkontext. Richte den Server zuerst ein, bevor du den Admin-Zugang öffnest.',
    liveMode: 'assertive',
    role: 'alert',
    surfaceClassName: 'border-indigo-200/80 bg-indigo-50/90 dark:border-indigo-950/60 dark:bg-indigo-950/30',
    badgeClassName: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-200',
  },
};

function getConnectionStatusLabel(connectionMode: 'checking' | 'online' | 'offline' | 'error', healthError: boolean): string {
  if (healthError || connectionMode === 'error') {
    return 'Nicht erreichbar';
  }

  if (connectionMode === 'checking') {
    return 'Wird geprüft';
  }

  if (connectionMode === 'offline') {
    return 'Eingeschränkt';
  }

  return 'Erreichbar';
}

function resolveAdminWorkspaceState({
  activeServerId,
  setupComplete,
  healthLoading,
  healthError,
  connectionMode,
  versionLoading,
  mismatchSeverity,
}: {
  activeServerId: string | null | undefined;
  setupComplete: boolean;
  healthLoading: boolean;
  healthError: boolean;
  connectionMode: 'checking' | 'online' | 'offline' | 'error';
  versionLoading: boolean;
  mismatchSeverity: 'critical' | 'warning' | 'none';
}): AdminWorkspaceState {
  if (!activeServerId || !setupComplete) {
    return 'setup-required';
  }

  if (healthLoading || versionLoading || connectionMode === 'checking') {
    return 'checking';
  }

  if (healthError || connectionMode === 'error') {
    return 'unreachable';
  }

  if (mismatchSeverity === 'critical') {
    return 'update-required';
  }

  return 'connected';
}

function getAdminActionBlockConfig(workspaceState: AdminWorkspaceState): AdminActionBlockConfig | null {
  switch (workspaceState) {
    case 'checking':
      return {
        status: 'info',
        title: 'Admin-Kontext wird noch geprüft',
        description: 'Warte, bis Server- und Versionsstatus vollständig geladen sind, bevor du die Admin-Sitzung öffnest.',
      };
    case 'setup-required':
      return {
        status: 'warning',
        title: 'Serverkontext fehlt',
        description: 'Ohne vollständigen Serverkontext kann keine Admin-Sitzung geöffnet werden. Richte zuerst einen Server ein oder vervollständige das Setup.',
        actionLabel: 'Server einrichten',
      };
    case 'unreachable':
      return {
        status: 'error',
        title: 'Serverstatus zuerst stabilisieren',
        description: 'Prüfe zuerst Verbindung und Serverkontext. Solange der Server nicht erreichbar ist, bleibt der Admin-Login gesperrt.',
      };
    case 'update-required':
      return {
        status: 'error',
        title: 'Versionskonflikt zuerst lösen',
        description: 'Frontend und Backend müssen kompatibel sein, bevor eine separate Admin-Sitzung geöffnet werden kann.',
      };
    default:
      return null;
  }
}

export function AdminLogin() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeServer = useActiveServer();
  const { user, isLoading, isAdminAuthenticated, adminStatus, adminSessionStatus } = useCurrentUser();
  const loginAdmin = useAdminLogin();
  const { connectionMode, setupComplete, isLoading: healthLoading, isError: healthError, error: healthQueryError } = useSystemHealth();
  const { frontendVersion, backendVersion, mismatchSeverity, isLoading: versionLoading } = useSystemVersion();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const redirectTargetRef = useRef<string | null>(null);
  const indicatorStatus = getIndicatorStatus(healthLoading, healthError, connectionMode);
  const workspaceState = resolveAdminWorkspaceState({
    activeServerId: activeServer?.id,
    setupComplete,
    healthLoading,
    healthError,
    connectionMode,
    versionLoading,
    mismatchSeverity,
  });
  const workspaceStateConfig = ADMIN_WORKSPACE_STATE_CONFIG[workspaceState];
  const prioritizeStatusOnSmallScreens = workspaceState !== 'connected';
  const [isStatusExpanded, setIsStatusExpanded] = useState(prioritizeStatusOnSmallScreens);
  const versionStateLabel = mismatchSeverity === 'critical' ? 'Update erforderlich' : mismatchSeverity === 'warning' ? 'Versionshinweis' : backendVersion ? 'Synchron' : 'Frontend lokal';
  const footerBadges = [
    {
      label: STATUS_LABELS[indicatorStatus],
      variant: indicatorStatus === 'error' ? ('error' as const) : indicatorStatus === 'offline' ? ('warning' as const) : ('default' as const),
      dotColor: STATUS_DOT_COLORS[indicatorStatus],
    },
  ];
  const adminActionBlock = getAdminActionBlockConfig(workspaceState);
  const isAdminActionBlocked = adminActionBlock !== null;

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

  const handleOpenServerSetup = useCallback(() => {
    void navigate({ to: '/server/setup' });
  }, [navigate]);

  const form = useForm({
    defaultValues: {
      password: '',
    },
    validators: {
      onChange: adminLoginSchema,
    },
    onSubmit: async ({ value }) => {
      setApiError(null);

      return loginAdmin.mutateAsync(
        {
          password: value.password,
        },
        {
          onSuccess: async () => {
            toast.success('Administrator-Zugang aktiviert', {
              description: 'Die separate Admin-Sitzung wurde erfolgreich geöffnet.',
            });
          },
          onError: async (error: Error) => {
            const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'adminLogin');

            setApiError(message);

            if (message.includes('Ungültiges') || message.includes('Passwort')) {
              setShouldShake(true);
              setTimeout(() => setShouldShake(false), 500);
            }

            toast.error(message.includes('Administratorrechte') ? 'Zugriff verweigert' : 'Anmeldung fehlgeschlagen', {
              description: message,
            });
          },
        },
      );
    },
  });

  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true);
    }
  }, [isLoading, hasCheckedAuth]);

  useEffect(() => {
    if (hasCheckedAuth) {
      if (user && isAdminAuthenticated) {
        const redirectTarget = resolveRedirectTarget('/admin/dashboard');
        navigateToInternalRedirect(router, redirectTarget, { replace: true });
      } else if (!user) {
        const redirectTarget = getRedirectFromSearch(window.location.search) ?? sanitizeInternalRedirectPath(consumeRedirectAfterLogin());
        void navigate({
          to: '/auth',
          search: redirectTarget
            ? {
                redirect: redirectTarget,
              }
            : undefined,
          replace: true,
        });
      } else if (user && adminStatus?.adminSetupAvailable) {
        void navigate({ to: '/admin/setup', replace: true });
      }
    }
  }, [user, hasCheckedAuth, isAdminAuthenticated, adminStatus?.adminSetupAvailable, navigate, router, resolveRedirectTarget]);

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

  const handleRefreshStatus = useCallback(async () => {
    await Promise.all([queryClient.refetchQueries({ queryKey: SYSTEM_QUERY_KEYS.health() }), queryClient.refetchQueries({ queryKey: SYSTEM_QUERY_KEYS.version() })]);
  }, [queryClient]);

  const handlePasswordInteraction = useCallback(() => {
    if (apiError) {
      setApiError(null);
    }
  }, [apiError]);

  if (!hasCheckedAuth) {
    return (
      <AuthLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <Spinner size="xl" />
            </div>
            <Text size="sm" color="muted">
              Admin-Zugang wird vorbereitet...
            </Text>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (user && isAdminAuthenticated) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (adminStatus?.adminSetupAvailable) {
    return null;
  }

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
                  Admin-Zugang
                </Text>
                <Heading as="h1" size="2xl">
                  Verwaltungszugang prüfen
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
                      {isStatusExpanded && <CardDescription className="text-slate-600 dark:text-slate-300">{workspaceStateConfig.description}</CardDescription>}
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
                        aria-controls="admin-login-status-details"
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
                  <CardContent id="admin-login-status-details" className="space-y-4 p-4 pt-0">
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
                          {getConnectionStatusLabel(connectionMode, healthError)}
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

              <div className="mt-auto pt-2">
                {(workspaceState === 'checking' || workspaceState === 'unreachable' || workspaceState === 'update-required') && (
                  <Button size="sm" variant="outline" className="w-full rounded-md" onClick={() => void handleRefreshStatus()}>
                    <PiArrowsClockwise className="size-4" />
                    Erneut prüfen
                  </Button>
                )}
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
                      Administrator-Anmeldung
                    </Heading>
                    <Text size="sm" color="muted">
                      Deine Benutzersitzung ist bereits aktiv. Gib jetzt das Admin-Passwort ein, um eine separate Verwaltungs-Sitzung für den aktuellen Server zu öffnen.
                    </Text>
                  </div>
                </div>

                <SessionContextCard
                  username={user.username}
                  role={user.role}
                  activeServerName={activeServer?.name ?? null}
                  adminSessionStatus={adminSessionStatus}
                  adminSetupAvailable={adminStatus?.adminSetupAvailable}
                  className="border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40"
                />

                <Card className="rounded-xl border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40">
                  <CardHeader className="p-5 pb-4">
                    <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">
                      Zugang
                    </Text>
                    <Heading size="lg" as="h3">
                      Admin-Sitzung freischalten
                    </Heading>
                    <CardDescription>
                      Nur Konten mit Administrationsrechten können hier eine zusätzliche Admin-Sitzung öffnen. Der normale Benutzerzugang bleibt dabei unverändert aktiv.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (isAdminActionBlocked) {
                          return;
                        }
                        void form.handleSubmit();
                      }}
                      className="space-y-6"
                    >
                      {adminActionBlock && (
                        <Alert status={adminActionBlock.status} title={adminActionBlock.title} description={adminActionBlock.description}>
                          {adminActionBlock.actionLabel ? (
                            <div className="mt-3">
                              <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={handleOpenServerSetup}>
                                {adminActionBlock.actionLabel}
                              </Button>
                            </div>
                          ) : null}
                        </Alert>
                      )}

                      {apiError && <Alert status="error" title="Anmeldung fehlgeschlagen" description={apiError} icon={<PiWarning className="h-5 w-5" />} />}

                      <form.Field name="password">
                        {(field) => {
                          const fieldError = field.state.meta.errors[0];
                          const validationMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;
                          const helperMessage = validationMessage || (capsLockActive ? 'Feststelltaste ist aktiviert.' : undefined);

                          return (
                            <div className="space-y-2">
                              <label htmlFor="admin-password" className="block font-medium text-slate-700 text-sm dark:text-slate-200">
                                Administrator-Passwort
                              </label>

                              <div className={cn('relative', shouldShake && 'animate-shake')}>
                                <Input
                                  id="admin-password"
                                  name={field.name}
                                  type={isPasswordVisible ? 'text' : 'password'}
                                  autoComplete="current-password"
                                  autoFocus
                                  placeholder="Admin-Passwort eingeben"
                                  value={field.state.value}
                                  aria-invalid={Boolean(validationMessage || apiError)}
                                  aria-describedby={helperMessage ? 'admin-password-hint' : undefined}
                                  className={cn(
                                    'h-11 rounded-lg border-slate-300 bg-white/95 pr-11 text-slate-900 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-sky-500/35 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100',
                                    (validationMessage || apiError) && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30',
                                  )}
                                  disabled={isAdminActionBlocked || form.state.isSubmitting || loginAdmin.isPending}
                                  onFocus={handlePasswordInteraction}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    handlePasswordInteraction();
                                    field.handleChange(event.target.value);
                                  }}
                                  onKeyDown={(event) => {
                                    setCapsLockActive(event.getModifierState('CapsLock'));
                                  }}
                                  onKeyUp={(event) => {
                                    setCapsLockActive(event.getModifierState('CapsLock'));
                                  }}
                                />

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md"
                                  aria-label={isPasswordVisible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                                  onClick={() => setIsPasswordVisible((current) => !current)}
                                  disabled={isAdminActionBlocked || form.state.isSubmitting || loginAdmin.isPending}
                                >
                                  {isPasswordVisible ? <PiEyeClosed className="size-4" /> : <PiEye className="size-4" />}
                                </Button>
                              </div>

                              {helperMessage && (
                                <p id="admin-password-hint" className={cn('text-sm', validationMessage ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300')}>
                                  {helperMessage}
                                </p>
                              )}
                            </div>
                          );
                        }}
                      </form.Field>

                      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                        {([canSubmit, isSubmitting]) => {
                          const isSubmittingCombined = isSubmitting || loginAdmin.isPending;

                          return (
                            <Button type="submit" size="lg" className="h-10 w-full rounded-md text-sm" disabled={isAdminActionBlocked || !canSubmit || isSubmittingCombined}>
                              {isSubmittingCombined && <InlineSpinner size="sm" className="mr-1.5 text-current" label="Admin-Sitzung wird geöffnet" />}
                              {isSubmittingCombined ? 'Admin-Sitzung wird geöffnet...' : 'Admin-Sitzung freischalten'}
                            </Button>
                          );
                        }}
                      </form.Subscribe>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <AuthFooter
                  badges={footerBadges}
                  version={
                    mismatchSeverity === 'critical' || mismatchSeverity === 'warning' ? (backendVersion ? `Frontend ${frontendVersion} · Backend ${backendVersion}` : frontendVersion) : frontendVersion
                  }
                  copyright="© 2026 Rubeen"
                />
              </div>
            </div>
          </section>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
