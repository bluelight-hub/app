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

import { useUrlParams } from '@/features/server/hooks/use-url-params';
import { useServerList } from '@/features/server/hooks/use-server-list';
import { ServerConnectLoading } from '../molecules/ServerConnectLoading';
import { OnboardingErrorCard } from '../molecules/OnboardingErrorCard';
import { ServerSetupForm } from '../organisms/ServerSetupForm';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { useNavigate } from '@tanstack/react-router';
import { PiArrowLeft, PiGear, PiInfo } from 'react-icons/pi';
import { setSetupRedirectInProgress } from '@/shared/lib/server-access-token';

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

  /**
   * Callback bei erfolgreichem Server-Setup
   * Navigiert zur Login-Seite nach erfolgreichem Hinzufügen
   *
   * M7 FIX: Reset Setup-Redirect-Flag damit andere Hooks/Error-Handler
   * wieder normal arbeiten können (z.B. useRequireServer)
   */
  const handleSuccess = () => {
    setSetupRedirectInProgress(false); // Reset flag
    navigate({ to: '/auth' });
  };

  return (
    <AuthLayout>
      <AuthCard className="mx-5 w-full max-w-md">
        <div className="space-y-8">
          {/* Navigation Links - nur anzeigen wenn bereits Server konfiguriert sind */}
          {hasExistingServers && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  // Reset Setup-Redirect-Flag damit /auth nicht wieder hierher redirectet
                  setSetupRedirectInProgress(false);
                  navigate({ to: '/auth' });
                }}
                className="flex cursor-pointer items-center gap-2 text-text-muted text-sm transition-colors hover:text-text-secondary"
              >
                <PiArrowLeft className="h-4 w-4" />
                Zurück zur Anmeldung
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupRedirectInProgress(false);
                  navigate({ to: '/server/manage' });
                }}
                className="flex cursor-pointer items-center gap-2 text-text-muted text-sm transition-colors hover:text-text-secondary"
              >
                <PiGear className="h-4 w-4" />
                Server verwalten
              </button>
            </div>
          )}

          {/* Logo Section */}
          <div className="space-y-4 text-center">
            <LogoWithIndicator size="lg" status={isExchanging ? 'checking' : error ? 'error' : undefined} showIndicator={isExchanging} />
            <div className="space-y-2">
              <Heading size="2xl" className="text-text-primary">
                Bluelight Hub
              </Heading>
              <Text size="md" color="muted">
                {isExchanging ? 'Verbinde mit Server...' : error ? 'Fehler beim Verbinden' : 'Server verbinden'}
              </Text>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full">
            {/* Loading State: Exchange läuft (beide URL-Parameter vorhanden) */}
            {isExchanging && <ServerConnectLoading message="Tausche Einladungscode ein..." />}

            {/* Error State: Exchange fehlgeschlagen */}
            {!isExchanging && error && (
              <div className="space-y-4">
                <OnboardingErrorCard errorCode="INVITE_EXPIRED" />
                <div className="space-y-4">
                  <Text size="sm" color="muted" className="text-center">
                    Du kannst es manuell versuchen:
                  </Text>
                  <ServerSetupForm prefillServerUrl={prefillServerUrl || undefined} onSuccess={handleSuccess} />
                </div>
              </div>
            )}

            {/* Form State: Prefill oder leer */}
            {!isExchanging && !error && (
              <div className="space-y-4">
                {/* Info Text */}
                {!prefillServerUrl && (
                  <div className="flex items-start gap-3 rounded-panel border border-status-info-border bg-status-info-surface p-4">
                    <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-info-text" />
                    <div className="space-y-1">
                      <p className="font-medium text-status-info-text text-sm">Willkommen bei Bluelight Hub</p>
                      <p className="text-status-info-text text-sm">Gib die Server-URL ein und verbinde dich mit einem Einladungscode oder richte einen neuen Server ein.</p>
                    </div>
                  </div>
                )}

                {/* Prefill Info */}
                {prefillServerUrl && (
                  <div className="flex items-start gap-3 rounded-panel border border-status-info-border bg-status-info-surface p-4">
                    <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-info-text" />
                    <p className="text-status-info-text text-sm">Server-URL wurde aus dem Link übernommen. Bitte gib deinen Einladungscode ein.</p>
                  </div>
                )}

                <ServerSetupForm prefillServerUrl={prefillServerUrl || undefined} onSuccess={handleSuccess} />
              </div>
            )}
          </div>

          {/* Footer */}
          <AuthFooter
            badges={[
              {
                label: isExchanging ? 'Verbinde...' : error ? 'Fehler' : 'Bereit',
                variant: 'default',
                dotColor: isExchanging ? 'yellow' : error ? 'red' : 'green',
              },
            ]}
            copyright={`© ${new Date().getFullYear()} BlueLight Hub`}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
