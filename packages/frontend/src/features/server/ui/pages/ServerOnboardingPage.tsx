/**
 * ServerOnboardingPage
 *
 * Page für Server-Setup via URL-Parameter oder manueller Eingabe.
 * Integriert useUrlParams Hook mit ServerSetupForm.
 *
 * **Use Cases:**
 * - URL: `?server=...&invite=...` → Auto-Exchange (useUrlParams)
 * - URL: `?server=...` → Prefill Form (useUrlParams + ServerSetupForm)
 * - Keine URL-Parameter → Leeres Form (ServerSetupForm)
 *
 * **Integration:**
 * - useUrlParams (Task 4) - URL params extraction and exchange
 * - ServerSetupForm (Task 5) - Manual server setup form
 * - ServerConnectLoading (Story 2.4) - Loading state
 * - OnboardingErrorCard (Story 2.4) - Error state
 */

import { useServerList } from '@/features/server/hooks/use-server-list';
import { useUrlParams } from '@/features/server/hooks/use-url-params';
import { setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { useNavigate } from '@tanstack/react-router';
import { PiArrowLeft, PiGear, PiInfo } from 'react-icons/pi';
import { OnboardingErrorCard } from '../molecules/OnboardingErrorCard';
import { ServerConnectLoading } from '../molecules/ServerConnectLoading';
import { ServerNavigationActions } from '../molecules/ServerNavigationActions';
import { ServerSetupForm } from '../organisms/ServerSetupForm';

/**
 * Server Onboarding Page
 *
 * Zeigt verschiedene UI-States basierend auf URL-Parametern:
 * 1. Loading: Exchange läuft
 * 2. Error: Exchange fehlgeschlagen
 * 3. Prefill: Nur server-Parameter → Form mit Prefill
 * 4. Empty: Keine Parameter → Leeres Form
 */
export function ServerOnboardingPage() {
  const navigate = useNavigate();
  const servers = useServerList();
  const hasExistingServers = servers.length > 0;
  const { prefillServerUrl, isExchanging, error } = useUrlParams();

  const setupStatus = isExchanging ? 'Verbindung wird aufgebaut' : error ? 'Verbindung fehlgeschlagen' : prefillServerUrl ? 'Einladungslink erkannt' : 'Server-Setup bereit';
  const setupDescription = isExchanging
    ? 'Wir tauschen gerade Verbindungsinformationen aus und bereiten den Einstieg für diesen Server vor.'
    : error
      ? 'Der automatische Einstieg konnte nicht abgeschlossen werden. Du kannst die Verbindung direkt darunter manuell fortsetzen.'
      : prefillServerUrl
        ? 'Die Server-URL wurde übernommen. Ergänze nur noch die fehlenden Zugangsdaten oder richte den Server neu ein.'
        : 'Wenn noch kein Server hinterlegt ist, richtest du die Verbindung hier Schritt für Schritt ein. Bei Problemen siehst du direkt, was als Nächstes zu tun ist.';

  /**
   * Callback bei erfolgreichem Server-Setup
   * Navigiert zur Login-Seite nach erfolgreichem Hinzufügen
   *
   * M7 FIX: Reset Setup-Redirect-Flag damit andere Hooks/Error-Handler
   * wieder normal arbeiten können (z.B. useRequireServer)
   */
  const handleSuccess = () => {
    setSetupRedirectInProgress(false);
    navigate({ to: '/auth' });
  };

  return (
    <AuthLayout>
      <AuthCard className="mx-auto w-full max-w-6xl" padding="none">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex h-full flex-col border-slate-200/80 border-b bg-slate-50/85 p-6 lg:border-r lg:border-b-0 lg:p-8 dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex h-full flex-col gap-6">
              <div className="space-y-3">
                <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.2em] dark:text-sky-300">
                  Server-Setup
                </Text>
                <Heading as="h1" size="2xl">
                  Verbindung vorbereiten
                </Heading>
              </div>

              <section className="space-y-5 rounded-2xl border border-sky-200/80 bg-sky-50/85 p-5 dark:border-sky-950/60 dark:bg-sky-950/25">
                <div className="space-y-1.5">
                  <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">
                    Setup-Status
                  </Text>
                  <Heading as="h2" size="xl">
                    {setupStatus}
                  </Heading>
                  <Text size="sm" className="text-slate-600 dark:text-slate-300">
                    {setupDescription}
                  </Text>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/50">
                  <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.16em] dark:text-slate-400">
                    Gespeicherte Server
                  </Text>
                  <Text size="sm" className="mt-2 text-slate-700 dark:text-slate-200">
                    {hasExistingServers
                      ? `${servers.length} vorhandene Verbindung${servers.length === 1 ? '' : 'en'} können weiter genutzt oder verwaltet werden.`
                      : 'Noch kein Server gespeichert. Die Verbindung kann direkt hier eingerichtet werden.'}
                  </Text>
                </div>
              </section>

              <ServerNavigationActions
                className="mt-auto pt-2"
                actions={[
                  {
                    id: 'onboarding-auth',
                    label: 'Zurück zur Anmeldung',
                    icon: PiArrowLeft,
                    onClick: () => {
                      setSetupRedirectInProgress(false);
                      navigate({ to: '/auth' });
                    },
                    disabled: !hasExistingServers,
                  },
                  {
                    id: 'onboarding-manage',
                    label: 'Server verwalten',
                    icon: PiGear,
                    onClick: () => {
                      setSetupRedirectInProgress(false);
                      navigate({ to: '/server/manage' });
                    },
                    disabled: !hasExistingServers,
                  },
                ]}
              />
            </div>
          </aside>

          <section className="p-6 lg:p-8">
            <div className="mx-auto flex h-full max-w-xl flex-col">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <LogoWithIndicator size="lg" status={isExchanging ? 'checking' : error ? 'error' : 'online'} showIndicator animateIndicator={false} />
                  <div className="space-y-2">
                    <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.2em] dark:text-sky-300">
                      Bluelight Hub
                    </Text>
                    <Heading size="2xl" as="h2">
                      Server verbinden
                    </Heading>
                    <Text size="sm" color="muted">
                      Richte eine neue Verbindung ein oder setze einen bestehenden Serverkontext kontrolliert fort.
                    </Text>
                  </div>
                </div>

                <div className="space-y-6">
                  {isExchanging && (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-5 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40">
                      <ServerConnectLoading message="Tausche Einladungscode ein..." />
                    </div>
                  )}

                  {!isExchanging && error && (
                    <div className="space-y-6">
                      <OnboardingErrorCard errorCode="INVITE_EXPIRED" />
                      <div className="space-y-4">
                        <Text size="sm" color="muted" className="text-center">
                          Du kannst die Verbindung direkt manuell fortsetzen:
                        </Text>
                        <ServerSetupForm
                          prefillServerUrl={prefillServerUrl || undefined}
                          onSuccess={handleSuccess}
                          className="border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40"
                        />
                      </div>
                    </div>
                  )}

                  {!isExchanging && !error && (
                    <div className="space-y-6">
                      {!prefillServerUrl && (
                        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
                          <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="space-y-1">
                            <p className="font-medium text-blue-800 text-sm dark:text-blue-200">Willkommen bei Bluelight Hub</p>
                            <p className="text-blue-700 text-sm dark:text-blue-300">Gib die Server-URL ein, verbinde dich mit einem Einladungscode oder richte einen neuen Server ein.</p>
                          </div>
                        </div>
                      )}

                      {prefillServerUrl && (
                        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
                          <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          <p className="text-blue-700 text-sm dark:text-blue-300">
                            Server-URL wurde aus dem Link übernommen. Ergänze jetzt nur noch den Einladungscode oder richte den Server neu ein.
                          </p>
                        </div>
                      )}

                      <ServerSetupForm
                        prefillServerUrl={prefillServerUrl || undefined}
                        onSuccess={handleSuccess}
                        className="border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <AuthFooter
                  badges={[
                    {
                      label: isExchanging ? 'Verbinde...' : error ? 'Fehler' : prefillServerUrl ? 'Link übernommen' : 'Bereit',
                      variant: isExchanging ? 'info' : error ? 'error' : 'success',
                      dotColor: isExchanging ? 'blue' : error ? 'red' : 'green',
                    },
                  ]}
                />
              </div>
            </div>
          </section>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
