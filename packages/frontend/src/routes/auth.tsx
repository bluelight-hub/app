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

    // Nur redirecten wenn Flag gesetzt UND tatsächlich keine Server existieren
    // Oder wenn Store noch nicht hydriert ist (dann Flag vertrauen)
    if (inProgress) {
      if (!isHydrated) {
        // Store nicht hydriert - dem Flag vertrauen
        throw redirect({ to: '/server/setup' });
      }

      if (!hasServers) {
        // Keine Server konfiguriert - Redirect korrekt
        throw redirect({ to: '/server/setup' });
      }

      // Server existieren aber Flag ist gesetzt - Race-Condition, Flag zurücksetzen
      setSetupRedirectInProgress(false);
    }
  },
});
