import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useEffect, useState } from 'react';
import { PiArrowsClockwise, PiCheck, PiCopy, PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';
import { useRotateAccessToken } from '@/features/admin/api/use-access-token-management';
import { tokenRotationSchema } from '@/features/admin/schemas/token-rotation.schema';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

interface TokenRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenToRotate: {
    id: string;
    name: string | null;
    prefix: string;
    lastUsedAt?: Date | string | null;
  } | null;
  onTokenRotated?: () => void;
}

export const TokenRotationModal = ({ isOpen, onClose, tokenToRotate, onTokenRotated }: TokenRotationModalProps) => {
  const [showToken, setShowToken] = useState(false);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [rotatedTokenName, setRotatedTokenName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const rotateMutation = useRotateAccessToken();

  const isRecentlyUsed = tokenToRotate?.lastUsedAt ? Date.now() - new Date(String(tokenToRotate.lastUsedAt)).getTime() < 24 * 60 * 60 * 1000 : false;

  const form = useForm({
    defaultValues: { newName: tokenToRotate?.name ?? '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: tokenRotationSchema,
    },
    onSubmit: async ({ value }) => {
      if (!tokenToRotate) {
        return;
      }

      const trimmedName = value.newName?.trim();
      const newName = trimmedName && trimmedName.length > 0 ? trimmedName : undefined;

      rotateMutation.mutate(
        {
          tokenId: tokenToRotate.id,
          newName,
        },
        {
          onSuccess: (response) => {
            setRotatedToken(response.data.token);
            const tokenName = response.data.name;
            setRotatedTokenName(typeof tokenName === 'string' ? tokenName : null);
            setShowToken(true);
            onTokenRotated?.();
          },
        },
      );
    },
  });

  const tokenToRotateId = tokenToRotate?.id;
  const tokenToRotateName = tokenToRotate?.name;

  useEffect(() => {
    if (tokenToRotateId && isOpen) {
      form.reset();
      form.setFieldValue('newName', tokenToRotateName ?? '');
    }
  }, [form, isOpen, tokenToRotateId, tokenToRotateName]); // Nur bei Token-Wechsel oder Modal-Öffnen

  useEffect(() => {
    if (!isOpen) {
      setRotatedToken(null);
      setRotatedTokenName(null);
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
    if (!rotatedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rotatedToken);
      setCopied(true);
      toast.success('Token kopiert', {
        description: 'Das neue Token wurde in die Zwischenablage kopiert.',
      });
    } catch (_error) {
      toast.error('Fehler beim Kopieren', {
        description: 'Das Token konnte nicht kopiert werden. Bitte manuell markieren und kopieren.',
      });
    }
  }, [rotatedToken]);

  const handleClose = useCallback(() => {
    if (!showToken || confirmed) {
      form.reset();
      setShowToken(false);
      setRotatedToken(null);
      setRotatedTokenName(null);
      setConfirmed(false);
      setCopied(false);
      onClose();
    }
  }, [confirmed, form, onClose, showToken]);

  const canClose = !showToken || confirmed;

  if (showToken && rotatedToken) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} closeOnEscape={canClose} closeOnClickOutside={canClose}>
        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiArrowsClockwise className="h-5 w-5 text-status-success-text" aria-hidden="true" />
            <span>Token rotiert</span>
          </div>
        </Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            <Alert status="warning" icon={<PiWarning className="h-5 w-5" aria-hidden="true" />}>
              <div className="space-y-1">
                <p className="font-medium">Das neue Token wird nur einmal angezeigt!</p>
                <p className="text-sm opacity-90">Kopieren Sie es jetzt und speichern Sie es sicher. Das alte Token ist ab sofort ungültig.</p>
              </div>
            </Alert>

            <div className="text-sm text-text-secondary">
              Token-Name: <span className="font-medium text-text-primary">{rotatedTokenName ?? 'Kein Name'}</span>
            </div>

            <div role="status" aria-live="polite" aria-atomic="true" className="rounded-panel border-2 border-status-success-border bg-status-success-surface p-4">
              <div className="mb-2 font-medium text-sm text-text-secondary">Neues Access-Token:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-control bg-surface-panel px-3 py-2 font-bold font-mono text-sm text-status-success-text">{rotatedToken}</code>
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
                    Neues Token wurde in die Zwischenablage kopiert
                  </output>
                )}
              </div>
            </div>

            <div className="border-border-subtle border-t pt-4">
              <label htmlFor="token-rotation-confirmed" className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={confirmed} onChange={setConfirmed} id="token-rotation-confirmed" name="token-rotation-confirmed" className="mt-0.5" />
                <span className={cn('select-none text-sm', confirmed ? 'text-status-success-text' : 'text-text-secondary')}>
                  Ich habe das neue Token sicher gespeichert und verstehe, dass es nicht erneut angezeigt werden kann.
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
          <PiArrowsClockwise className="h-5 w-5 text-action-primary" aria-hidden="true" />
          <span>Access-Token rotieren</span>
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
            <Alert status={isRecentlyUsed ? 'error' : 'warning'} icon={<PiWarning className="h-5 w-5" aria-hidden="true" />}>
              <div className="space-y-1">
                <p className="font-medium">{isRecentlyUsed ? 'ACHTUNG: Dieses Token wurde kürzlich verwendet!' : 'Das alte Token wird sofort ungültig!'}</p>
                <p className="text-sm opacity-90">
                  {isRecentlyUsed ? 'Aktive Verbindungen werden SOFORT getrennt!' : 'Ein neues Token wird generiert. Alle Anwendungen, die das alte Token verwenden, verlieren sofort den Zugriff.'}
                </p>
              </div>
            </Alert>

            {rotateMutation.isPending && (
              <Alert status="info">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-action-primary border-t-transparent" />
                  <p className="text-sm">Token wird rotiert, bitte warten...</p>
                </div>
              </Alert>
            )}

            <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
              <div className="text-text-muted text-xs">Aktuelles Token</div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{tokenToRotate?.name ?? 'Kein Name'}</span>
                <code className="text-sm text-text-muted">({tokenToRotate?.prefix}...)</code>
              </div>
            </div>

            <form.Field name="newName">
              {(field) => (
                <FormField
                  label="Neuer Token-Name"
                  error={field.state.meta.errors[0]}
                  htmlFor="rotate-token-name"
                  helperText={!field.state.meta.errors.length ? 'Optional. 3-50 Zeichen. Leer lassen, um den alten Namen zu behalten.' : undefined}
                >
                  <Input
                    id="rotate-token-name"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder={tokenToRotate?.name ?? 'z.B. Produktiv-Anwendung'}
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                    autoFocus
                    autoComplete="off"
                    maxLength={50}
                    disabled={rotateMutation.isPending}
                  />
                </FormField>
              )}
            </form.Field>

            {rotateMutation.isError && (
              <Alert status="error">
                <p className="text-sm">Das Token konnte nicht rotiert werden. Bitte versuchen Sie es erneut.</p>
              </Alert>
            )}
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={rotateMutation.isPending}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" intent="primary" disabled={!canSubmit || isFormSubmitting || rotateMutation.isPending} loading={rotateMutation.isPending || isFormSubmitting}>
                Token rotieren
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
