import { useState } from 'react';
import { Alert, Box, Button, Container, Field, Heading, Input, Link, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { PiWarning } from 'react-icons/pi';
import { authActions } from '../stores/auth.store';
import type { RegisterUserDto } from '@bluelight-hub/shared/client';
import { logger } from '@/utils/logger.ts';
import { api } from '@/api/api.ts';

/**
 * Registrierungsseite für neue Benutzer
 *
 * Ermöglicht die Selbstregistrierung ohne Passwort.
 * Benutzer müssen nur einen eindeutigen Benutzernamen angeben.
 * Nach erfolgreicher Registrierung wird der User im TanStack Store gespeichert.
 */
export function Register() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      username: '',
    },
    onSubmit: async ({ value }) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setApiError(null);

      try {
        const registerData: RegisterUserDto = {
          username: value.username,
        };

        const response = await api.auth().authControllerRegister({
          registerUserDto: registerData,
        });

        // Erfolgreiche Registrierung - speichere User im Store
        logger.log('✅ Registrierung erfolgreich:', response);

        // Speichere den User im Auth Store
        authActions.loginSuccess(response.user);

        // TODO: Redirect zu /dashboard statt / nach erfolgreicher Registrierung
        await navigate({ to: '/' });
      } catch (error) {
        logger.error('🙀 Registrierungsfehler:', error);

        // API-Fehler behandeln
        if (error instanceof Error) {
          setApiError(error.message);
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
          <Heading size="2xl">Registrierung</Heading>
          <Text fontSize="lg" color="fg.muted">
            Erstellen Sie einen neuen Account
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
                <Alert.Title>Registrierung fehlgeschlagen!</Alert.Title>
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
                    if (trimmedValue.length < 3) {
                      return 'Benutzername muss mindestens 3 Zeichen lang sein';
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
                      placeholder="Wählen Sie einen Benutzernamen"
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
                  // Debug logging removed after fix

                  return (
                    <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={!canSubmit || isSubmitting || isFormSubmitting} loading={isSubmitting}>
                      {isSubmitting ? 'Registriere...' : 'Registrieren'}
                    </Button>
                  );
                }}
              </form.Subscribe>
            </VStack>
          </form>

          <Text mt="6" textAlign="center" fontSize="sm" color="fg.muted">
            Bereits registriert?{' '}
            <Link asChild colorPalette="primary">
              <RouterLink to="/login">Jetzt anmelden</RouterLink>
            </Link>
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
