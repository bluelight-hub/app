import { fetchAdminStatus, fetchAuthCheck } from '@/shared/api/auth-session';
import { normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { AUTH_KEYS } from './queries';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { milliseconds } from 'date-fns';
import { serverStore } from '@/features/server/stores/server.store';
import { getAuthContextSummary } from '@/features/auth/utils';

/**
 * Hook zum Abrufen des aktuell eingeloggten Benutzers
 *
 * Führt einen Auth-Check durch und gibt Benutzer-Informationen zurück.
 *
 * @returns Query-Ergebnis mit User-Daten, Admin-Status und Loading-State
 *
 * @example
 * ```tsx
 * const { user, isAdminAuthenticated, isLoading } = useCurrentUser();
 *
 * if (isLoading) return <Spinner />;
 * if (!user) return <LoginPrompt />;
 *
 * return <UserProfile user={user} />;
 * ```
 */
export type AuthStatus = 'pending' | 'authenticated' | 'unauthenticated';
export type AdminSessionStatus = 'pending' | 'authenticated' | 'unauthenticated';

export const useCurrentUser = () => {
  // Warte auf Server-Store-Hydration bevor API-Calls gemacht werden
  // Verhindert Race Condition: API-Call → 401 Token Error → Redirect zu /server/setup
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const activeServerUrl = useStore(serverStore, (state) => {
    if (!state.activeServerId) {
      return null;
    }

    const activeServer = state.servers.find((server) => server.id === state.activeServerId);
    return activeServer ? normalizeServerBaseUrl(activeServer.url) : null;
  });
  const hasActiveServer = activeServerId !== null;
  const serverScope = activeServerUrl ?? 'unconfigured';
  const isServerReady = isHydrated && activeServerUrl !== null;

  const authCheckQuery = useQuery({
    queryKey: AUTH_KEYS.auth.queries.authCheckScoped(serverScope),
    queryFn: fetchAuthCheck,
    retry: (failureCount, error) => {
      // Bei 503 SERVER_NOT_SETUP nicht retrien - Setup-Status aendert sich nicht automatisch
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        return false;
      }
      // Fuer andere Fehler maximal 2 Retries
      return failureCount < 2;
    },
    // Nur Query ausfuehren wenn Server-Store hydriert und ein Server aktiv ist
    // Verhindert API-Calls mit leerem baseUrl der zu Token-Fehlern fuehrt
    enabled: isServerReady,
  });

  // authCheckQuery.data ist jetzt direkt AuthCheckResponse (nicht gewrappt)
  const authData = authCheckQuery.data;

  const isAuthPending = !isHydrated || (hasActiveServer && authCheckQuery.isPending);

  const authStatus: AuthStatus = isAuthPending ? 'pending' : !hasActiveServer ? 'unauthenticated' : authData?.authenticated && !!authData.user ? 'authenticated' : 'unauthenticated';

  // Nur bei bestätigter Authentifizierung als Admin evaluieren
  const isAdminRole = authStatus === 'authenticated' && !!authData?.user?.role && ['ADMIN', 'SUPER_ADMIN'].includes(authData.user.role);
  const isAdminAuthenticated = authStatus === 'authenticated' ? authData?.isAdminAuthenticated === true : false;

  const adminStatusQuery = useQuery({
    queryKey: AUTH_KEYS.auth.queries.adminStatusScoped(serverScope),
    queryFn: fetchAdminStatus,
    staleTime: milliseconds({ seconds: 30 }),
    refetchInterval: isAdminRole ? milliseconds({ seconds: 30 }) : false,
    throwOnError: false,
    refetchOnWindowFocus: true,
    retry: false,
    enabled: isAdminRole,
  });

  const adminSessionStatus: AdminSessionStatus = authStatus === 'pending' ? 'pending' : isAdminRole && isAdminAuthenticated ? 'authenticated' : 'unauthenticated';
  const authContext = authStatus === 'authenticated' && authData?.user ? getAuthContextSummary(authData.user.role, isAdminAuthenticated) : null;
  const authContextWithCapabilities = authContext;

  const isResolved = authStatus !== 'pending';

  // isLoading bleibt für bestehende Consumer kompatibel
  const isLoading = isAuthPending || (isAdminRole && adminStatusQuery.isPending);

  return {
    /**
     * Loading-State (AuthCheck oder AdminStatus lädt)
     */
    isLoading,

    /**
     * Eindeutiger Auth-Status für Guard-Entscheidungen
     */
    authStatus,

    /**
     * Eindeutiger Admin-Session-Status
     */
    adminSessionStatus,

    /**
     * true sobald Auth-Status nicht mehr pending ist
     */
    isResolved,

    /**
     * Aktuell eingeloggter Benutzer (null wenn nicht eingeloggt)
     */
    user: authStatus === 'authenticated' ? authData?.user : null,

    /**
     * Zentral abgeleiteter Rollen- und Berechtigungskontext für die UI
     */
    authContext,

    /**
     * Alias für task-orientierte Consumer, die explizit auf Capability-Flags zugreifen.
     */
    authContextWithCapabilities,

    /**
     * Ist der Benutzer als Admin authentifiziert?
     */
    isAdminAuthenticated,

    /**
     * Admin-Status (Setup verfügbar, etc.)
     */
    adminStatus:
      isAdminRole && adminStatusQuery.isFetched
        ? {
            adminSetupAvailable: adminStatusQuery.data?.adminSetupAvailable,
          }
        : undefined,

    /**
     * Raw Query-Objekt für erweiterte Verwendung
     */
    query: authCheckQuery,
  };
};

/**
 * Hook für Admin-spezifische Auth-Checks
 *
 * Erweitert useCurrentUser um Admin-spezifische Prüfungen.
 *
 * @returns Admin-Auth-State mit erweiterten Flags
 *
 * @example
 * ```tsx
 * const { isAdmin, hasAdminSession } = useAdminAuth();
 *
 * if (!isAdmin) {
 *   return <Redirect to="/unauthorized" />;
 * }
 * ```
 */
export const useAdminAuth = () => {
  const { user, isAdminAuthenticated, isLoading, authStatus, adminSessionStatus, isResolved } = useCurrentUser();

  // isAdmin prüft sowohl Admin-Session als auch die Rolle
  const isAdmin = adminSessionStatus === 'authenticated' && !!user?.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  // hasAdminSession prüft nur ob Admin-Token vorhanden ist (unabhängig von der Rolle)
  const hasAdminSession = adminSessionStatus === 'authenticated';

  return {
    /**
     * Hat der User Admin-Rechte? (prüft Token UND Rolle)
     */
    isAdmin,

    /**
     * Existiert eine Admin-Session? (nur Token-Check)
     */
    hasAdminSession,

    /**
     * Ist der User als Admin authentifiziert? (nur Token-Check)
     */
    isAdminAuthenticated,

    /**
     * Loading-State
     */
    isLoading,

    /**
     * Eindeutiger Auth-Status
     */
    authStatus,

    /**
     * Eindeutiger Admin-Session-Status
     */
    adminSessionStatus,

    /**
     * true sobald Auth-Status aufgeloest ist
     */
    isResolved,

    /**
     * Aktueller User
     */
    user,
  };
};
