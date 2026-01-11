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
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hilfsfunktion um leere/whitespace-only Strings als falsy zu behandeln.
 * @param value - Der zu prüfende String
 * @returns true wenn der String nicht-leer ist (nach trim)
 */
function hasValue(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

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
 *     return <OnboardingErrorCard errorCode="INVITE_EXPIRED" />;
 *   }
 *
 *   return <ServerSetupForm initialUrl={prefillServerUrl} />;
 * }
 * ```
 */
export function useUrlParams(): UseUrlParamsResult {
  // Type assertion needed because TanStack Router's complex generics
  // don't always infer correctly from validateSearch schema
  const search = Route.useSearch() as { server?: string; invite?: string };
  const navigate = useNavigate({ from: Route.fullPath });
  const exchangeInvite = useExchangeInvite();

  // Track processing state to prevent multiple exchanges
  // Issue #4 Fix: Separates Tracking für "versucht" vs "erfolgreich"
  const hasProcessedRef = useRef(false);

  // Trimmed values für konsistente Empty-String Behandlung (Issue #1)
  const serverUrl = search?.server?.trim() || undefined;
  const inviteCode = search?.invite?.trim() || undefined;

  // State for return value - nur prefill wenn NICHT leer nach trim
  const prefillServerUrl = hasValue(serverUrl) && !hasValue(inviteCode) ? serverUrl : null;
  const error = exchangeInvite.isError ? (exchangeInvite.error as Error) : null;

  // Issue #5: Cleanup-Funktion um URL-Params bei Unmount zu entfernen
  const cleanupUrlParams = useCallback(async () => {
    // Nur cleanup wenn wir URL-Params hatten
    if (hasValue(serverUrl) || hasValue(inviteCode)) {
      try {
        await navigate({
          to: '.',
          search: { server: undefined, invite: undefined }, // Entferne alle URL-Parameter
          replace: true, // Replace statt push um History clean zu halten
        });
      } catch {
        // Navigation bei Unmount kann fehlschlagen - ignorieren
      }
    }
  }, [navigate, serverUrl, inviteCode]);

  useEffect(() => {
    // Fire-and-forget pattern: async IIFE without await in cleanup
    (async () => {
      // Skip if already processed (prevent double execution)
      if (hasProcessedRef.current) {
        return;
      }

      // Issue #1 Fix: Skip if no NON-EMPTY parameters present
      if (!hasValue(serverUrl) && !hasValue(inviteCode)) {
        return;
      }

      // AC2: Fallback - Only server parameter (no invite)
      if (hasValue(serverUrl) && !hasValue(inviteCode)) {
        logger.debug('URL params: server-only mode (prefill)', {
          server: serverUrl,
        });
        return; // No exchange, just prefill
      }

      // AC1: Both parameters present → Auto-Exchange
      if (hasValue(serverUrl) && hasValue(inviteCode)) {
        logger.debug('URL params: auto-exchange mode', {
          server: serverUrl,
          invite: inviteCode,
        });

        // Issue #4 Fix: Markiere als "in Bearbeitung" aber NICHT als final processed
        // Das Flag wird erst nach ERFOLG gesetzt
        hasProcessedRef.current = true;

        // Loading Toast mit ID für späteres Dismiss
        const toastId = toast.loading('Verbinde mit Server...', {
          description: 'Tausche Einladungscode ein',
        });

        try {
          // Issue #2 Fix: Übergebe serverUrl an die Mutation
          // Der Exchange geht jetzt an den richtigen Ziel-Server aus den URL-Params
          await exchangeInvite.mutateAsync({
            inviteCode: inviteCode,
            serverUrl: serverUrl,
          });

          // Dismiss loading toast
          toast.dismiss(toastId);

          // AC3: Navigate to login screen and clean URL
          await navigate({
            to: '/auth',
            search: { server: undefined, invite: undefined }, // Remove parameters from URL
          });

          logger.info('URL params: exchange successful, navigating to /auth');

          // Erfolgsmeldung
          toast.success('Verbindung erfolgreich', {
            description: 'Server wurde hinzugefügt',
          });
        } catch (err) {
          // Dismiss loading toast
          toast.dismiss(toastId);

          // Issue #4 Fix: Bei Fehler Flag zurücksetzen damit Retry möglich ist
          hasProcessedRef.current = false;

          // AC4: Error handling
          const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';

          logger.error('URL params: exchange failed', {
            error: errorMessage,
          });

          // Issue #3 Fix: Error Toast anzeigen
          toast.error('Verbindung fehlgeschlagen', {
            description: errorMessage,
          });
        }
      }
    })();

    // Issue #5 Fix: Cleanup bei Unmount (z.B. Back-Button)
    return () => {
      // Fire-and-forget cleanup - keine await nötig
      cleanupUrlParams();
    };
  }, [serverUrl, inviteCode, navigate, exchangeInvite, cleanupUrlParams]);

  return {
    prefillServerUrl,
    isExchanging: exchangeInvite.isPending,
    error,
  };
}
