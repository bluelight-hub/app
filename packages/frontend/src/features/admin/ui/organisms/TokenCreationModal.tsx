import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useState, useCallback, useEffect } from 'react';
import { PiCheck, PiCopy, PiWarning, PiKey } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

import { useCreateAccessToken } from '@/features/admin/api/use-access-token-management';
import { tokenCreationSchema } from '@/features/admin/schemas/token-creation.schema';

interface TokenCreationModalProps {
  /** Ob der Dialog geoeffnet ist */
  isOpen: boolean;
  /** Callback zum Schliessen des Dialogs */
  onClose: () => void;
  /** Optionaler Callback nach erfolgreicher Token-Erstellung */
  onTokenCreated?: () => void;
}

/**
 * Modal zur Erstellung eines neuen Server-Access-Tokens.
 *
 * Zeigt ein Formular mit Name-Input und Live-Validierung (AC1).
 * Nach erfolgreicher Erstellung wird das Token einmalig angezeigt (AC2, AC3)
 * mit Copy-to-Clipboard Funktion und Bestaetigungspflicht.
 *
 * Das Token kann NICHT erneut abgerufen werden - nur hier sichtbar!
 */
export const TokenCreationModal = ({ isOpen, onClose, onTokenCreated }: TokenCreationModalProps) => {
  // State fuer den Erfolgs-Bildschirm
  const [showToken, setShowToken] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdTokenName, setCreatedTokenName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateAccessToken();

  const form = useForm({
    defaultValues: { name: '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: tokenCreationSchema,
    },
    onSubmit: async ({ value }) => {
      createMutation.mutate(
        { name: value.name },
        {
          onSuccess: (response) => {
            setCreatedToken(response.data.token);
            setCreatedTokenName(response.data.name);
            setShowToken(true);
            onTokenCreated?.();
          },
        },
      );
    },
  });

  // Reset Copied-State nach Timeout
  useEffect(() => {
    if (copied) {
      const timeoutId = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copied]);

  const handleCopyToken = useCallback(async () => {
    if (createdToken) {
      try {
        await navigator.clipboard.writeText(createdToken);
        setCopied(true);
        toast.success('Token kopiert', {
          description: 'Das Token wurde in die Zwischenablage kopiert.',
        });
      } catch (_error) {
        toast.error('Fehler beim Kopieren', {
          description: 'Das Token konnte nicht kopiert werden. Bitte manuell markieren und kopieren.',
        });
      }
    }
  }, [createdToken]);

  const handleClose = useCallback(() => {
    // Nur schliessen wenn nicht im Success-State oder wenn bestaetigt
    if (!showToken || confirmed) {
      form.reset();
      setShowToken(false);
      setCreatedToken(null);
      setCreatedTokenName(null);
      setConfirmed(false);
      setCopied(false);
      onClose();
    }
  }, [showToken, confirmed, form, onClose]);

  // Verhindere Schliessen durch Escape/Klick ausserhalb wenn Token angezeigt wird und nicht bestaetigt
  const canClose = !showToken || confirmed;

  // Success View: Token-Anzeige mit Kopier-Funktion und Bestaetigung
  if (showToken && createdToken) {
    return (
      <Dialog isOpen={isOpen} onClose={canClose ? handleClose : () => {}} closeOnEscape={canClose} closeOnClickOutside={canClose}>
        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-green-500" />
            <span>Token erstellt</span>
          </div>
        </Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            {/* Warnung: Token nur einmal sichtbar */}
            <Alert status="warning" icon={<PiWarning className="h-5 w-5" />}>
              <div className="space-y-1">
                <p className="font-medium">Dieser Token wird nur einmal angezeigt!</p>
                <p className="text-sm opacity-90">Kopieren Sie ihn jetzt und speichern Sie ihn sicher. Er kann spaeter nicht mehr abgerufen werden.</p>
              </div>
            </Alert>

            {/* Token-Name */}
            <div className="text-gray-600 text-sm dark:text-gray-400">
              Token-Name: <span className="font-medium text-gray-900 dark:text-white">{createdTokenName}</span>
            </div>

            {/* Token-Anzeige mit Copy-Button */}
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <div className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Access-Token:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 font-bold font-mono text-green-700 text-sm dark:bg-gray-800 dark:text-green-400">{createdToken}</code>
                <Button
                  intent={copied ? 'success' : 'secondary'}
                  appearance="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  aria-label={copied ? 'Token kopiert' : 'Token kopieren'}
                  className="flex-shrink-0"
                >
                  {copied ? <PiCheck className="h-5 w-5" /> : <PiCopy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Bestaetigung: Token gesichert */}
            <div className="border-gray-200 border-t pt-4 dark:border-gray-700">
              <label htmlFor="token-confirmed" className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={confirmed} onChange={setConfirmed} id="token-confirmed" name="token-confirmed" className="mt-0.5" />
                <span className={cn('select-none text-sm', confirmed ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300')}>
                  Ich habe den Token sicher gespeichert und verstehe, dass er nicht erneut angezeigt werden kann.
                </span>
              </label>
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose} disabled={!confirmed} intent={confirmed ? 'primary' : 'secondary'}>
            {confirmed ? 'Schliessen' : 'Bitte Token sichern'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    );
  }

  // Form View: Token erstellen
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-primary-500" />
          <span>Neues Access-Token erstellen</span>
        </div>
      </Dialog.Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            {/* Info-Hinweis */}
            <p className="text-gray-600 text-sm dark:text-gray-400">
              Access-Tokens werden verwendet, um Anwendungen sicheren Zugriff auf den Server zu gewaehren. Geben Sie einen aussagekraeftigen Namen an.
            </p>

            {/* Name Input */}
            <form.Field name="name">
              {(field) => (
                <FormField
                  label="Token-Name"
                  error={field.state.meta.errors[0]}
                  required
                  htmlFor="create-token-name"
                  helperText={!field.state.meta.errors.length ? '3-50 Zeichen, z.B. "Produktiv-App" oder "Test-Umgebung"' : undefined}
                >
                  <Input
                    id="create-token-name"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Produktiv-Anwendung"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                    autoFocus
                    autoComplete="off"
                    maxLength={50}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Mutation Error */}
            {createMutation.isError && (
              <Alert status="error">
                <p className="text-sm">Das Token konnte nicht erstellt werden. Bitte versuchen Sie es erneut.</p>
              </Alert>
            )}
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={createMutation.isPending}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || createMutation.isPending} loading={createMutation.isPending || isFormSubmitting}>
                Token erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
