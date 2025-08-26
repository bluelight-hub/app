import { Alert } from '@atoms/alert.atom';
import { Button } from '@atoms/button.atom';
import { Card } from '@atoms/card.atom';
import { FormField } from '@atoms/form-field.atom';
import { Text } from '@atoms/text.atom';
import { PasswordInput } from '@molecules/password-input.molecule';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PiCheckCircle, PiWarning } from 'react-icons/pi';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth.ts';
import { getApiErrorMessage } from '@/utils/apiErrorHandler.ts';
import { logger } from '@/utils/logger';

/**
 * Schema für die Validierung des Admin-Setup-Formulars
 */
const adminSetupSchema = z.object({
  password: z
    .string()
    .min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein')
    .max(128, 'Das Passwort darf maximal 128 Zeichen lang sein')
    .regex(/[a-z]/, 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[A-Z]/, 'Das Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[0-9]/, 'Das Passwort muss mindestens eine Zahl enthalten')
    .regex(/[^a-zA-Z0-9]/, 'Das Passwort muss mindestens ein Sonderzeichen enthalten'),
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
  const { user, adminSetup } = useAuth();

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      // Validate password confirmation
      if (value.password !== value.confirmPassword) {
        setApiError('Die Passwörter stimmen nicht überein');
        return;
      }

      setApiError(null);

      return adminSetup.mutateAsync(
        { password: value.password },
        {
          onSuccess: async () => {
            logger.log('Admin-Setup erfolgreich');
            await navigate({ to: '/admin/dashboard' });
          },
          onError: async (error) => {
            const message = await getApiErrorMessage(error, 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', 'adminSetup');
            setApiError(message);
          },
        },
      );
    },
  });

  // Navigation zur Startseite nur wenn kein User angemeldet ist
  // Die adminSetupAvailable Prüfung erfolgt bereits auf der Index-Seite
  useEffect(() => {
    if (!user) {
      navigate({ to: '/' });
    }
  }, [user, navigate]);

  // Early return nach useEffect, um Hooks-Regeln einzuhalten
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <Text size="lg" color="muted" className="text-center">
        Richten Sie Ihren Admin-Account ein, indem Sie ein sicheres Passwort festlegen.
      </Text>

      <Card className="w-full max-w-md" padding="lg">
        <Alert status="info" title="Einmalige Einrichtung" description="Diese Funktion ist nur verfügbar, solange noch kein Admin-Account existiert." icon={<PiCheckCircle />} className="mb-6" />

        {/* API-Fehlermeldung anzeigen */}
        {apiError && <Alert status="error" title="Setup fehlgeschlagen!" description={apiError} icon={<PiWarning />} className="mb-6" />}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-6">
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
                <FormField
                  label="Passwort"
                  error={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors[0] : undefined}
                  helperText={field.state.meta.errors.length === 0 ? 'Mind. 8 Zeichen, 1 Groß-, 1 Kleinbuchstabe, 1 Zahl, 1 Sonderzeichen' : undefined}
                  required
                >
                  <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Mindestens 8 Zeichen"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    onBlur={field.handleBlur}
                    disabled={adminSetup.isPending}
                    variant={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
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
                <FormField label="Passwort bestätigen" error={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors[0] : undefined} required>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Passwort wiederholen"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    onBlur={field.handleBlur}
                    disabled={adminSetup.isPending}
                    variant={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => {
                return (
                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit || adminSetup.isPending} loading={adminSetup.isPending}>
                    {adminSetup.isPending ? 'Wird eingerichtet...' : 'Admin-Account einrichten'}
                  </Button>
                );
              }}
            </form.Subscribe>
          </div>
        </form>
      </Card>
    </div>
  );
}
