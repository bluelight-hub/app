import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { getServerAccessToken, isTokenErrorMessage, requestServerAccessToken, setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';

const SetupPage = lazy(() =>
  import('@/features/auth/ui/pages/SetupPage').then((module) => ({
    default: module.SetupPage,
  })),
);

/**
 * Wrapper-Komponente mit Suspense fuer Lazy Loading
 */
function SetupPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="xl" />
        </div>
      }
    >
      <SetupPage />
    </Suspense>
  );
}

/**
 * Prueft ob Server-Setup noch erforderlich ist.
 *
 * Macht einen Request zum Auth-Check-Endpoint und prueft den Response:
 * - 503 mit SERVER_NOT_SETUP → Setup erforderlich (return true)
 * - 401 mit Token-Problem → Setup abgeschlossen, aber Token fehlt/ungueltig
 *   → Token-Modal triggern und zu /auth redirecten (return false)
 * - Anderer Status → Setup bereits abgeschlossen (return false)
 *
 * WICHTIG: 401 mit Token-Fehler bedeutet Setup IST abgeschlossen!
 * SetupPendingGuard laeuft VOR ServerAccessGuard. Wenn Setup nicht abgeschlossen
 * waere, wuerden wir 503 bekommen, nicht 401. Daher: Token-Modal triggern und
 * zu /auth weiterleiten, wo das Modal angezeigt wird.
 *
 * WICHTIG: Diese Funktion verwendet ABSICHTLICH manuelles `fetch()` statt des
 * generierten API-Clients. Grund: Der API-Client nutzt `fetchWithRefresh`,
 * welches bei 503 SERVER_NOT_SETUP automatisch zu `/setup` redirected.
 * Das wuerde hier zu einer Endlosschleife fuehren, da wir bereits auf `/setup` sind.
 * Daher ist dieser manuelle Fetch ein bewusster Bypass der Projekt-Guidelines.
 *
 * @returns true wenn Setup erforderlich, false wenn bereits abgeschlossen
 */
async function isSetupRequired(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Server Access Token hinzufuegen falls vorhanden
    const token = getServerAccessToken();
    if (token) {
      headers['X-Server-Access-Token'] = token;
    }

    const response = await fetch(`${getBaseUrl()}/api/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    // Response clonen um Body mehrfach lesen zu koennen
    const clonedResponse = response.clone();
    const body = await clonedResponse.json().catch(() => ({}));
    const message = body?.message || body?.error || '';

    // 503 mit SERVER_NOT_SETUP bedeutet Setup ist erforderlich
    if (response.status === 503) {
      if (body?.error === 'SERVER_NOT_SETUP' || message === 'SERVER_NOT_SETUP') {
        return true;
      }
    }

    // 401 mit Token-Problem: Setup IST abgeschlossen (sonst waere es 503)
    // Token-Modal triggern und zu /auth weiterleiten
    if (response.status === 401 && isTokenErrorMessage(message)) {
      logger.info('Setup abgeschlossen, aber Server-Access-Token fehlt/ungueltig - triggere Modal', { message });
      // Token-Required-Modal anzeigen damit User Token eingeben kann
      // Das Modal ist in __root.tsx gerendert und erscheint auf /auth
      requestServerAccessToken();
      // Setup ist abgeschlossen → zu /auth weiterleiten
      return false;
    }

    // Jeder andere Status bedeutet Setup ist abgeschlossen
    // (401 ohne Token-Problem = nicht eingeloggt aber Server ist eingerichtet, 200 = eingeloggt)
    return false;
  } catch (error) {
    // Bei Netzwerkfehlern: Annahme Setup ist erforderlich (Seite anzeigen)
    logger.error('Setup-Status-Check fehlgeschlagen:', error);
    return true;
  }
}

/**
 * Top-Level Setup-Route (ohne Layout)
 *
 * Diese Route wird angezeigt wenn der Server im Setup-Pending Modus ist.
 * Sie ist OHNE Authentication erreichbar und nutzt kein Layout-Wrapper.
 *
 * Nach erfolgreichem Setup wird der generierte Token angezeigt und
 * der Benutzer kann zur Login-Seite weitergeleitet werden.
 */
export const Route = createFileRoute('/setup')({
  component: SetupPageWrapper,

  /**
   * beforeLoad Guard:
   * - Prueft ob Setup noch erforderlich ist
   * - Wenn nicht: Redirect zu /auth
   * - Setzt das Setup-Redirect-Flag zurueck (verhindert Stuck-State)
   *
   * WICHTIG: Das Flag wird erst NACH dem isSetupRequired() Check zurueckgesetzt.
   * Grund: Waehrend des async Fetches koennten Background-Queries (z.B. React Query Retries)
   * 503-Responses erhalten und handleServerNotSetup() triggern. Wenn das Flag zu frueh
   * zurueckgesetzt wird, startet handleServerNotSetup() einen neuen Redirect zu /setup,
   * obwohl wir bereits dorthin navigieren - das verursacht den Redirect-Loop.
   */
  beforeLoad: async () => {
    // Pruefen ob Setup noch erforderlich ist
    // WICHTIG: Flag wird NICHT am Anfang zurueckgesetzt - siehe Kommentar oben
    const setupRequired = await isSetupRequired();

    // Jetzt erst das Flag zuruecksetzen - wir haben den Check abgeschlossen
    // und sind definitiv auf der /setup Seite angekommen
    setSetupRedirectInProgress(false);

    if (!setupRequired) {
      // Setup bereits abgeschlossen - zur Login-Seite weiterleiten
      throw redirect({ to: '/auth' });
    }
  },
});
