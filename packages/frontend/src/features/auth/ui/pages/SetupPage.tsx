'use client';

import { useState } from 'react';
import { SetupForm } from '../organisms/SetupForm';
import { TokenDisplay } from '../organisms/TokenDisplay';
import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';

/**
 * Setup-Page fuer initialen Server-Setup
 *
 * Zeigt zuerst das Setup-Formular, nach erfolgreichem
 * Setup wird der Token angezeigt.
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
