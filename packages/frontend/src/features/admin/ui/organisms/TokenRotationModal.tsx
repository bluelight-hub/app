import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useState, useCallback, useEffect } from 'react';
import { PiCheck, PiCopy, PiWarning, PiArrowsClockwise } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

import { useRotateAccessToken } from '@/features/admin/api/use-access-token-management';
import { tokenRotationSchema } from '@/features/admin/schemas/token-rotation.schema';

interface TokenRotationModalProps {
  /** Ob der Dialog geoeffnet ist */
  isOpen: boolean;
  /** Callback zum Schliessen des Dialogs */
  onClose: () => void;
  /** Token das rotiert werden soll */
  tokenToRotate: {
    id: string;
    name: string | null;
    prefix: string;
    /** Letzter Nutzungszeitpunkt fuer Warnung bei kuerzlich verwendeten Tokens */
    lastUsedAt?: Date | string | null;
  } | null;
  /** Optionaler Callback nach erfolgreicher Token-Rotation */
  onTokenRotated?: () => void;
}

/**
 * Modal zur Rotation eines Server-Access-Tokens.
 *
 * Ermoeglicht die sichere Rotation eines bestehenden Tokens:
 * - Das alte Token wird sofort ungueltig
 * - Ein neues Token mit optionalem neuen Namen wird generiert
 * - Das neue Token wird einmalig angezeigt mit Copy-to-Clipboard Funktion
 * - Bestaetigungspflicht bevor das Modal geschlossen werden kann
 *
 * Das neue Token kann NICHT erneut abgerufen werden - nur hier sichtbar!
 */
export const TokenRotationModal = ({ isOpen, onClose, tokenToRotate, onTokenRotated }: TokenRotationModalProps) => {
  // State fuer den Erfolgs-Bildschirm
  const [showToken, setShowToken] = useState(false);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [rotatedTokenName, setRotatedTokenName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const rotateMutation = useRotateAccessToken();

  // Prueft ob das Token in den letzten 24 Stunden verwendet wurde
  const isRecentlyUsed = tokenToRotate?.lastUsedAt ? Date.now() - new Date(String(tokenToRotate.lastUsedAt)).getTime() < 24 * 60 * 60 * 1000 : false;

  const form = useForm({
    defaultValues: { newName: tokenToRotate?.name ?? '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: tokenRotationSchema,
    },
    onSubmit: async ({ value }) => {
      if (!tokenToRotate) return;

      // Leere Strings zu undefined transformieren
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
            // Type Guard: API-Response hat `name` als `object | null`, erwarte aber `string | null`
            const tokenName = response.data.name;
            setRotatedTokenName(typeof tokenName === 'string' ? tokenName : null);
            setShowToken(true);
            onTokenRotated?.();
          },
        },
      );
    },
  });

  // Reset Form wenn tokenToRotate sich aendert
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally only re-run when token ID changes, not the entire object
  useEffect(() => {
    if (tokenToRotate && isOpen) {
      form.reset();
      form.setFieldValue('newName', tokenToRotate.name ?? '');
    }
  }, [tokenToRotate?.id, isOpen]); // Nur bei Token-Wechsel oder Modal-Oeffnen

  // Reset State nur wenn Modal geschlossen wird
  useEffect(() => {
    if (!isOpen) {
      setRotatedToken(null);
      setRotatedTokenName(null);
      setShowToken(false);
      setConfirmed(false);
      setCopied(false);
    }
  }, [isOpen]);

  // Reset Copied-State nach Timeout
  useEffect(() => {
    if (copied) {
      const timeoutId = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copied]);

  const handleCopyToken = useCallback(async () => {
    if (rotatedToken) {
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
    }
  }, [rotatedToken]);

  const handleClose = useCallback(() => {
    // Nur schliessen wenn nicht im Success-State oder wenn bestaetigt
    if (!showToken || confirmed) {
      form.reset();
      setShowToken(false);
      setRotatedToken(null);
      setRotatedTokenName(null);
      setConfirmed(false);
      setCopied(false);
      onClose();
    }
  }, [showToken, confirmed, form, onClose]);

  // Verhindere Schliessen durch Escape/Klick ausserhalb wenn Token angezeigt wird und nicht bestaetigt
  const canClose = !showToken || confirmed;

  // Success View: Neues Token-Anzeige mit Kopier-Funktion und Bestaetigung
  if (showToken && rotatedToken) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} closeOnEscape={canClose} closeOnClickOutside={canClose}>
        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiArrowsClockwise className="h-5 w-5 text-green-500" />
            <span>Token rotiert</span>
          </div>
        </Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            {/* Warnung: Token nur einmal sichtbar */}
            <Alert status="warning" icon={<PiWarning className="h-5 w-5" />}>
              <div className="space-y-1">
                <p className="font-medium">Das neue Token wird nur einmal angezeigt!</p>
                <p className="text-sm opacity-90">Kopieren Sie es jetzt und speichern Sie es sicher. Das alte Token ist ab sofort ungueltig.</p>
              </div>
            </Alert>

            {/* Token-Name */}
            <div className="text-gray-600 text-sm dark:text-gray-400">
              Token-Name: <span className="font-medium text-gray-900 dark:text-white">{rotatedTokenName ?? 'Kein Name'}</span>
            </div>

            {/* Token-Anzeige mit Copy-Button */}
            {/* biome-ignore lint/a11y/useSemanticElements: div with role="status" is intentional for live region styling */}
            <div role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <div className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Neues Access-Token:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 font-bold font-mono text-green-700 text-sm dark:bg-gray-800 dark:text-green-400">{rotatedToken}</code>
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
                {/* Screen Reader Announcement fuer Kopier-Aktion */}
                {copied && (
                  <output className="sr-only" aria-live="polite">
                    Neues Token wurde in die Zwischenablage kopiert
                  </output>
                )}
              </div>
            </div>

            {/* Bestaetigung: Token gesichert */}
            <div className="border-gray-200 border-t pt-4 dark:border-gray-700">
              <label htmlFor="token-rotation-confirmed" className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={confirmed} onChange={setConfirmed} id="token-rotation-confirmed" name="token-rotation-confirmed" className="mt-0.5" />
                <span className={cn('select-none text-sm', confirmed ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300')}>
                  Ich habe das neue Token sicher gespeichert und verstehe, dass es nicht erneut angezeigt werden kann.
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

  // Form View: Token rotieren
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2">
          <PiArrowsClockwise className="h-5 w-5 text-primary-500" />
          <span>Access-Token rotieren</span>
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
            {/* Warnung: Altes Token wird ungueltig - verstaerkte Warnung bei kuerzlich genutztem Token */}
            <Alert status={isRecentlyUsed ? 'error' : 'warning'} icon={<PiWarning className="h-5 w-5" />}>
              <div className="space-y-1">
                <p className="font-medium">{isRecentlyUsed ? 'ACHTUNG: Dieses Token wurde kuerzlich verwendet!' : 'Das alte Token wird sofort ungueltig!'}</p>
                <p className="text-sm opacity-90">
                  {isRecentlyUsed ? 'Aktive Verbindungen werden SOFORT getrennt!' : 'Ein neues Token wird generiert. Alle Anwendungen, die das alte Token verwenden, verlieren sofort den Zugriff.'}
                </p>
              </div>
            </Alert>

            {/* Loading-Visualisierung waehrend API-Call */}
            {rotateMutation.isPending && (
              <Alert status="info">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  <p className="text-sm">Token wird rotiert, bitte warten...</p>
                </div>
              </Alert>
            )}

            {/* Aktuelles Token Info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-gray-500 text-xs dark:text-gray-400">Aktuelles Token</div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{tokenToRotate?.name ?? 'Kein Name'}</span>
                <code className="text-gray-500 text-sm dark:text-gray-400">({tokenToRotate?.prefix}...)</code>
              </div>
            </div>

            {/* Name Input */}
            <form.Field name="newName">
              {(field) => (
                <FormField
                  label="Neuer Token-Name"
                  error={field.state.meta.errors[0]}
                  htmlFor="rotate-token-name"
                  helperText={!field.state.meta.errors.length ? 'Optional. 3-50 Zeichen. Leer lassen um den alten Namen zu behalten.' : undefined}
                >
                  <Input
                    id="rotate-token-name"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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

            {/* Mutation Error */}
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
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
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
