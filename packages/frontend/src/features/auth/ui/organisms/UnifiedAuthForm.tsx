'use client';

import type { AuthRequestDto } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useMemo } from 'react';
import { PiUser } from 'react-icons/pi';
import { z } from 'zod';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
import { usePublicUsers } from '@/features/auth';
import { cn } from '@/shared/utils/cn';

// Zod Schema für Validierung
const authSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Mindestens 3 Zeichen erforderlich')
    .max(30, 'Maximal 30 Zeichen erlaubt')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nur Buchstaben, Zahlen, Unterstriche und Bindestriche erlaubt'),
});

export interface UnifiedAuthFormProps {
  onSubmit: (values: AuthRequestDto) => Promise<void> | void;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

/**
 * Vereinheitlichtes Auth-Formular mit Combobox für Benutzerauswahl
 *
 * Ermöglicht sowohl die Auswahl bestehender Benutzer als auch
 * die Eingabe neuer Benutzernamen für automatische Registrierung.
 */
export function UnifiedAuthForm({ onSubmit, isLoading = false, error, className }: UnifiedAuthFormProps) {
  // Lade verfügbare Benutzer über zentralen Hook
  const { data: usersData } = usePublicUsers();

  // Konvertiere User-Daten für Combobox
  const comboboxItems = useMemo(() => {
    return (
      usersData?.map((user) => ({
        value: user.username,
        label: user.username,
      })) || []
    );
  }, [usersData]);

  // TanStack Form mit Zod Validator
  const form = useForm({
    defaultValues: {
      username: '',
    },
    validators: {
      onChange: authSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ username: value.username });
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
      <div className="space-y-4">
        <form.Field name="username">
          {(field) => {
            // Extract error message string from validation error
            const fieldError = field.state.meta.errors[0];
            const errorMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

            return (
              <Combobox
                items={comboboxItems}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                placeholder="Benutzername eingeben oder auswählen..."
                label="Benutzername"
                helperText="Wählen Sie einen bestehenden Benutzer oder geben Sie einen neuen Namen ein"
                disabled={isLoading || form.state.isSubmitting}
                allowCustomValue={true}
                leadingIcon={<PiUser className="h-5 w-5" />}
                error={errorMessage || (error ? 'Anmeldung fehlgeschlagen' : undefined)}
              />
            );
          }}
        </form.Field>
      </div>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || isLoading || isSubmitting} loading={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? 'Wird verarbeitet...' : 'Anmelden'}
          </Button>
        )}
      </form.Subscribe>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-red-800 text-sm dark:text-red-200">{error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}</p>
        </div>
      )}
    </form>
  );
}
