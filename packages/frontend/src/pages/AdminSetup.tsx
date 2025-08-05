import { useState } from 'react';
import { Alert, Box, Button, Container, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { PiCheckCircle, PiWarning } from 'react-icons/pi';
import { z } from 'zod';
import type { AdminSetupDto } from '@bluelight-hub/shared/client';
import { useAuth } from '@/provider/auth.hooks.ts';
import { useAdminStatus } from '@/hooks/useAdminStatus.ts';
import { logger } from '@/utils/logger.ts';
import { api } from '@/api/api.ts';

/**
 * Schema für die Validierung des Admin-Setup-Formulars
 */
const adminSetupSchema = z.object({
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein').max(128, 'Das Passwort darf maximal 128 Zeichen lang sein'),
});

/**
 * Admin-Setup-Seite für die Ersteinrichtung eines Admin-Accounts
 *
 * Ermöglicht es Benutzern, ein Admin-Passwort zu setzen, solange noch kein Admin existiert.
 * Nach erfolgreicher Einrichtung wird der Benutzer zum Dashboard weitergeleitet.
 */
export function AdminSetup() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, setUser } = useAuth();
  const { refetch: refetchAdminStatus } = useAdminStatus();

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      if (isSubmitting) return;

      // Validate password confirmation
      if (value.password !== value.confirmPassword) {
        setApiError('Die Passwörter stimmen nicht überein');
        return;
      }

      setIsSubmitting(true);
      setApiError(null);

      try {
        const setupData: AdminSetupDto = {
          password: value.password,
        };

        await api.auth().authControllerAdminSetup({
          adminSetupDto: setupData,
        });

        // Erfolgreiche Einrichtung - zeige Erfolgsmeldung und leite weiter
        logger.log('Admin-Setup erfolgreich');

        // Lade den aktualisierten User (adminSetupAvailable sollte jetzt false sein)
        try {
          const updatedUser = await api.auth().authControllerGetCurrentUser();
          refetchAdminStatus().then(() => {
            setUser(updatedUser);
          });
        } catch (error) {
          logger.error('Fehler beim Laden des aktualisierten Users:', error);
          // Trotzdem weiterleiten, da das Setup erfolgreich war
        }

        // Redirect zur Startseite (Dashboard existiert noch nicht)
        // Das adminToken Cookie wurde automatisch vom Backend gesetzt
        await navigate({ to: '/' });
      } catch (error) {
        logger.error('Admin-Setup-Fehler:', error);

        // API-Fehler behandeln
        if (error instanceof Error) {
          // Prüfe auf 409 (Admin existiert bereits)
          if (error.message.includes('409') || error.message.includes('existiert bereits')) {
            setApiError('Ein Admin-Account existiert bereits. Diese Funktion ist nicht mehr verfügbar.');
          } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            setApiError('Sie sind nicht angemeldet. Bitte melden Sie sich zuerst an.');
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

  // Navigation zur Startseite nur wenn kein User angemeldet ist
  // Die adminSetupAvailable Prüfung erfolgt bereits auf der Index-Seite
  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <VStack gap="8">
        <VStack gap="6">
          <Heading size="2xl">Admin-Setup</Heading>
          <Text fontSize="lg" color="fg.muted" textAlign="center">
            Richten Sie Ihren Admin-Account ein, indem Sie ein sicheres Passwort festlegen.
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
          <Alert.Root status="info" mb="6" borderRadius="md">
            <Alert.Indicator>
              <PiCheckCircle />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Einmalige Einrichtung</Alert.Title>
              <Alert.Description>Diese Funktion ist nur verfügbar, solange noch kein Admin-Account existiert.</Alert.Description>
            </Alert.Content>
          </Alert.Root>

          {/* API-Fehlermeldung anzeigen */}
          {apiError && (
            <Alert.Root status="error" mb="6" borderRadius="md">
              <Alert.Indicator>
                <PiWarning />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Setup fehlgeschlagen!</Alert.Title>
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
                    try {
                      adminSetupSchema.shape.password.parse(value);
                      return undefined;
                    } catch (error) {
                      if (error instanceof z.ZodError) {
                        return error.issues[0].message;
                      }
                      return 'Ungültiges Passwort';
                    }
                  },
                }}
              >
                {(field) => (
                  <Field.Root invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0} w="full">
                    <Field.Label fontWeight="medium">Passwort</Field.Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mindestens 8 Zeichen"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      onBlur={field.handleBlur}
                      disabled={isSubmitting}
                    />
                    <Field.ErrorText>{field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors[0] : null}</Field.ErrorText>
                    <Field.HelperText>Das Passwort muss mindestens 8 Zeichen lang sein</Field.HelperText>
                  </Field.Root>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value, fieldApi }) => {
                    const password = fieldApi.form.getFieldValue('password');
                    if (value !== password) {
                      return 'Die Passwörter stimmen nicht überein';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field.Root invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0} w="full">
                    <Field.Label fontWeight="medium">Passwort bestätigen</Field.Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Passwort wiederholen"
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
                      {isSubmitting ? 'Wird eingerichtet...' : 'Admin-Account einrichten'}
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
