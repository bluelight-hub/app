import { useEffect } from 'react';
import { Alert, Box, Button, Container, Field, Heading, Input, Link, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PiWarning } from 'react-icons/pi';
import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import { authActions } from '../stores/auth.store';
import type { LoginUserDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api.ts';
import { useAuth } from '@/hooks/useAuth.ts';
import { toaster } from '@/components/ui/toaster.instance';

/**
 * Anmeldeseite für bestehende Benutzer
 *
 * Ermöglicht die Anmeldung nur mit Benutzernamen (ohne Passwort).
 * Nach erfolgreicher Anmeldung wird der User im TanStack Store gespeichert.
 */
export function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      void navigate({ to: '/' });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (loginData: LoginUserDto) => {
      return await api.auth().authControllerLogin({
        loginUserDto: loginData,
      });
    },
    onSuccess: async (response) => {
      console.log('Anmeldung erfolgreich:', response);

      // Speichere den User im Auth Store
      authActions.loginSuccess(response.user);

      // Invalidiere relevante Queries
      await queryClient.invalidateQueries({ queryKey: ['auth-check'] });

      // Zeige Erfolgs-Toast
      toaster.create({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich angemeldet.',
        type: 'success',
      });

      // TODO: Redirect zu /dashboard statt / nach erfolgreicher Anmeldung
      await navigate({ to: '/' });
    },
    onError: (error: Error) => {
      console.error('Anmeldefehler:', error);

      // Handle ResponseError from API
      if (error instanceof ResponseError) {
        const status = error.response.status;

        // 404 Not Found - Benutzer nicht gefunden
        if (status === 404) {
          toaster.create({
            title: 'Login fehlgeschlagen',
            description: 'Benutzer nicht gefunden. Bitte überprüfen Sie den Benutzernamen.',
            type: 'error',
          });
        }
        // Andere HTTP-Fehler
        else {
          toaster.create({
            title: 'Fehler',
            description: 'Ein unerwarteter Fehler ist aufgetreten.',
            type: 'error',
          });
        }
      } else {
        toaster.create({
          title: 'Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          type: 'error',
        });
      }
    },
  });

  const form = useForm({
    defaultValues: {
      username: '',
    },
    onSubmit: ({ value }) => {
      const loginData: LoginUserDto = {
        username: value.username,
      };
      loginMutation.mutate(loginData);
    },
  });

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <VStack gap="8">
        <VStack gap="6">
          <Heading size="2xl">Anmeldung</Heading>
          <Text fontSize="lg" color="fg.muted">
            Melden Sie sich mit Ihrem Benutzernamen an
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
          {loginMutation.isError && (
            <Alert.Root status="error" mb="6" borderRadius="md">
              <Alert.Indicator>
                <PiWarning />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Anmeldung fehlgeschlagen!</Alert.Title>
                <Alert.Description>
                  {loginMutation.error instanceof ResponseError && loginMutation.error.response.status === 404
                    ? 'Benutzer nicht gefunden. Bitte überprüfen Sie den Benutzernamen.'
                    : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <VStack gap="6">
              <form.Field
                name="username"
                validators={{
                  onChange: ({ value }) => {
                    const trimmedValue = value.trim();
                    if (!trimmedValue) {
                      return 'Benutzername ist erforderlich';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field.Root invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0} w="full">
                    <Field.Label fontWeight="medium">Benutzername</Field.Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      spellCheck="false"
                      placeholder="Geben Sie Ihren Benutzernamen ein"
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
                      {loginMutation.isPending ? 'Melde an...' : 'Anmelden'}
                    </Button>
                  );
                }}
              </form.Subscribe>
            </VStack>
          </form>

          <Text mt="6" textAlign="center" fontSize="sm" color="fg.muted">
            Noch kein Account?{' '}
            <Link asChild colorPalette="primary">
              <RouterLink to="/register">Jetzt registrieren</RouterLink>
            </Link>
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
