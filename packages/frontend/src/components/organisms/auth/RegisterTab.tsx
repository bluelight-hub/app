import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PiInfo, PiUser, PiWarning } from 'react-icons/pi';
import type { RegisterFormData } from '@/schemas/auth.schema';
import { registerFormSchema } from '@/schemas/auth.schema';
import { Alert } from '@/components/atoms/alert.atom';
import { Button } from '@/components/atoms/button.atom';
import { Input } from '@/components/atoms/input.atom';
import { FormField } from '@/components/atoms/form-field.atom';

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
      <div className="mt-6 flex flex-col gap-6">
        {/* Fehleranzeige */}
        {error && (
          <Alert status="error" title="Registrierung fehlgeschlagen!" description={error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'} icon={<PiWarning />} />
        )}

        {/* Username Input mit Zod-Validierung */}
        <FormField
          label={
            <span className="flex items-center gap-2">
              Neuer Benutzername
              <span
                title="Der Benutzername muss mit einem Buchstaben beginnen und darf nur Buchstaben, Zahlen und Unterstriche enthalten."
                aria-label="Info: Regeln für den Benutzernamen"
                className="cursor-help text-gray-500 transition-colors hover:text-gray-700"
              >
                <PiInfo />
              </span>
            </span>
          }
          error={hasUsernameError ? errors.username?.message : undefined}
          helperText={!hasUsernameError ? '3-30 Zeichen, beginnt mit Buchstaben, erlaubt: a-z, A-Z, 0-9, _' : undefined}
          className="w-full"
        >
          <Input
            {...register('username')}
            type="text"
            autoComplete="username"
            spellCheck="false"
            placeholder="z.B. max_mustermann"
            disabled={isLoading}
            fullWidth
            variant={hasUsernameError ? 'error' : 'default'}
            leftIcon={<PiUser size={18} />}
          />
        </FormField>

        {/* Submit Button */}
        <Button title={!isValid ? 'Bitte geben Sie einen gültigen Benutzernamen ein' : undefined} type="submit" size="lg" fullWidth disabled={!isValid || isLoading} loading={isLoading}>
          {isLoading ? 'Registriere...' : 'Registrieren'}
        </Button>
      </div>
    </form>
  );
}
