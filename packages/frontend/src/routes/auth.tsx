import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginWindow } from '@/features/auth/ui';
import { isSetupRedirectInProgress } from '@/shared/lib/server-access-token';

export const Route = createFileRoute('/auth')({
  component: LoginWindow,

  /**
   * beforeLoad Guard:
   * - Prüft ob gerade ein Setup-Redirect läuft (503 SERVER_NOT_SETUP wurde erkannt)
   * - Wenn ja: Sofort zur /setup Seite weiterleiten
   *
   * Dies verhindert dass die LoginWindow kurz aufblitzt bevor der Redirect passiert.
   */
  beforeLoad: () => {
    if (isSetupRedirectInProgress()) {
      throw redirect({ to: '/setup' });
    }
  },
});
