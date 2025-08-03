import { useState } from 'react';
import { Alert, Box, Button, Container, Field, Heading, Input, Link, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { PiWarning } from 'react-icons/pi';
import { BackendApi } from '../api/api';
import { authActions } from '../stores/auth.store';
import type { LoginUserDto } from '@bluelight-hub/shared/client';

/**
 * Anmeldeseite für bestehende Benutzer
 *
 * Ermöglicht die Anmeldung nur mit Benutzernamen (ohne Passwort).
 * Nach erfolgreicher Anmeldung wird der User im TanStack Store gespeichert.
 */
export function Login() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const api = new BackendApi();

  const form = useForm({
    defaultValues: {
      username: '',
    },
    onSubmit: async ({ value }) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setApiError(null);

      try {
        const loginData: LoginUserDto = {
          username: value.username,
        };

        const response = await api.auth().authControllerLogin({
          loginUserDto: loginData,
        });

        // Erfolgreiche Anmeldung - speichere User im Store
        console.log('Anmeldung erfolgreich:', response);

        // Speichere den User im Auth Store
        authActions.loginSuccess(response.user);

        // TODO: Redirect zu /dashboard statt / nach erfolgreicher Anmeldung
        await navigate({ to: '/' });
      } catch (error) {
        console.error('Anmeldefehler:', error);

        // API-Fehler behandeln
        if (error instanceof Error) {
          // Prüfe auf 404 (Benutzer nicht gefunden)
          if (error.message.includes('404') || error.message.includes('nicht gefunden')) {
            setApiError('Benutzer nicht gefunden. Bitte überprüfen Sie den Benutzernamen.');
          } else {
            setApiError(error.message);
          }
        } else {
          setApiError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
      } finally {
        setIsSubmitting(false);
      }
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
                      disabled={isSubmitting}
                    />
                    <Field.ErrorText>{field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors[0] : null}</Field.ErrorText>
                  </Field.Root>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isFormSubmitting]) => {
                  return (
                    <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={!canSubmit || isSubmitting || isFormSubmitting} loading={isSubmitting}>
                      {isSubmitting ? 'Melde an...' : 'Anmelden'}
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
