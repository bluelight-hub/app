import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useEffect, useState } from 'react';
import { PiCheck, PiCopy, PiKey, PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';
import { useCreateAccessToken } from '@/features/admin/api/use-access-token-management';
import { tokenCreationSchema } from '@/features/admin/schemas/token-creation.schema';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

interface TokenCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenCreated?: () => void;
}

export const TokenCreationModal = ({ isOpen, onClose, onTokenCreated }: TokenCreationModalProps) => {
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

  useEffect(() => {
    if (!isOpen) {
      setCreatedToken(null);
      setCreatedTokenName(null);
      setShowToken(false);
      setConfirmed(false);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const handleCopyToken = useCallback(async () => {
    if (!createdToken) {
      return;
    }

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
  }, [createdToken]);

  const handleClose = useCallback(() => {
    if (!showToken || confirmed) {
      form.reset();
      setShowToken(false);
      setCreatedToken(null);
      setCreatedTokenName(null);
      setConfirmed(false);
      setCopied(false);
      onClose();
    }
  }, [confirmed, form, onClose, showToken]);

  const canClose = !showToken || confirmed;

  if (showToken && createdToken) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} closeOnEscape={canClose} closeOnClickOutside={canClose}>
        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-status-success-text" aria-hidden="true" />
            <span>Token erstellt</span>
          </div>
        </Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            <Alert status="warning" icon={<PiWarning className="h-5 w-5" aria-hidden="true" />}>
              <div className="space-y-1">
                <p className="font-medium">Dieser Token wird nur einmal angezeigt!</p>
                <p className="text-sm opacity-90">Kopieren Sie ihn jetzt und speichern Sie ihn sicher. Er kann später nicht mehr abgerufen werden.</p>
              </div>
            </Alert>

            <div className="text-sm text-text-secondary">
              Token-Name: <span className="font-medium text-text-primary">{createdTokenName}</span>
            </div>

            <div className="rounded-panel border-2 border-status-success-border bg-status-success-surface p-4">
              <div className="mb-2 font-medium text-sm text-text-secondary">Access-Token:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-control bg-surface-panel px-3 py-2 font-bold font-mono text-sm text-status-success-text">{createdToken}</code>
                <Button
                  intent={copied ? 'success' : 'secondary'}
                  appearance="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  aria-label={copied ? 'Token kopiert' : 'Token kopieren'}
                  className="flex-shrink-0"
                >
                  {copied ? <PiCheck className="h-5 w-5" aria-hidden="true" /> : <PiCopy className="h-5 w-5" aria-hidden="true" />}
                </Button>
                {copied && (
                  <output className="sr-only" aria-live="polite">
                    Token wurde in die Zwischenablage kopiert
                  </output>
                )}
              </div>
            </div>

            <div className="border-border-subtle border-t pt-4">
              <label htmlFor="token-confirmed" className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={confirmed} onChange={setConfirmed} id="token-confirmed" name="token-confirmed" className="mt-0.5" />
                <span className={cn('select-none text-sm', confirmed ? 'text-status-success-text' : 'text-text-secondary')}>
                  Ich habe den Token sicher gespeichert und verstehe, dass er nicht erneut angezeigt werden kann.
                </span>
              </label>
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose} disabled={!confirmed} intent={confirmed ? 'primary' : 'secondary'}>
            {confirmed ? 'Schließen' : 'Bitte Token sichern'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-action-primary" aria-hidden="true" />
          <span>Neues Access-Token erstellen</span>
        </div>
      </Dialog.Title>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Access-Tokens werden verwendet, um Anwendungen sicheren Zugriff auf den Server zu gewähren. Geben Sie einen aussagekräftigen Namen an.</p>

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
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="z.B. Produktiv-Anwendung"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                    autoFocus
                    autoComplete="off"
                    maxLength={50}
                    disabled={createMutation.isPending}
                  />
                </FormField>
              )}
            </form.Field>

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
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
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
