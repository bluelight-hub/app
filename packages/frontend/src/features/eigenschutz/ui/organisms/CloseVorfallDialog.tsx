/**
 * CloseVorfallDialog — Confirmation-Dialog für das Schließen eines Vorfalls
 * (Issue #415).
 *
 * Optional-Begründungs-Textarea (max 500 Zeichen, Live-Counter). Anders als
 * `AufloeseSicherungspostenDialog` ist die Begründung NICHT Pflicht — der
 * Sicherheitsbeauftragte kann den Vorfall direkt als „abgearbeitet" markieren.
 * 422-`BusinessRule:VorfallBereitsGeschlossen` rendert eine spezifische
 * Banner-Meldung (z. B. bei konkurrierender Schließung in anderem Tab).
 *
 * Open-State steuert die DetailPage (`open=true` ⇒ Dialog sichtbar).
 */

import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useCloseVorfall } from '../../api/use-close-vorfall';

export interface CloseVorfallDialogProps {
  readonly einsatzId: string;
  readonly vorfallId: string | null;
  readonly onClose: () => void;
  readonly onClosed?: () => void;
}

const BEGRUENDUNG_MAX = 500;

/**
 * Erkennt anhand des Body-Codes, ob das Backend den Vorfall bereits als
 * geschlossen meldet (Sentinel `BusinessRule:VorfallBereitsGeschlossen`).
 */
function isBereitsGeschlossen(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return false;
  const code = (data as { code?: unknown }).code;
  const message = (data as { message?: unknown }).message;
  const context = (data as { context?: unknown }).context;
  if (typeof code === 'string' && code.includes('VorfallBereitsGeschlossen')) return true;
  if (typeof message === 'string' && message.includes('VorfallBereitsGeschlossen')) return true;
  if (context && typeof context === 'object') {
    const rule = (context as { rule?: unknown }).rule;
    if (typeof rule === 'string' && rule === 'VorfallBereitsGeschlossen') return true;
  }
  return false;
}

export function CloseVorfallDialog({ einsatzId, vorfallId, onClose, onClosed }: CloseVorfallDialogProps) {
  const closeMutation = useCloseVorfall(einsatzId);
  const [begruendung, setBegruendung] = useState('');
  const [bereitsGeschlossen, setBereitsGeschlossen] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (vorfallId) {
      setBegruendung('');
      setBereitsGeschlossen(false);
      setInlineError(null);
    }
  }, [vorfallId]);

  const open = vorfallId !== null;
  const trimmed = begruendung.trim();
  const isValid = trimmed.length <= BEGRUENDUNG_MAX;

  const handleConfirm = async () => {
    if (!vorfallId || !isValid) return;
    try {
      await closeMutation.mutateAsync({
        vorfallId,
        body: trimmed.length === 0 ? {} : { begruendung: trimmed },
      });
      onClosed?.();
      onClose();
    } catch (error) {
      if (isBereitsGeschlossen(error)) {
        setBereitsGeschlossen(true);
        return;
      }
      setInlineError('Schließen fehlgeschlagen. Bitte erneut versuchen.');
    }
  };

  const handleClose = () => {
    setBegruendung('');
    setBereitsGeschlossen(false);
    setInlineError(null);
    onClose();
  };

  return (
    <Dialog isOpen={open} onClose={handleClose} size="md">
      <Dialog.Title>Vorfall schließen</Dialog.Title>
      <Dialog.Body>
        <div className="space-y-3" data-testid="close-vorfall-dialog">
          <p className="text-sm text-text-secondary">
            Das Schließen markiert den Vorfall als abgearbeitet und entfernt ihn aus der Ampel-Statistik der offenen Vorfälle. Das ursprüngliche Vorfall-Recording bleibt unverändert; die Schließung
            wird zusätzlich dokumentiert.
          </p>

          <label htmlFor="close-vorfall-begruendung" className="block text-sm">
            <span className="block font-medium text-text-primary">Begründung (optional)</span>
            <Textarea
              id="close-vorfall-begruendung"
              value={begruendung}
              onChange={(event) => setBegruendung(event.target.value)}
              maxLength={BEGRUENDUNG_MAX}
              data-testid="close-vorfall-begruendung"
              className="mt-1"
              aria-describedby="close-vorfall-begruendung-counter"
            />
            <span id="close-vorfall-begruendung-counter" className="mt-1 block text-xs text-text-muted" data-testid="close-vorfall-begruendung-counter">
              {trimmed.length} / {BEGRUENDUNG_MAX} Zeichen
            </span>
          </label>

          {bereitsGeschlossen ? (
            <p
              role="alert"
              data-testid="close-vorfall-bereits-geschlossen"
              className="rounded-control border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text"
            >
              Vorfall wurde bereits geschlossen — vermutlich von einem anderen Bearbeiter.
            </p>
          ) : null}

          {inlineError ? (
            <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
              {inlineError}
            </p>
          ) : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer loading={closeMutation.isPending} className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose} data-testid="close-vorfall-cancel">
          Abbrechen
        </Button>
        <Button
          intent="primary"
          type="button"
          onClick={handleConfirm}
          disabled={!isValid || closeMutation.isPending || bereitsGeschlossen}
          loading={closeMutation.isPending}
          data-testid="close-vorfall-confirm"
        >
          Vorfall schließen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
