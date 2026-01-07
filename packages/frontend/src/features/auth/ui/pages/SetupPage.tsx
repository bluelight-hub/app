'use client';

import { useEffect, useState } from 'react';
import { SetupForm } from '../organisms/SetupForm';
import { TokenDisplay } from '../organisms/TokenDisplay';
import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { getServerAccessToken, isTokenErrorMessage } from '@/shared/lib/server-access-token';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';

/**
 * Prueft ob Setup noch erforderlich ist (Client-seitige Version)
 *
 * Identische Logik wie in routes/setup.tsx, aber fuer Polling/Focus-Detection.
 * Gibt true zurueck wenn Setup erforderlich ist, false wenn abgeschlossen.
 *
 * WICHTIG: 401 mit Token-Fehler bedeutet Setup IST abgeschlossen!
 * SetupPendingGuard laeuft VOR ServerAccessGuard. Daher: 401 = Setup fertig.
 */
async function checkSetupRequired(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = getServerAccessToken();
    if (token) {
      headers['X-Server-Access-Token'] = token;
    }

    const response = await fetch(`${getBaseUrl()}/api/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    const clonedResponse = response.clone();
    const body = await clonedResponse.json().catch(() => ({}));
    const message = body?.message || body?.error || '';

    // 503 SERVER_NOT_SETUP = Setup erforderlich
    if (response.status === 503) {
      if (body?.error === 'SERVER_NOT_SETUP' || message === 'SERVER_NOT_SETUP') {
        return true;
      }
    }

    // 401 mit Token-Problem = Setup IST abgeschlossen (sonst waere es 503)
    // Nicht mehr true zurueckgeben - Setup ist fertig, nur Token fehlt
    if (response.status === 401 && isTokenErrorMessage(message)) {
      logger.debug('Setup abgeschlossen, Token fehlt/ungueltig');
      return false;
    }

    // Anderer Status = Setup abgeschlossen
    return false;
  } catch {
    // Bei Fehlern annehmen Setup ist noch erforderlich
    return true;
  }
}

/**
 * Setup-Page fuer initialen Server-Setup
 *
 * Zeigt zuerst das Setup-Formular, nach erfolgreichem
 * Setup wird der Token angezeigt.
 *
 * Erkennt automatisch wenn Setup in einem anderen Fenster abgeschlossen wurde:
 * - Window Focus Detection: Prueft beim Wechsel zurueck zu diesem Fenster
 * - Polling Fallback: Alle 5 Sekunden falls Fenster im Fokus bleibt
 *
 * Design orientiert sich an der LoginWindow fuer konsistente UX.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  const handleSetupSuccess = (receivedToken: string) => {
    // Token wird bereits im Hook (use-admin-setup.ts) gespeichert
    // Hier nur noch fuer UI-Anzeige setzen
    setToken(receivedToken);
  };

  const handleContinue = () => {
    navigate({ to: '/auth' });
  };

  /**
   * Erkennt Setup-Abschluss in anderem Fenster
   *
   * Zwei Mechanismen:
   * 1. Window Focus: Sofortige Pruefung wenn User zu diesem Fenster wechselt
   * 2. Polling: Alle 5 Sekunden als Fallback (z.B. wenn Fenster im Fokus bleibt)
   */
  useEffect(() => {
    // Nicht pruefen wenn Setup bereits in diesem Fenster abgeschlossen wurde
    if (token) {
      return;
    }

    /**
     * Prueft ob Setup abgeschlossen wurde und redirectet zu /auth
     */
    const checkAndRedirect = async () => {
      const setupRequired = await checkSetupRequired();
      if (!setupRequired) {
        logger.info('Setup wurde in anderem Fenster abgeschlossen, redirect zu /auth');
        navigate({ to: '/auth' });
      }
    };

    // 1. Window Focus Detection: Prueft sofort beim Fensterwechsel
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.debug('Fenster wieder im Fokus, pruefe Setup-Status');
        checkAndRedirect();
      }
    };

    // 2. Polling Fallback: Alle 5 Sekunden
    const pollInterval = setInterval(() => {
      checkAndRedirect();
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [token, navigate]);

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
              {token ? 'Setup erfolgreich abgeschlossen' : 'Server einrichten'}
            </Text>
          </div>

          {/* Form/Token Container */}
          <div className="w-full">
            {token ? (
              <TokenDisplay token={token} onContinue={handleContinue} />
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Text size="sm" color="muted">
                    Erstellen Sie Ihren ersten Admin-Account um den Server zu verwalten.
                  </Text>
                </div>
                <SetupForm onSuccess={handleSetupSuccess} />
              </div>
            )}
          </div>

          {/* Footer */}
          <AuthFooter
            badges={[
              {
                label: token ? 'Bereit' : 'Setup erforderlich',
                variant: 'default',
                dotColor: token ? 'green' : 'yellow',
              },
            ]}
            copyright={`© ${new Date().getFullYear()} BlueLight Hub`}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
