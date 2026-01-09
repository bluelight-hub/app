/**
 * Deep Link Effect Hook
 *
 * Integriert Deep Link Handling in App Lifecycle.
 * Registriert Event Listener für Deep Link Events und orchestriert:
 * - Invite Code Exchange (via useExchangeInvite)
 * - Server Store Updates (via setActiveServer in mutation)
 * - Navigation zur Login Screen (via TanStack Router)
 * - Toast Notifications (via sonner)
 *
 * Usage: In App.tsx oder __root.tsx als Top-Level Hook
 */

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { DeepLinkService } from '../services/deep-link.service';
import { useExchangeInvite } from '../api/mutations';
import type { DeepLinkParams } from '../types/deep-link';
import { DeepLinkError } from '../types/deep-link';
import { logger } from '@/shared/lib/logger';

/**
 * Deep Link Effect Hook
 *
 * Initialisiert Deep Link Service und registriert Event Handler.
 * Automatisches Cleanup bei Component Unmount.
 *
 * Integration Points:
 * - DeepLinkService: Event Emitter für Deep Link URLs
 * - useExchangeInvite: Server-Access-Token Exchange
 * - Server Store: setActiveServer() (in mutation onSuccess)
 * - TanStack Router: Navigation zu /auth
 * - Sonner: Toast Notifications
 */
export function useDeepLinkEffect() {
  const navigate = useNavigate();
  const exchangeInvite = useExchangeInvite();

  // biome-ignore lint/correctness/useExhaustiveDependencies: exchangeInvite.mutateAsync causes re-registration on every mutation
  useEffect(() => {
    const deepLinkService = DeepLinkService.getInstance();

    /**
     * Success Handler: Deep Link empfangen
     *
     * Flow:
     * 1. Client-side Expiry Check (optional, Server validiert auch)
     * 2. Loading Toast anzeigen
     * 3. Invite Code Exchange (API Call)
     * 4. Success: Server Store Update (in mutation) + Navigation + Toast
     * 5. Error: Error Toast
     */
    const handleDeepLinkReceived = async (params: DeepLinkParams) => {
      logger.debug('Deep Link received', params);

      // Optional: Client-side Expiry Check (Server validiert auch)
      if (params.expiresAt && new Date(params.expiresAt) < new Date()) {
        toast.error('Dieser Einladungslink ist abgelaufen.', {
          description: 'Bitte fordere einen neuen Link an.',
          duration: 5000,
        });
        logger.warn('Deep link expired (client-side)', { expiresAt: params.expiresAt });
        return;
      }

      // Show Loading UI
      const loadingToast = toast.loading('Verbinde mit Server...', {
        description: 'Tausche Einladungscode ein',
      });

      try {
        // Validate inviteCode (should always be present after DeepLinkService validation)
        if (!params.inviteCode) {
          toast.error('Ungültiger Einladungscode', {
            id: loadingToast,
            description: 'Der Link enthält keinen gültigen Einladungscode.',
            duration: 5000,
          });
          logger.error('Deep link missing inviteCode after validation', params);
          return;
        }

        // Exchange Invite Code (API Call)
        const result = await exchangeInvite.mutateAsync(params.inviteCode);

        // Extract server name from response
        const serverName = result.data.serverInfo.name;

        logger.info('Deep link exchange successful', {
          serverName,
          serverUrl: result.data.serverInfo.baseUrl,
        });

        // Success Toast
        toast.success(`Server '${serverName}' hinzugefügt`, {
          id: loadingToast,
          description: 'Du wirst zur Anmeldung weitergeleitet',
          duration: 2500,
        });

        // Navigate to Login Screen (Route: /auth)
        // NOTE: setActiveServer() wird bereits in useExchangeInvite.onSuccess aufgerufen
        navigate({ to: '/auth' });
      } catch (error) {
        // Error Toast
        const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';

        toast.error('Fehler beim Verbinden mit Server', {
          id: loadingToast,
          description: errorMessage,
          duration: 5000,
        });

        logger.error('Deep link exchange failed', error);
      }
    };

    /**
     * Error Handler: Deep Link Parse/Validation Fehler
     *
     * Wird aufgerufen bei:
     * - Ungültigem Protocol (nicht bluelight://)
     * - Fehlenden Parametern (url, invite)
     * - Abgelaufenem Link (expires)
     * - Parse Errors
     */
    const handleDeepLinkError = (error: DeepLinkError, message: string) => {
      logger.warn('Deep link error', { error, message });

      // User-friendly Error Messages
      const errorMessages: Record<DeepLinkError, { title: string; description: string }> = {
        [DeepLinkError.INVALID_PROTOCOL]: {
          title: 'Ungültiger Link',
          description: 'Dieser Link ist kein gültiger Bluelight-Einladungslink.',
        },
        [DeepLinkError.MISSING_PARAMETERS]: {
          title: 'Ungültiger Link',
          description: 'Der Link enthält nicht alle erforderlichen Parameter.',
        },
        [DeepLinkError.EXPIRED_LINK]: {
          title: 'Link abgelaufen',
          description: 'Dieser Einladungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
        },
        [DeepLinkError.PARSE_ERROR]: {
          title: 'Fehler beim Verarbeiten',
          description: 'Der Link konnte nicht verarbeitet werden.',
        },
      };

      const errorConfig = errorMessages[error] || {
        title: 'Fehler',
        description: message,
      };

      toast.error(errorConfig.title, {
        description: errorConfig.description,
        duration: 5000,
      });
    };

    // Initialize Deep Link Service (only once)
    deepLinkService.initialize().catch((error) => {
      logger.error('Failed to initialize DeepLinkService', error);
      toast.error('Deep Link Integration konnte nicht gestartet werden', {
        description: 'Einladungslinks funktionieren möglicherweise nicht.',
      });
    });

    // Register Event Listeners
    deepLinkService.on('deep-link-received', handleDeepLinkReceived);
    deepLinkService.on('deep-link-error', handleDeepLinkError);

    // Cleanup (remove listeners on unmount)
    return () => {
      deepLinkService.off('deep-link-received', handleDeepLinkReceived);
      deepLinkService.off('deep-link-error', handleDeepLinkError);
    };
  }, [navigate]);
}
