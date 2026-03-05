import { useCurrentUser, useAdminLogin } from '@/features/auth';
import { useSystemHealth } from '@/features/system/api/use-system-health';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthFooter } from '@/shared/ui/molecules/auth-footer.molecule';
import { LogoWithIndicator } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import { PasswordInput } from '@/shared/ui/molecules/password-input.molecule';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/shared/ui/templates/AuthLayout';
import { useEffect, useState } from 'react';
import { PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';
import { z } from 'zod';

const adminLoginSchema = z.object({
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export function AdminLogin() {
  const navigate = useNavigate();
  const { user, isLoading, isAdminAuthenticated, adminStatus } = useCurrentUser();
  const loginAdmin = useAdminLogin();
  const { connectionMode, version } = useSystemHealth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      password: '',
    },
    validators: {
      onSubmit: adminLoginSchema,
    },
    onSubmit: async ({ value }) => {
      return loginAdmin.mutateAsync(
        {
          password: value.password,
        },
        {
          onSuccess: async () => {
            toast.success('Anmeldung erfolgreich', {
              description: 'Sie wurden erfolgreich als Administrator angemeldet.',
            });
            await navigate({ to: '/admin/dashboard' });
          },
          onError: async (error: Error) => {
            const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'adminLogin');

            // Set error message in state instead of form
            setApiError(message);

            // Shake input for password errors
            if (message.includes('Ungültiges') || message.includes('Passwort')) {
              setShouldShake(true);
              setTimeout(() => setShouldShake(false), 500);
            }

            toast.error(message.includes('Administratorrechte') ? 'Zugriff verweigert' : 'Anmeldung fehlgeschlagen', {
              description: message,
            });
          },
        },
      );
    },
  });

  // Track when auth check is complete
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true);
    }
  }, [isLoading, hasCheckedAuth]);

  // Redirect logic based on authentication state
  useEffect(() => {
    // Only redirect after we've completed the initial auth check
    if (hasCheckedAuth) {
      // If user has an active admin session, redirect to dashboard
      if (user && isAdminAuthenticated) {
        void navigate({ to: '/admin/dashboard' });
      }
      // If user is not logged in at all, redirect to auth
      else if (!user) {
        void navigate({ to: '/auth' });
      }
      // If user needs to set up admin password, redirect to setup
      else if (user && adminStatus?.adminSetupAvailable) {
        void navigate({ to: '/admin/setup' });
      }
      // User is logged in but not admin authenticated - stay on this page
    }
  }, [user, hasCheckedAuth, isAdminAuthenticated, adminStatus?.adminSetupAvailable, navigate]);

  // Don't render the form until we've checked authentication
  // This prevents flashing of the form before redirect
  if (!hasCheckedAuth) {
    return null; // The loading state is handled by AdminLayout
  }

  // If user has admin session, don't show form (will redirect)
  if (user && isAdminAuthenticated) {
    return null;
  }

  // If user is not logged in at all, don't show the admin login form
  // (useEffect will redirect to /auth)
  if (!user) {
    return null;
  }

  // If user needs to set up admin password, don't show login form
  // (useEffect will redirect to /admin/setup)
  if (adminStatus?.adminSetupAvailable) {
    return null;
  }

  // Dynamische Status-Badges basierend auf Health Response
  const statusBadges: Array<{
    label: string;
    variant: 'default' | 'info' | 'success' | 'warning' | 'error';
    dotColor: 'green' | 'blue' | 'red' | 'yellow';
  }> = [
    {
      label: connectionMode === 'online' ? 'System online' : connectionMode === 'checking' ? 'Verbindung...' : connectionMode === 'error' ? 'Verbindungsfehler' : 'System offline',
      variant: connectionMode === 'online' ? 'default' : connectionMode === 'error' ? 'error' : 'warning',
      dotColor: connectionMode === 'online' ? 'green' : connectionMode === 'error' ? 'red' : 'yellow',
    },
  ];

  return (
    <AuthLayout>
      <AuthCard className="mx-5 w-full max-w-[440px]">
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-6 text-center">
            <LogoWithIndicator size="xl" />

            <Heading size="2xl" as="h1">
              Bluelight Hub
            </Heading>
            <Text size="md" color="muted">
              Administrator-Anmeldung
            </Text>
          </div>

          {/* Form Container */}
          <div className="w-full">
            {/* API-Fehlermeldung anzeigen */}
            {apiError && <Alert status="error" title="Anmeldung fehlgeschlagen!" description={apiError} icon={<PiWarning className="h-5 w-5" />} className="mb-6" />}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <div className="flex flex-col gap-6">
                <form.Field name="password">
                  {(field) => (
                    <FormField label="Administrator-Passwort" className="w-full" error={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined} htmlFor="password">
                      <PasswordInput
                        id="password"
                        name={field.name}
                        autoComplete="current-password"
                        placeholder="Geben Sie Ihr Passwort ein"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={form.state.isSubmitting}
                        shouldShake={shouldShake}
                        fullWidth
                        inputSize="lg"
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" intent="danger" size="lg" fullWidth disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
                      {isSubmitting ? 'Anmeldung...' : 'Sicher anmelden'}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          </div>

          {/* Footer */}
          <AuthFooter badges={statusBadges} version={version ?? undefined} copyright="© 2025 DRK" />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
