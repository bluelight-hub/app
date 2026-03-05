import { api } from '@/shared';
import { AUTH_KEYS } from './queries';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { milliseconds } from 'date-fns';
import { serverStore } from '@/features/server/stores/server.store';

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
/**
 * AuthCheckResponse Typ - das Backend gibt dies direkt zurück (ohne Wrapping)
 * weil AuthController @SkipTransform() verwendet
 */
interface AuthCheckResponse {
  user?: {
    id: string;
    username: string;
    role?: string;
    isActive?: boolean;
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  authenticated: boolean;
  isAdminAuthenticated?: boolean;
}

export type AuthStatus = 'pending' | 'authenticated' | 'unauthenticated';
export type AdminSessionStatus = 'pending' | 'authenticated' | 'unauthenticated';

export const useCurrentUser = () => {
  // Warte auf Server-Store-Hydration bevor API-Calls gemacht werden
  // Verhindert Race Condition: API-Call → 401 Token Error → Redirect zu /server/setup
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const isServerReady = isHydrated && activeServerId !== null;

  const authCheckQuery = useQuery({
    queryKey: AUTH_KEYS.auth.queries.authCheck,
    queryFn: async (): Promise<AuthCheckResponse> => {
      // Der generierte API-Client erwartet { data, meta } Format,
      // aber AuthController verwendet @SkipTransform() und gibt die Daten direkt zurück.
      // Wir müssen die Raw-Response selbst parsen.
      const response = await api.auth().authControllerCheckAuthRaw();
      const json = await response.raw.json();
      return json as AuthCheckResponse;
    },
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

  // Admin-Status nur für eingeloggte Admins abfragen
  const isAdminRole = !!authData?.user?.role && ['ADMIN', 'SUPER_ADMIN'].includes(authData.user.role);

  const adminStatusQuery = useQuery({
    queryKey: AUTH_KEYS.auth.queries.adminStatus,
    queryFn: async (): Promise<{ adminSetupAvailable?: boolean }> => {
      // AuthController verwendet @SkipTransform() - Raw Response parsen
      const response = await api.auth().authControllerGetAdminStatusRaw();
      const json = await response.raw.json();
      return json as { adminSetupAvailable?: boolean };
    },
    staleTime: milliseconds({ seconds: 30 }),
    refetchInterval: isAdminRole ? milliseconds({ seconds: 30 }) : false,
    throwOnError: false,
    refetchOnWindowFocus: true,
    retry: false,
    enabled: isAdminRole,
  });

  const isAuthPending = !isServerReady || authCheckQuery.isPending;

  const authStatus: AuthStatus = isAuthPending ? 'pending' : authData?.authenticated && !!authData.user ? 'authenticated' : 'unauthenticated';

  const adminSessionStatus: AdminSessionStatus = authStatus === 'pending' ? 'pending' : authData?.isAdminAuthenticated ? 'authenticated' : 'unauthenticated';

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
    user: authData?.user,

    /**
     * Ist der Benutzer als Admin authentifiziert?
     */
    isAdminAuthenticated: authData?.isAdminAuthenticated,

    /**
     * Admin-Status (Setup verfügbar, etc.)
     */
    adminStatus: adminStatusQuery.isFetched
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
