import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Field, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { PiWarning } from 'react-icons/pi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authActions } from '../stores/auth.store';
import { PasswordInput } from '../components/ui/password-input';
import { toaster } from '@/components/ui/toaster.instance';
import { useAuth } from '@/provider/auth.hooks';
import { BackendApi } from '@/api/api.ts';

/**
 * Admin-Anmeldeseite für privilegierte Benutzer
 *
 * Der angemeldete Benutzer muss sein Passwort eingeben, um seine
 * Admin-Rechte zu aktivieren (sofern er welche besitzt).
 */
export function AdminLogin() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const api = new BackendApi();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/login' });
    }
  }, [user, isLoading, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      // Admin-Login erwartet nur das Passwort (AdminPasswordDto)
      // Der Benutzer ist bereits angemeldet, daher wird die userId aus dem JWT Token verwendet
      return await api.auth().authControllerAdminLogin({
        adminPasswordDto: {
          password,
        },
      });
    },
    onSuccess: async (response) => {
      console.log('Admin-Anmeldung erfolgreich:', response);

      // Speichere den User im Auth Store
      if (response.user) {
        authActions.loginSuccess(response.user);
      }

      // Invalidiere relevante Queries
      await queryClient.invalidateQueries({ queryKey: ['me'] });

      // Zeige Erfolgs-Toast
      toaster.create({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich als Administrator angemeldet.',
        type: 'success',
      });

      // Navigiere zum Admin-Dashboard
      await navigate({ to: '/admin/dashboard' });
    },
    onError: (error: unknown) => {
      console.error('Admin-Anmeldefehler:', error);

      // 401 Unauthorized - Falsche Anmeldedaten
      if (error?.status === 401 || error?.message?.includes('401')) {
        setApiError('Ungültiges Passwort.');
        toaster.create({
          title: 'Login fehlgeschlagen',
          description: 'Ungültiges Passwort.',
          type: 'error',
        });
      }
      // 403 Forbidden - Kein Admin
      else if (error?.status === 403 || error?.message?.includes('403')) {
        setApiError('Sie haben keine Administratorrechte.');
        toaster.create({
          title: 'Zugriff verweigert',
          description: 'Sie haben keine Administratorrechte.',
          type: 'error',
        });
      }
      // Andere Fehler
      else {
        const message = error?.message || 'Ein unerwarteter Fehler ist aufgetreten.';
        setApiError(message);
        toaster.create({
          title: 'Login fehlgeschlagen',
          description: message,
          type: 'error',
        });
      }
    },
  });

  const form = useForm({
    defaultValues: {
      password: '',
    },
    onSubmit: ({ value }) => {
      if (loginMutation.isPending) return;

      setApiError(null);
      loginMutation.mutate(value.password);
    },
  });

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
        <VStack gap="8">
          <Text>Lade...</Text>
        </VStack>
      </Container>
    );
  }

  // If not loading and no user, useEffect will redirect to login
  if (!user) {
    return null;
  }

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <VStack gap="8">
        <VStack gap="6">
          <Heading size="2xl">Admin-Bereich</Heading>
          <Text fontSize="lg" color="fg.muted">
            Geben Sie Ihr Passwort ein, um Admin-Rechte zu aktivieren
          </Text>
          <Text fontSize="md" color="fg.subtle">
            Angemeldet als: {user.username}
          </Text>
        </VStack>

        <Box
          py={{ base: '0', sm: '8' }}
          px={{ base: '4', sm: '10' }}
          bg={{ base: 'transparent', sm: 'bg.surface' }}
          boxShadow={{ base: 'none', sm: 'md' }}
          borderRadius={{ base: 'none', sm: 'xl' }}
          w="full"
          maxW="md"
        >
          {/* API-Fehlermeldung anzeigen */}
          {apiError && (
            <Alert.Root status="error" mb="6" borderRadius="md">
              <Alert.Indicator>
                <PiWarning />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Anmeldung fehlgeschlagen!</Alert.Title>
                <Alert.Description>{apiError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <VStack gap="6">
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const trimmedValue = value.trim();
                    if (!trimmedValue) {
                      return 'Passwort ist erforderlich';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field.Root invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0} w="full">
                    <Field.Label fontWeight="medium">Passwort</Field.Label>
                    <PasswordInput
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Ihr Passwort"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      onBlur={field.handleBlur}
                      disabled={loginMutation.isPending}
                    />
                    <Field.ErrorText>{field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors[0] : null}</Field.ErrorText>
                  </Field.Root>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isFormSubmitting]) => {
                  return (
                    <Button
                      type="submit"
                      colorPalette="primary"
                      size="lg"
                      fontSize="md"
                      w="full"
                      disabled={!canSubmit || loginMutation.isPending || isFormSubmitting}
                      loading={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? 'Melde an...' : 'Als Admin anmelden'}
                    </Button>
                  );
                }}
              </form.Subscribe>
            </VStack>
          </form>
        </Box>
      </VStack>
    </Container>
  );
}
