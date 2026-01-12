/**
 * useRequireServer Hook
 *
 * Guard-Hook der prüft ob mindestens ein Server konfiguriert ist.
 * Leitet automatisch zur ServerOnboardingPage wenn kein Server konfiguriert.
 *
 * **Verwendung:**
 * - In Komponenten/Routes die einen konfigurierten Server voraussetzen
 * - Wartet auf Store-Hydration bevor Redirect (verhindert Flash)
 * - Zeigt Loading-State während Hydration
 *
 * **Acceptance Criteria (AC1):**
 * - Given kein Server ist konfiguriert
 * - When die App geöffnet wird
 * - Then wird automatisch das ServerSetupForm angezeigt
 * - And der Nutzer kann nicht zum Login navigieren ohne Server hinzuzufügen
 *
 * @module features/server/hooks/use-require-server
 */

import { useStore } from '@tanstack/react-store';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { serverStore } from '../stores/server.store';
import { logger } from '@/shared/lib/logger';
import { isSetupRedirectInProgress } from '@/shared/lib/server-access-token';

/**
 * Return Value für useRequireServer Hook.
 */
export interface UseRequireServerResult {
  /**
   * Gibt an ob mindestens ein Server konfiguriert ist.
   */
  hasServer: boolean;

  /**
   * Gibt an ob der Store noch hydriert wird.
   * Während Loading sollte kein Redirect erfolgen.
   */
  isLoading: boolean;

  /**
   * Anzahl der konfigurierten Server.
   */
  serverCount: number;
}

/**
 * Guard-Hook für Server-Requirement.
 *
 * Dieser Hook prüft ob mindestens ein Server im Store konfiguriert ist.
 * Falls nicht (und Store ist hydriert), wird automatisch zur
 * ServerOnboardingPage navigiert.
 *
 * **Race Condition Protection:**
 * - Wartet auf `isHydrated === true` bevor Redirect
 * - Verhindert falsches Redirect bei App-Start
 *
 * **Navigation:**
 * - Redirect zu `/server/setup` wenn keine Server konfiguriert
 * - Route muss existieren (TanStack Router File-based)
 *
 * @returns UseRequireServerResult mit Status und Server-Anzahl
 *
 * @example
 * ```tsx
 * // In einer geschützten Komponente
 * function ProtectedPage() {
 *   const { hasServer, isLoading } = useRequireServer();
 *
 *   if (isLoading) {
 *     return <Spinner />;
 *   }
 *
 *   // Wenn wir hier ankommen, ist garantiert mindestens ein Server konfiguriert
 *   return <ActualContent />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In Route beforeLoad (synchron)
 * // Besser: useRequireServer in der Komponente nutzen
 * function LoginPage() {
 *   const { isLoading } = useRequireServer();
 *
 *   if (isLoading) {
 *     return <Spinner />;
 *   }
 *
 *   return <LoginForm />;
 * }
 * ```
 */
export function useRequireServer(): UseRequireServerResult {
  const navigate = useNavigate();

  // Selektiv nur die benötigten State-Teile subscriben (Performance)
  const servers = useStore(serverStore, (state) => state.servers);
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);

  const hasServer = servers.length > 0;
  const isLoading = !isHydrated;

  useEffect(() => {
    logger.debug('useRequireServer: Effect running', { isHydrated, serverCount: servers.length });

    // Warte auf Hydration bevor Redirect-Entscheidung
    if (!isHydrated) {
      logger.debug('useRequireServer: Waiting for store hydration...');
      return;
    }

    // M6 FIX: Skip wenn bereits 503 Setup-Redirect läuft (verhindert doppelte Redirects)
    if (isSetupRedirectInProgress()) {
      logger.debug('useRequireServer: Setup redirect already in progress (503), skipping');
      return;
    }

    // C1 FIX: Verhindere Redirect-Loop - wenn bereits auf /server/setup, nicht redirecten
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/server/setup')) {
      logger.debug('useRequireServer: Already on setup page, skipping redirect');
      return;
    }

    // Nur redirect wenn KEINE Server konfiguriert sind
    if (servers.length === 0) {
      logger.info('useRequireServer: No servers configured, redirecting to /server/setup');
      toast.info('Bitte füge zuerst einen Server hinzu');
      navigate({ to: '/server/setup', replace: true });
    } else {
      logger.debug('useRequireServer: Servers found, no redirect needed', { serverCount: servers.length });
    }
  }, [isHydrated, servers.length, navigate]);

  return {
    hasServer,
    isLoading,
    serverCount: servers.length,
  };
}
