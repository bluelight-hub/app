import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginWindow } from '@/features/auth/ui';
import { isSetupRedirectInProgress } from '@/shared/lib/server-access-token';

// DEBUG: Module load log
console.log('[auth.tsx] Module loaded at', new Date().toISOString());

export const Route = createFileRoute('/auth')({
  component: LoginWindow,

  /**
   * beforeLoad Guard:
   * - Prüft ob gerade ein Setup-Redirect läuft (503 SERVER_NOT_SETUP wurde erkannt)
   * - Wenn ja: Sofort zur /server/setup Seite weiterleiten
   *
   * Dies verhindert dass die LoginWindow kurz aufblitzt bevor der Redirect passiert.
   */
  beforeLoad: () => {
    const inProgress = isSetupRedirectInProgress();
    console.log('[/auth beforeLoad] isSetupRedirectInProgress:', inProgress);
    if (inProgress) {
      console.log('[/auth beforeLoad] Redirecting to /server/setup');
      throw redirect({ to: '/server/setup' });
    }
    console.log('[/auth beforeLoad] No redirect needed, rendering LoginWindow');
  },
});
