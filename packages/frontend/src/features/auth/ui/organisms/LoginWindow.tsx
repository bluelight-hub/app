import { useCurrentUser, useUnifiedAuth } from '@/features/auth';
import { getIndicatorStatus, STATUS_DOT_COLORS, STATUS_LABELS, useSystemHealth, useSystemVersion } from '@/features/system';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import type { AuthRequestDto } from '@bluelight-hub/shared/client';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { UnifiedAuthForm } from './UnifiedAuthForm';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

/**
 * Vereinheitlichtes Login-Fenster mit Combobox
 *
 * Bietet eine einzelne Combobox für Anmeldung bestehender
 * und automatische Registrierung neuer Benutzer.
 */
export function LoginWindow(_props: Props) {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const unifiedAuth = useUnifiedAuth();

  const { connectionMode, isLoading: healthLoading, isError: healthError, insecureMode } = useSystemHealth();
  const { frontendVersion, mismatchSeverity } = useSystemVersion();

  const indicatorStatus = getIndicatorStatus(healthLoading, healthError, connectionMode);

  const handleAuth = useCallback(
    (authData: AuthRequestDto) => {
      unifiedAuth.mutate(authData, {
        onSuccess: async (response) => {
          const successMessage = response.isNewUser ? 'Willkommen! Ihr Account wurde erfolgreich erstellt.' : 'Sie wurden erfolgreich angemeldet.';

          toast.success('Erfolgreich', {
            description: successMessage,
          });

          await navigate({ to: '/' });
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userAuth');

          toast.error('Authentifizierung fehlgeschlagen', {
            description: message,
          });
        },
      });
    },
    [unifiedAuth, navigate],
  );

  useEffect(() => {
    if (!isLoading && user) {
      void navigate({ to: '/' });
    }
  }, [isLoading, user, navigate]);

  return (
    <AuthLayout>
      <AuthCard className="mx-5 w-full max-w-md">
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="space-y-6 text-center">
            <LogoWithIndicator size="lg" status={indicatorStatus} />
            <Heading size="2xl" className="text-gray-900 dark:text-white">
              Bluelight Hub
            </Heading>
            <Text size="md" color="muted">
              Einsatzmanagement-System
            </Text>
          </div>

          {/* Form Container */}
          <div className="w-full">
            <UnifiedAuthForm onSubmit={handleAuth} isLoading={unifiedAuth.isPending} error={unifiedAuth.error ?? null} />
          </div>

          {/* Footer */}
          <AuthFooter
            badges={[
              {
                label: STATUS_LABELS[indicatorStatus],
                variant: 'default',
                dotColor: STATUS_DOT_COLORS[indicatorStatus],
              },
              ...(insecureMode ? [{ label: 'Unsicherer Modus', variant: 'warning' as const, dotColor: 'yellow' as const }] : []),
              ...(mismatchSeverity === 'critical' ? [{ label: 'Update erforderlich', variant: 'danger' as const, dotColor: 'red' as const }] : []),
            ]}
            version={`v${frontendVersion}`}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
