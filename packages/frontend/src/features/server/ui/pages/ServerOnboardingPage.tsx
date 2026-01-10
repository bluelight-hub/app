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
 * - ExpiredLinkError (Story 2.4) - Error state
 */

import { useUrlParams } from '@/features/server/hooks/use-url-params';
import { ServerConnectLoading } from '../molecules/ServerConnectLoading';
import { ExpiredLinkError } from '../molecules/ExpiredLinkError';
import { ServerSetupForm } from '../organisms/ServerSetupForm';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { useNavigate } from '@tanstack/react-router';

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
  const { prefillServerUrl, isExchanging, error } = useUrlParams();

  /**
   * Callback bei erfolgreichem Server-Setup
   * Navigiert zur Login-Seite nach erfolgreichem Hinzufügen
   */
  const handleSuccess = () => {
    navigate({ to: '/auth' });
  };

  return (
    <AuthLayout>
      <AuthCard className="mx-5 w-full max-w-md">
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="space-y-6 text-center">
            <LogoWithIndicator size="lg" status="checking" showIndicator={false} />
            <Heading size="2xl" className="text-gray-900 dark:text-white">
              Bluelight Hub
            </Heading>
            <Text size="md" color="muted">
              {isExchanging ? 'Verbinde mit Server...' : error ? 'Fehler beim Verbinden' : 'Server hinzufügen'}
            </Text>
          </div>

          {/* Content Section */}
          <div className="w-full">
            {/* Loading State: Exchange läuft (beide URL-Parameter vorhanden) */}
            {isExchanging && <ServerConnectLoading message="Tausche Einladungscode ein..." />}

            {/* Error State: Exchange fehlgeschlagen */}
            {!isExchanging && error && (
              <div className="space-y-4">
                <ExpiredLinkError />
                <Text size="sm" color="muted" className="text-center">
                  Du kannst es manuell versuchen:
                </Text>
                <ServerSetupForm prefillServerUrl={prefillServerUrl || undefined} onSuccess={handleSuccess} />
              </div>
            )}

            {/* Form State: Prefill oder leer */}
            {!isExchanging && !error && (
              <div className="space-y-4">
                {prefillServerUrl && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <Text size="sm" className="text-blue-800">
                      Server-URL wurde aus dem Link übernommen. Bitte gib deinen Einladungscode ein.
                    </Text>
                  </div>
                )}
                <ServerSetupForm prefillServerUrl={prefillServerUrl || undefined} onSuccess={handleSuccess} />
              </div>
            )}
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
