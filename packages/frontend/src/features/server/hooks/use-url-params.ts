/**
 * useUrlParams Hook
 *
 * Extrahiert URL-Parameter für Server-Setup aus TanStack Router
 * und führt automatisch den Invite-Exchange durch.
 *
 * **Use Cases:**
 * - AC1: Beide Parameter (server + invite) → Auto-Exchange
 * - AC2: Nur server-Parameter → Prefill für manuelles Setup
 * - AC3: Exchange Success → Navigate + URL cleanup
 * - AC4: Fehlerbehandlung mit Toast/Error-Card
 * - AC5: Bestehende Server bleiben erhalten
 *
 * **Integration:**
 * - `Route.useSearch()` (TanStack Router) - Type-safe URL params
 * - `useExchangeInvite()` (Story 2.4) - Invite-Exchange Mutation
 * - `addServer()` (Story 2.2) - Server Store Persistence
 * - `useNavigate()` (TanStack Router) - Navigation + URL cleanup
 *
 * **Fire-and-Forget Pattern:**
 * useEffect mit async IIFE ohne await im cleanup.
 * Verhindert Memory Leaks und React Warning.
 *
 * @module features/server/hooks/use-url-params
 */

import { useExchangeInvite } from '@/features/server/api/mutations';
import { Route } from '@/routes/__root';
import { logger } from '@/shared/lib/logger';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Return Value für useUrlParams Hook.
 */
export interface UseUrlParamsResult {
  /**
   * Server-URL zum Prefill (wenn nur server-Parameter vorhanden).
   * Null wenn kein server-Parameter oder Exchange läuft.
   */
  prefillServerUrl: string | null;

  /**
   * Gibt an ob gerade ein Exchange-Request läuft.
   */
  isExchanging: boolean;

  /**
   * Fehler-Objekt wenn Exchange fehlschlägt.
   */
  error: Error | null;
}

/**
 * Hook für URL-Parameter basiertes Server-Setup.
 *
 * **Automatisches Verhalten (AC1):**
 * - URL: `?server=https://api.example.de&invite=INV_xxx`
 * - Hook startet Exchange automatisch
 * - Bei Erfolg: Server gespeichert, Navigation zu /auth
 * - URL-Parameter werden nach Exchange entfernt (AC3)
 *
 * **Fallback-Modus (AC2):**
 * - URL: `?server=https://api.example.de`
 * - Hook gibt serverUrl zurück für Form-Prefill
 * - User muss Invite-Code manuell eingeben
 *
 * **Fehlerbehandlung (AC4):**
 * - Invalid URL/Invite: Toast error mit Validation Message
 * - API Errors: Toast error mit spezifischer Message
 * - Expired/Used: ErrorCard mit CTA
 *
 * **Bestehende Server (AC5):**
 * - `addServer()` fügt neuen Server hinzu OHNE bestehende zu löschen
 * - Auto-Persistence via Server Store
 *
 * @returns UseUrlParamsResult mit prefill data und status
 *
 * @example
 * ```tsx
 * function ServerSetup() {
 *   const { prefillServerUrl, isExchanging, error } = useUrlParams();
 *
 *   if (isExchanging) {
 *     return <ServerConnectLoading />;
 *   }
 *
 *   if (error) {
 *     return <ExpiredLinkError message={error.message} />;
 *   }
 *
 *   return <ServerSetupForm initialUrl={prefillServerUrl} />;
 * }
 * ```
 */
export function useUrlParams(): UseUrlParamsResult {
  const search = Route.useSearch(); // Type-safe validated params from __root.tsx
  const navigate = useNavigate();
  const exchangeInvite = useExchangeInvite();

  // Track processing state to prevent multiple exchanges
  const hasProcessedRef = useRef(false);

  // State for return value
  const prefillServerUrl = search.server && !search.invite ? search.server : null;
  const error = exchangeInvite.isError ? (exchangeInvite.error as Error) : null;

  useEffect(() => {
    // Fire-and-forget pattern: async IIFE without await in cleanup
    (async () => {
      // Skip if already processed (prevent double execution)
      if (hasProcessedRef.current) {
        return;
      }

      // Skip if no parameters present
      if (!search.server && !search.invite) {
        return;
      }

      // AC2: Fallback - Only server parameter (no invite)
      if (search.server && !search.invite) {
        logger.debug('URL params: server-only mode (prefill)', {
          server: search.server,
        });
        return; // No exchange, just prefill
      }

      // AC1: Both parameters present → Auto-Exchange
      if (search.server && search.invite) {
        logger.debug('URL params: auto-exchange mode', {
          server: search.server,
          invite: search.invite,
        });

        // Mark as processed BEFORE async operation
        hasProcessedRef.current = true;

        try {
          // Show loading toast
          toast.loading('Verbinde mit Server...', {
            description: 'Tausche Einladungscode ein',
          });

          // Call exchange mutation (Story 2.4)
          // NOTE: addServer() is called in mutation's onSuccess callback (AC5)
          await exchangeInvite.mutateAsync(search.invite);

          // AC3: Navigate to login screen and clean URL
          await navigate({
            to: '/auth',
            search: {}, // Remove parameters from URL
          });

          logger.info('URL params: exchange successful, navigating to /auth');
        } catch (error) {
          // AC4: Error handling
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

          logger.error('URL params: exchange failed', {
            error: errorMessage,
          });

          // Toast notification (mutation already shows error toast in onError)
          // Don't duplicate - just log for debugging
        }
      }
    })();
  }, [search, navigate, exchangeInvite]);

  return {
    prefillServerUrl,
    isExchanging: exchangeInvite.isPending,
    error,
  };
}
