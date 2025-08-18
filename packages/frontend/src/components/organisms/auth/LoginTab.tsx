import * as React from 'react';
import { useMemo, useState } from 'react';
import { PiUser } from 'react-icons/pi';
import type { ComboboxItem } from '@/components/ui/combobox';
import { Combobox } from '@/components/ui/combobox';
import { usePublicUsers } from '@/hooks/usePublicUsers';
import { Button } from '@/components/atoms/button.atom';
import { Alert } from '@/components/atoms/alert.atom';
import { FormField } from '@/components/atoms/form-field.atom';

interface LoginTabProps {
  onSubmit: (username: string) => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Login-Tab-Komponente für die Anmeldung bestehender Benutzer
 *
 * Zeigt eine Dropdown-Liste aller verfügbaren Benutzer an,
 * aus der der Benutzer seinen Account auswählen kann.
 */
export function LoginTab({ onSubmit, isLoading, error }: LoginTabProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const { data: users = [], isLoading: isLoadingUsers } = usePublicUsers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use either the selected value or the typed input
    const username = selectedValue || inputValue;
    if (username) {
      onSubmit(username);
    }
  };

  const isDisabled = isLoading || isLoadingUsers || (!selectedValue && !inputValue.trim());

  // Create items for Combobox
  const userItems: Array<ComboboxItem> = useMemo(() => {
    return users.map((user) => ({
      value: user.username,
      label: user.username,
    }));
  }, [users]);

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* Fehleranzeige */}
      {error && <Alert status="error" title="Anmeldung fehlgeschlagen!" description={error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'} />}

      {/* User Combobox */}
      <FormField label="Benutzername" helperText="Geben Sie Ihren Benutzernamen ein oder wählen Sie aus der Liste">
        <Combobox
          items={userItems}
          value={selectedValue}
          onChange={setSelectedValue}
          onInputChange={setInputValue}
          placeholder={isLoadingUsers ? 'Lade Benutzer...' : 'Benutzername auswählen...'}
          disabled={isLoadingUsers || isLoading}
          leadingIcon={<PiUser size="18" />}
        />
      </FormField>

      {/* Submit Button */}
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={isDisabled} loading={isLoading} className="shadow-[0_10px_25px_rgba(239,68,68,0.25)]">
        {isLoading ? 'Melde an...' : 'Sicher anmelden'}
      </Button>
    </form>
  );
}
