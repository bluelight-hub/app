import { Alert, Box, Button, Field, Input, VStack } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PiInfo, PiUser, PiWarning } from 'react-icons/pi';
import type { RegisterFormData } from '@/schemas/auth.schema';
import { registerFormSchema } from '@/schemas/auth.schema';
import { Tooltip } from '@/components/ui/tooltip';

interface RegisterTabProps {
  onSubmit: (username: string) => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Register-Tab-Komponente für die Registrierung neuer Benutzer
 *
 * Ermöglicht die Eingabe eines neuen Benutzernamens
 * mit Zod-basierter Validierung.
 */
export function RegisterTab({ onSubmit, isLoading, error }: RegisterTabProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onChange',
  });

  const handleFormSubmit = (data: RegisterFormData) => {
    onSubmit(data.username);
  };

  const hasUsernameError = touchedFields.username && errors.username;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <VStack gap="6" mt="6">
        {/* Fehleranzeige */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator>
              <PiWarning />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Registrierung fehlgeschlagen!</Alert.Title>
              <Alert.Description>{error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Username Input mit Zod-Validierung */}
        <Field.Root invalid={!!hasUsernameError} w="full">
          <Field.Label fontWeight="medium">
            Neuer Benutzername
            <Tooltip content="Der Benutzername muss mit einem Buchstaben beginnen und darf nur Buchstaben, Zahlen und Unterstriche enthalten.">
              <span style={{ marginLeft: '8px', cursor: 'help' }}>
                <PiInfo />
              </span>
            </Tooltip>
          </Field.Label>
          <Box position="relative" w="full">
            {/* User Icon */}
            <Box position="absolute" left="4" top="50%" transform="translateY(-50%)" zIndex="1" color="fg.muted" pointerEvents="none">
              <PiUser size="18" />
            </Box>
            <Input
              {...register('username')}
              type="text"
              autoComplete="username"
              spellCheck="false"
              placeholder="z.B. max_mustermann"
              disabled={isLoading}
              w="full"
              pl="12"
              pr="4"
              bg="bg.muted"
              border="2px solid"
              borderColor="border.muted"
              borderRadius="12px"
              fontSize="16px"
              py="3.5"
              _focus={{
                borderColor: 'blue.solid',
                bg: 'bg.subtle',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
              }}
            />
          </Box>
          {hasUsernameError && <Field.ErrorText>{errors.username?.message}</Field.ErrorText>}
          {!hasUsernameError && <Field.HelperText>3-30 Zeichen, beginnt mit Buchstabe, erlaubt: a-z, A-Z, 0-9, _</Field.HelperText>}
        </Field.Root>

        {/* Submit Button */}
        <Tooltip content={!isValid ? 'Bitte geben Sie einen gültigen Benutzernamen ein' : undefined} disabled={isValid || isLoading}>
          <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={!isValid || isLoading} loading={isLoading}>
            {isLoading ? 'Registriere...' : 'Registrieren'}
          </Button>
        </Tooltip>
      </VStack>
    </form>
  );
}
