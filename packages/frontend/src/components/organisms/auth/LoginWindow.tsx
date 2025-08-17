import { useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { LoginTab } from './LoginTab';
import { RegisterTab } from './RegisterTab';
import type { RegisterUserDto } from '@bluelight-hub/shared/client';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { Heading } from '@/components/atoms/heading.atom';
import { Text } from '@/components/atoms/text.atom';
import { Tabs } from '@/components/molecules/tabs.molecule';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { AuthCard } from '@/components/molecules/auth-card.molecule';
import { LogoWithIndicator } from '@/components/molecules/logo-with-indicator.molecule';
import { AuthFooter } from '@/components/molecules/auth-footer.molecule';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

/**
 * Zweistufiges Login/Register-Fenster mit Tabs
 *
 * Bietet eine kombinierte Oberfläche für Anmeldung bestehender
 * und Registrierung neuer Benutzer ohne Passwort.
 */
export function LoginWindow(_props: Props) {
  const navigate = useNavigate();
  const { user, isLoading, login, register } = useAuth();

  const loginUser = useCallback(
    (username: string) => {
      login.mutate(
        { username },
        {
          onSuccess: async () => {
            toast.success('Anmeldung erfolgreich', {
              description: 'Sie wurden erfolgreich angemeldet.',
            });

            await navigate({ to: '/' });
          },
          onError: async (error: Error) => {
            const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userLogin');

            toast.error('Anmeldung fehlgeschlagen', {
              description: message,
            });
          },
        },
      );
    },
    [login, navigate],
  );

  const registerUser = useCallback(
    (registerData: RegisterUserDto) => {
      register.mutate(registerData, {
        onSuccess: async () => {
          toast.success('Registrierung erfolgreich', {
            description: 'Ihr Account wurde erfolgreich erstellt.',
          });

          await navigate({ to: '/' });
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userRegister');

          toast.error('Registrierung fehlgeschlagen', {
            description: message,
          });
        },
      });
    },
    [register, navigate],
  );

  useEffect(() => {
    if (!isLoading && user) {
      void navigate({ to: '/' });
    }
  }, [isLoading, user, navigate]);

  // Tab items for the Tabs component
  const tabItems = [
    {
      label: 'Anmelden',
      content: <LoginTab onSubmit={(username) => loginUser(username)} isLoading={login.isPending} error={login.error} />,
    },
    {
      label: 'Registrieren',
      content: <RegisterTab onSubmit={(username) => registerUser({ username })} isLoading={register.isPending} error={register.error} />,
    },
  ];

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
            <Tabs items={tabItems} defaultIndex={0} />
          </div>

          {/* Footer */}
          <AuthFooter badges={[{ label: 'System online (TODO)', variant: 'default', dotColor: 'green' }]} version="TODO" />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
