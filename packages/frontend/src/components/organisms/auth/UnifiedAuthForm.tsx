'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { PiUser } from 'react-icons/pi';
import { z } from 'zod';

import type { AuthRequestDto } from '@bluelight-hub/shared/client';
import { Button } from '@/components/atoms/button.atom';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/utils/cn';
import { api } from '@/api/api.ts';

// Zod Schema für Validierung
const authSchema = z.object({
  username: z.string().min(3, 'Mindestens 3 Zeichen erforderlich'),
});

export interface UnifiedAuthFormProps {
  onSubmit: (values: AuthRequestDto) => Promise<void>;
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
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Lade verfügbare Benutzer
  const { data: usersData } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const response = await api.auth().authControllerGetPublicUsers();
      return response.users;
    },
    staleTime: 60000, // Cache für 1 Minute
  });

  // Konvertiere User-Daten für Combobox
  const comboboxItems =
    usersData?.map((user) => ({
      value: user.username,
      label: user.username,
    })) || [];

  const handleUsernameChange = (value: string) => {
    setSelectedUsername(value);
    setValidationError(''); // Clear error when user types
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validiere mit Zod
      try {
        const validated = authSchema.parse({ username: selectedUsername });
        await onSubmit({ username: validated.username });
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationError(err.errors[0]?.message || 'Ungültige Eingabe');
        }
      }
    },
    [selectedUsername, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <Combobox
          items={comboboxItems}
          value={selectedUsername}
          onChange={handleUsernameChange}
          placeholder="Benutzername eingeben oder auswählen..."
          label="Benutzername"
          helperText="Wählen Sie einen bestehenden Benutzer oder geben Sie einen neuen Namen ein"
          disabled={isLoading}
          allowCustomValue={true}
          leadingIcon={<PiUser className="h-5 w-5" />}
          error={validationError || (error ? 'Anmeldung fehlgeschlagen' : undefined)}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading || !selectedUsername} loading={isLoading}>
        {isLoading ? 'Wird verarbeitet...' : 'Anmelden'}
      </Button>

      {error && !validationError && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}</p>
        </div>
      )}
    </form>
  );
}
