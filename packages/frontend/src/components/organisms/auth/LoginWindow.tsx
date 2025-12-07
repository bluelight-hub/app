import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { useCurrentUser, useUnifiedAuth } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/utils/apiErrorHandler';
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
            <LogoWithIndicator size="lg" />
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
          <AuthFooter badges={[{ label: 'System online', variant: 'default', dotColor: 'green' }]} version="v1.0.0" />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
