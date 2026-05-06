/**
 * AufloeseSicherungspostenDialog — destructive Confirmation-Dialog
 * (Story 4.1, T6, UX-DR27).
 *
 * Pflicht-Begründungs-Textarea (1–2000 Zeichen, Live-Counter), roter
 * Bestätigungs-Button. 422-`BusinessRule:BereitsAufgeloest` rendert eine
 * spezifische Banner-Meldung und schließt nicht automatisch — der User
 * sieht den Hinweis und schließt manuell.
 *
 * Open-State steuert die Page (`posten === null` ⇒ `isOpen=false`).
 */

import { useEffect, useState } from 'react';
import type { SicherungspostenDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useAufloeseSicherungsposten } from '../../api/use-sicherungsposten';
import { aufloeseFormSchema } from '../../schemas/sicherungsposten.schema';

export interface AufloeseSicherungspostenDialogProps {
  readonly einsatzId: string;
  readonly posten: SicherungspostenDto | null;
  readonly onClose: () => void;
}

const BEGRUENDUNG_MAX = 2000;

/**
 * Erkennt anhand des Body-Codes, ob das Backend den Posten bereits als
 * aufgelöst meldet (Sentinel `BusinessRule:BereitsAufgeloest`).
 *
 * Prüft drei mögliche Sentinel-Träger im Response-Body:
 * - `code` (Result-Pattern-Sentinel des Domain-Layers)
 * - `message` (Standard-NestJS HttpException-Body)
 * - `context.rule` (zusätzliches strukturiertes Feld bei 422-Fällen)
 */
function isBereitsAufgeloest(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return false;
  const code = (data as { code?: unknown }).code;
  const message = (data as { message?: unknown }).message;
  const context = (data as { context?: unknown }).context;
  if (typeof code === 'string' && code.includes('BereitsAufgeloest')) return true;
  if (typeof message === 'string' && message.includes('BereitsAufgeloest')) return true;
  if (context && typeof context === 'object') {
    const rule = (context as { rule?: unknown }).rule;
    if (typeof rule === 'string' && rule === 'BereitsAufgeloest') return true;
  }
  return false;
}

export function AufloeseSicherungspostenDialog({ einsatzId, posten, onClose }: AufloeseSicherungspostenDialogProps) {
  const aufloesenMutation = useAufloeseSicherungsposten(einsatzId);
  const [begruendung, setBegruendung] = useState('');
  const [bereitsAufgeloest, setBereitsAufgeloest] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (posten) {
      setBegruendung('');
      setBereitsAufgeloest(false);
      setInlineError(null);
    }
    // `posten?.version` zusätzlich zu `id`: Cache-Refresh oder konkurrierende
    // Mutation führen zu einem neuen Version-Stand desselben Postens — der
    // Dialog muss dann neu starten, damit die nächste Auflösung mit der
    // aktuellen `expectedVersion` läuft.
  }, [posten?.id, posten?.version]);

  const open = posten !== null;

  const trimmed = begruendung.trim();
  const parseResult = aufloeseFormSchema.safeParse({ begruendung: trimmed });
  const isValid = parseResult.success;

  const handleConfirm = async () => {
    if (!posten || !isValid) return;
    try {
      await aufloesenMutation.mutateAsync({
        postenId: posten.id,
        body: { expectedVersion: posten.version, begruendung: trimmed },
      });
      onClose();
    } catch (error) {
      if (isBereitsAufgeloest(error)) {
        setBereitsAufgeloest(true);
        return;
      }
      setInlineError('Auflösen fehlgeschlagen. Bitte erneut versuchen.');
    }
  };

  const handleClose = () => {
    setBegruendung('');
    setBereitsAufgeloest(false);
    setInlineError(null);
    onClose();
  };

  return (
    <Dialog isOpen={open} onClose={handleClose} size="md">
      <Dialog.Title>Sicherungsposten auflösen</Dialog.Title>
      <Dialog.Body>
        <div className="space-y-3" data-testid="aufloese-dialog">
          <p className="text-sm text-text-secondary">Diese Aktion kann nicht rückgängig gemacht werden. Bitte begründe die Auflösung — die Eingabe wird in der Versionshistorie persistiert.</p>

          <label htmlFor="aufloese-dialog-begruendung" className="block text-sm">
            <span className="block font-medium text-text-primary">
              Begründung <span className="text-status-danger-text">*</span>
            </span>
            <Textarea
              id="aufloese-dialog-begruendung"
              value={begruendung}
              onChange={(event) => setBegruendung(event.target.value)}
              maxLength={BEGRUENDUNG_MAX}
              data-testid="aufloese-dialog-begruendung"
              className="mt-1"
              aria-describedby="aufloese-dialog-begruendung-counter"
            />
            <span id="aufloese-dialog-begruendung-counter" className="mt-1 block text-xs text-text-muted" data-testid="aufloese-dialog-begruendung-counter">
              {trimmed.length} / {BEGRUENDUNG_MAX} Zeichen
            </span>
          </label>

          {bereitsAufgeloest ? (
            <p
              role="alert"
              data-testid="aufloese-dialog-bereits-aufgeloest"
              className="rounded-control border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text"
            >
              Posten wurde bereits aufgelöst.
            </p>
          ) : null}

          {inlineError ? (
            <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
              {inlineError}
            </p>
          ) : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer loading={aufloesenMutation.isPending}>
        <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose} data-testid="aufloese-dialog-cancel">
          Abbrechen
        </Button>
        <Button
          intent="danger"
          type="button"
          onClick={handleConfirm}
          disabled={!isValid || aufloesenMutation.isPending || bereitsAufgeloest}
          loading={aufloesenMutation.isPending}
          data-testid="aufloese-dialog-confirm"
        >
          Posten auflösen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
