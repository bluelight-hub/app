'use client';

import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { PasswordStrengthIndicator } from '@/shared/ui/molecules/password-strength-indicator.molecule';
import { cn } from '@/shared/ui/cn';
import { setupFormSchema, type SetupFormValues } from '../../schemas/setup-form.schema';
import { useAdminSetup } from '../../api/use-admin-setup';
import { PiUserCircle, PiKey } from 'react-icons/pi';

interface SetupFormProps {
  onSuccess: (token: string) => void;
  className?: string;
}

/**
 * Admin-Setup Formular
 *
 * Ermoeglicht die Erstellung des ersten Admin-Accounts
 * mit Username und Passwort.
 */
export function SetupForm({ onSuccess, className }: SetupFormProps) {
  const setupMutation = useAdminSetup();

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      passwordConfirm: '',
    } as SetupFormValues,
    validatorAdapter: zodValidator(),
    validators: {
      onChange: setupFormSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await setupMutation.mutateAsync({
        username: value.username,
        password: value.password,
      });
      // Token aus der Response extrahieren
      onSuccess(result.data.accessToken.token);
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      className={cn('space-y-6', className)}
    >
      {setupMutation.error && (
        <Alert
          status="error"
          title="Fehler beim Setup"
          description={setupMutation.error.message.includes('SETUP_ALREADY_COMPLETED') ? 'Das Setup wurde bereits abgeschlossen. Bitte melden Sie sich an.' : setupMutation.error.message}
        />
      )}

      {/* Username Field */}
      <div className="space-y-2">
        <label htmlFor="username" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
          Benutzername
        </label>
        <form.Field name="username">
          {(field) => {
            const fieldError = field.state.meta.errors[0];
            const errorMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

            return (
              <div className="space-y-1">
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  variant={fieldError ? 'error' : 'default'}
                  leftIcon={<PiUserCircle className="h-5 w-5" />}
                  autoComplete="username"
                  autoFocus
                />
                {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{errorMessage}</p>}
              </div>
            );
          }}
        </form.Field>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
          Passwort
        </label>
        <form.Field name="password">
          {(field) => {
            const fieldError = field.state.meta.errors[0];
            const errorMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

            return (
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Mindestens 8 Zeichen"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  variant={fieldError ? 'error' : 'default'}
                  leftIcon={<PiKey className="h-5 w-5" />}
                  autoComplete="new-password"
                />
                <PasswordStrengthIndicator password={field.state.value} showLabel={true} showCriteria={true} />
                {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{errorMessage}</p>}
              </div>
            );
          }}
        </form.Field>
      </div>

      {/* Password Confirm Field */}
      <div className="space-y-2">
        <label htmlFor="passwordConfirm" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
          Passwort bestaetigen
        </label>
        <form.Field name="passwordConfirm">
          {(field) => {
            const fieldError = field.state.meta.errors[0];
            const errorMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

            return (
              <div className="space-y-1">
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="Passwort wiederholen"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  variant={fieldError ? 'error' : 'default'}
                  leftIcon={<PiKey className="h-5 w-5" />}
                  autoComplete="new-password"
                />
                {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{errorMessage}</p>}
              </div>
            );
          }}
        </form.Field>
      </div>

      {/* Submit Button */}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting || setupMutation.isPending} disabled={!canSubmit || setupMutation.isPending}>
            {isSubmitting || setupMutation.isPending ? 'Wird eingerichtet...' : 'Server einrichten'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
