'use client';

import type { AuthRequestDto } from '@/shared';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo, useState } from 'react';
import { PiUser } from 'react-icons/pi';
import { z } from 'zod';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
import { usePublicUsers } from '@/features/auth';
import { cn } from '@/shared/ui/cn';

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
  error?: Error | string | null;
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

  const isBusy = isLoading || form.state.isSubmitting;
  const [showPendingNotice, setShowPendingNotice] = useState(false);
  const errorMessage = typeof error === 'string' ? error : error?.message;

  useEffect(() => {
    if (!isBusy) {
      setShowPendingNotice(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowPendingNotice(true);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isBusy]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      aria-busy={isBusy}
      className={cn('space-y-4', className)}
    >
      <div className="space-y-4">
        <form.Field name="username">
          {(field) => {
            // Extract error message string from validation error
            const fieldError = field.state.meta.errors[0];
            const fieldErrorMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

            return (
              <Combobox
                items={comboboxItems}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                autoFocus
                placeholder="Benutzername eingeben oder auswählen..."
                label="Benutzername"
                helperText="Wählen Sie einen bestehenden Benutzer oder geben Sie einen neuen Namen ein"
                disabled={isBusy}
                allowCustomValue={true}
                leadingIcon={<PiUser className="h-5 w-5" />}
                error={fieldErrorMessage ?? errorMessage}
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

      {showPendingNotice && (
        <output
          aria-live="polite"
          aria-atomic="true"
          className="block w-full break-words rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
        >
          Anmeldung wird verarbeitet. Ihre Eingaben bleiben erhalten.
        </output>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-red-800 text-sm dark:text-red-200">{errorMessage}</p>
        </div>
      )}
    </form>
  );
}
