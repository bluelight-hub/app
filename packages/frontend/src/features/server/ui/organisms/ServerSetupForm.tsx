/**
 * ServerSetupForm Organism
 *
 * Formular zum Hinzufügen eines neuen Servers via Server-URL und Invite-Code.
 * Unterstützt Prefill aus URL-Parametern (?server=...).
 *
 * **Features:**
 * - Prefill server URL from props (URL params integration)
 * - Manual invite code entry
 * - Form validation with Zod
 * - TanStack Form integration
 * - Exchange invite mutation on submit
 *
 * **Integration:**
 * - useExchangeInvite() (Story 2.4) - Server hinzufügen
 * - ExpiredLinkError (Story 2.4) - Error UI
 * - Toast (sonner) - Success/Error notifications
 */

import { useForm } from '@tanstack/react-form';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { cn } from '@/shared/ui/cn';
import { serverUrlSchema, inviteCodeSchema } from '../../schemas/url-params.schema';
import { useExchangeInvite } from '../../api/mutations';
import { ExpiredLinkError } from '../molecules/ExpiredLinkError';
import { toast } from 'sonner';
import { PiDatabase, PiKey } from 'react-icons/pi';

type ServerSetupFormValues = {
  serverUrl: string;
  inviteCode: string;
};

/**
 * Helper function to extract Zod validation error message
 */
function getZodError(result: { success: boolean; error?: { issues?: Array<{ message?: string }> } }, fallback: string): string | undefined {
  if (result.success) return undefined;
  const firstIssue = result.error?.issues?.[0];
  return firstIssue?.message || fallback;
}

interface ServerSetupFormProps {
  /**
   * Server-URL zum Prefill (aus URL-Parametern)
   * Wenn gesetzt, wird das serverUrl-Feld vorausgefüllt.
   */
  prefillServerUrl?: string;

  /**
   * Callback bei erfolgreichem Server-Setup
   */
  onSuccess?: () => void;

  /**
   * CSS className für Container
   */
  className?: string;
}

/**
 * Server Setup Formular
 *
 * Ermöglicht das manuelle Hinzufügen eines Servers durch Eingabe
 * von Server-URL und Invite-Code.
 *
 * @example
 * ```tsx
 * // Mit Prefill aus URL params
 * <ServerSetupForm prefillServerUrl="https://api.example.de" />
 *
 * // Ohne Prefill (leeres Formular)
 * <ServerSetupForm />
 * ```
 */
export function ServerSetupForm({ prefillServerUrl, onSuccess, className }: ServerSetupFormProps) {
  const exchangeInvite = useExchangeInvite();

  const form = useForm({
    defaultValues: {
      serverUrl: prefillServerUrl || '',
      inviteCode: '',
    } as ServerSetupFormValues,
    onSubmit: async ({ value }) => {
      try {
        // Exchange invite code (mutation handles server persistence)
        // Issue #2 Fix: Übergebe auch die serverUrl für korrekten Ziel-Server
        await exchangeInvite.mutateAsync({
          inviteCode: value.inviteCode,
          serverUrl: value.serverUrl || undefined,
        });

        // Success notification
        toast.success('Server erfolgreich hinzugefügt', {
          description: 'Du wirst weitergeleitet...',
        });

        // Callback for parent component (e.g., navigation)
        onSuccess?.();
      } catch (error) {
        // Error is already logged in mutation onError
        // Show toast notification
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Hinzufügen des Servers', {
          description: errorMessage,
        });
      }
    },
  });

  // Show error card if invite exchange failed with specific error codes
  const showErrorCard = exchangeInvite.isError;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error Card (reuse from Story 2.4) */}
      {showErrorCard && <ExpiredLinkError className="mb-4" />}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Server URL Field */}
        <div className="space-y-2">
          <label htmlFor="serverUrl" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
            Server-URL
          </label>
          <form.Field
            name="serverUrl"
            validators={{
              onChange: ({ value }) => getZodError(serverUrlSchema.safeParse(value), 'Ungültige Server-URL'),
              onBlur: ({ value }) => getZodError(serverUrlSchema.safeParse(value), 'Ungültige Server-URL'),
            }}
          >
            {(field) => {
              // Validators return string | undefined, so errors array contains strings
              const fieldError = field.state.meta.errors[0] as string | undefined;

              return (
                <div className="space-y-1">
                  <Input
                    id="serverUrl"
                    type="url"
                    placeholder="https://api.example.de"
                    value={field.state.value as string}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    variant={fieldError ? 'error' : 'default'}
                    leftIcon={<PiDatabase className="h-5 w-5" />}
                    autoComplete="url"
                    autoFocus={!prefillServerUrl} // Focus nur wenn nicht prefilled
                  />
                  {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Invite Code Field */}
        <div className="space-y-2">
          <label htmlFor="inviteCode" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
            Einladungscode
          </label>
          <form.Field
            name="inviteCode"
            validators={{
              onChange: ({ value }) => getZodError(inviteCodeSchema.safeParse(value), 'Ungültiger Invite-Code'),
              onBlur: ({ value }) => getZodError(inviteCodeSchema.safeParse(value), 'Ungültiger Invite-Code'),
            }}
          >
            {(field) => {
              // Validators return string | undefined, so errors array contains strings
              const fieldError = field.state.meta.errors[0] as string | undefined;

              return (
                <div className="space-y-1">
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="ABC12345"
                    value={field.state.value as string}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    variant={fieldError ? 'error' : 'default'}
                    leftIcon={<PiKey className="h-5 w-5" />}
                    autoComplete="off"
                    autoFocus={!!prefillServerUrl} // Focus wenn prefilled (User muss nur Code eingeben)
                  />
                  {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Submit Button */}
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting || exchangeInvite.isPending} disabled={!canSubmit || exchangeInvite.isPending}>
              {isSubmitting || exchangeInvite.isPending ? 'Verbinde...' : 'Server hinzufügen'}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
