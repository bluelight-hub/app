import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginWindow } from '@/features/auth/ui';
import { sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { isSetupRedirectInProgress, setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { serverStore } from '@/features/server/stores/server.store';
import { z } from 'zod';

const searchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .transform((value) => sanitizeInternalRedirectPath(value)),
});

// DEBUG: Module load log
console.log('[auth.tsx] Module loaded at', new Date().toISOString());

export const Route = createFileRoute('/auth')({
  component: LoginWindow,
  validateSearch: searchSchema,

  /**
   * beforeLoad Guard:
   * - Prüft ob gerade ein Setup-Redirect läuft (503 SERVER_NOT_SETUP wurde erkannt)
   * - Wenn ja: Sofort zur /server/setup Seite weiterleiten
   *
   * Dies verhindert dass die LoginWindow kurz aufblitzt bevor der Redirect passiert.
   *
   * WICHTIG: Das Flag wird nur als Redirect-Trigger verwendet wenn tatsächlich
   * keine Server konfiguriert sind. Wenn Server existieren, wurde das Flag
   * fälschlicherweise durch eine Race-Condition gesetzt und wird zurückgesetzt.
   */
  beforeLoad: () => {
    const inProgress = isSetupRedirectInProgress();
    const { isHydrated, servers } = serverStore.state;
    const hasServers = servers.length > 0;

    console.log('[/auth beforeLoad] isSetupRedirectInProgress:', inProgress, 'isHydrated:', isHydrated, 'hasServers:', hasServers);

    // Nur redirecten wenn Flag gesetzt UND tatsächlich keine Server existieren
    // Oder wenn Store noch nicht hydriert ist (dann Flag vertrauen)
    if (inProgress) {
      if (!isHydrated) {
        // Store nicht hydriert - dem Flag vertrauen
        console.log('[/auth beforeLoad] Store not hydrated, trusting redirect flag');
        throw redirect({ to: '/server/setup' });
      }

      if (!hasServers) {
        // Keine Server konfiguriert - Redirect korrekt
        console.log('[/auth beforeLoad] No servers configured, redirecting to /server/setup');
        throw redirect({ to: '/server/setup' });
      }

      // Server existieren aber Flag ist gesetzt - Race-Condition, Flag zurücksetzen
      console.log('[/auth beforeLoad] Servers exist but flag was set (race condition), resetting flag');
      setSetupRedirectInProgress(false);
    }

    console.log('[/auth beforeLoad] No redirect needed, rendering LoginWindow');
  },
});
