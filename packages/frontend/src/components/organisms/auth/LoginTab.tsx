import { useMemo, useState } from 'react';
import { Alert, Button, Field, VStack, createListCollection } from '@chakra-ui/react';
import { PiCaretUpDown, PiWarning, PiX } from 'react-icons/pi';
import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import { usePublicUsers } from '@/hooks/usePublicUsers';
import {
  ComboboxClearTrigger,
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxIndicatorGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemText,
  ComboboxLabel,
  ComboboxRoot,
  ComboboxTrigger,
} from '@/components/ui/combobox';

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
  const [selectedValues, setSelectedValues] = useState<Array<string>>([]);
  const { data: users = [], isLoading: isLoadingUsers } = usePublicUsers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use either the selected value or the typed input
    const username = selectedValues[0] || inputValue;
    if (username) {
      onSubmit(username);
    }
  };

  const isDisabled = isLoading || isLoadingUsers || (!selectedValues[0] && !inputValue.trim());

  // Create collection for Combobox with filtering
  const usersCollection = useMemo(() => {
    const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(inputValue.toLowerCase()));

    return createListCollection({
      items: filteredUsers.map((user) => ({
        value: user.username,
        label: user.username,
      })),
    });
  }, [users, inputValue]);

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="6" mt="6">
        {/* Fehleranzeige */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator>
              <PiWarning />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Anmeldung fehlgeschlagen!</Alert.Title>
              <Alert.Description>
                {error instanceof ResponseError && error.response.status === 404
                  ? 'Benutzer nicht gefunden. Bitte überprüfen Sie Ihre Auswahl.'
                  : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* User Combobox */}
        <Field.Root w="full">
          <ComboboxRoot
            collection={usersCollection}
            value={selectedValues}
            onValueChange={(details) => setSelectedValues(details.value)}
            inputValue={inputValue}
            onInputValueChange={(details) => setInputValue(details.inputValue)}
            disabled={isLoadingUsers || isLoading}
            openOnClick
            allowCustomValue
          >
            <ComboboxLabel fontWeight="medium">Benutzername</ComboboxLabel>
            <ComboboxControl>
              <ComboboxInput placeholder={isLoadingUsers ? 'Lade Benutzer...' : 'Benutzername eingeben oder auswählen...'} />
              <ComboboxIndicatorGroup>
                {inputValue && (
                  <ComboboxClearTrigger>
                    <PiX />
                  </ComboboxClearTrigger>
                )}
                <ComboboxTrigger>
                  <PiCaretUpDown />
                </ComboboxTrigger>
              </ComboboxIndicatorGroup>
            </ComboboxControl>

            <ComboboxContent>
              {usersCollection.items.length === 0 ? (
                <ComboboxEmpty>{inputValue ? `Keine Übereinstimmung für "${inputValue}"` : 'Keine Benutzer verfügbar'}</ComboboxEmpty>
              ) : (
                usersCollection.items.map((user) => (
                  <ComboboxItem key={user.value} item={user}>
                    <ComboboxItemText>{user.label}</ComboboxItemText>
                  </ComboboxItem>
                ))
              )}
            </ComboboxContent>
          </ComboboxRoot>
          <Field.HelperText>Geben Sie Ihren Benutzernamen ein oder wählen Sie aus der Liste</Field.HelperText>
        </Field.Root>

        {/* Submit Button */}
        <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={isDisabled} loading={isLoading}>
          {isLoading ? 'Melde an...' : 'Anmelden'}
        </Button>
      </VStack>
    </form>
  );
}
