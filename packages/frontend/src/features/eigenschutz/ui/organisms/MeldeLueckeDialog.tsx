import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useMeldeLuecke } from '../../api/queries';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

const MAX_NOTIZ_LENGTH = 1000;
const COUNTER_WARNING_THRESHOLD = 900;

export interface MeldeLueckeDialogOpenProps {
  readonly propagationGroupId: string;
  readonly einheitId: string;
  readonly einheitName: string;
  /** Vor-Belegung aus `useEquipmentChecklistState.missingItemsFor` (Story 3.5). */
  readonly vorbereiteteNotiz: string;
}

export interface MeldeLueckeDialogProps {
  readonly einsatzId: string;
  /** `null` = Dialog geschlossen. */
  readonly open: MeldeLueckeDialogOpenProps | null;
  readonly onClose: () => void;
  /**
   * Wird NACH erfolgreicher Mutation aufgerufen — Aufrufer kann lokalen
   * State zurücksetzen (z. B. Banner-Dismiss + Drawer-Close).
   */
  readonly onSuccess: (input: { propagationGroupId: string; einheitId: string }) => void;
}

/**
 * Inline-Dialog für die Meldung einer Ausrüstungs-Lücke (Story 3.6 AC11).
 *
 * **UX-Anker:** UX-Spec Z. 852 verlangt einen Inline-Dialog statt einer
 * klassischen Modal-Box. Im Repo wird das durch `Dialog` mit
 * `closeOnClickOutside`-Backdrop realisiert (gleiches Pattern wie der
 * Sicherheitsregel-Drawer).
 *
 * **Anatomy:**
 * - Headline mit Einheits-Name.
 * - Read-Only-Hinweis-Text.
 * - `<textarea>` (vor-belegt aus Story 3.5 `missingItemsFor`), 1–1000 Zeichen,
 *   Zeichen-Counter, `aria-required`.
 * - Footer: „Senden" (Primary, disabled bei leerer Notiz oder pending) +
 *   „Abbrechen" (Secondary).
 *
 * **Tastatur** (Epic-AC „Enter schickt ab" + Multi-Line-Native-Konvention,
 * Q9-Default): `Cmd/Ctrl + Enter` schickt ab — `Enter` allein bleibt für
 * Zeilenumbruch (sonst wäre eine 1000-Zeichen-Mehrzeilen-Notiz unbedienbar).
 *
 * **Reduced-Motion** (UX-DR4): respektiert `prefers-reduced-motion: reduce`.
 *
 * **Zero-Toast** (UX-DR21): Mutation-Fehler werden inline gerendert (kein
 * Sonner). Container trägt `data-luecke-error="true"` als Test-Marker.
 */
export function MeldeLueckeDialog({ einsatzId, open, onClose, onSuccess }: MeldeLueckeDialogProps) {
  const reducedMotion = useReducedMotion();
  const meldeLuecke = useMeldeLuecke(einsatzId);
  const [notiz, setNotiz] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const labelId = useId();
  const helpId = useId();

  // Re-Open setzt den State auf die vorbereitete Notiz; Schließen leert ihn.
  // Dependency-Liste zieht stabile Primitives, damit ein Parent-Re-Render mit
  // neuem aber äquivalentem `open`-Object den getippten Notiz-Inhalt nicht
  // resettet (Code-Review-Patch).
  const propagationGroupId = open?.propagationGroupId;
  const einheitId = open?.einheitId;
  const vorbereiteteNotiz = open?.vorbereiteteNotiz ?? '';
  useEffect(() => {
    if (propagationGroupId && einheitId) {
      setNotiz(vorbereiteteNotiz);
    } else {
      setNotiz('');
    }
    setSubmitError(null);
    setTruncated(false);
    // `vorbereiteteNotiz` bewusst NICHT in der Dep-Liste — der Reset ist
    // identitätsbasiert (Group + Einheit), nicht inhaltsbasiert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propagationGroupId, einheitId]);

  const isPending = meldeLuecke.isPending;
  const trimmedLength = notiz.trim().length;
  const isSubmitDisabled = trimmedLength === 0 || isPending;

  const submit = useCallback(async () => {
    if (open === null) return;
    const trimmed = notiz.trim();
    if (trimmed.length === 0) return;
    setSubmitError(null);
    try {
      await meldeLuecke.mutateAsync({
        propagationGroupId: open.propagationGroupId,
        einheitId: open.einheitId,
        meldung: trimmed,
      });
      onSuccess({ propagationGroupId: open.propagationGroupId, einheitId: open.einheitId });
      onClose();
    } catch (error) {
      // UX-DR21 Zero-Toast: Inline-Fehler im Dialog rendern. Differenzierung
      // nach HTTP-Status, damit der User die Ursache erkennt.
      const status = (error as { response?: { status?: number }; status?: number })?.response?.status ?? (error as { status?: number })?.status;
      if (status === 404) {
        setSubmitError('Diese Bekanntgabe ist nicht mehr offen — bitte aktualisieren.');
      } else if (status === 422) {
        setSubmitError('Berechtigung oder Konsistenz-Prüfung fehlgeschlagen — bitte Eingabe prüfen.');
      } else {
        setSubmitError('Lücken-Meldung fehlgeschlagen — bitte erneut versuchen.');
      }
    }
  }, [open, notiz, meldeLuecke, onSuccess, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Q9: `Cmd/Ctrl + Enter` triggert Submit (Slack/GitHub-PR-Editor-Pattern
      // für Mehrzeilen-Inputs). `Enter` allein bleibt für Zeilenumbruch.
      // IME-Composition (Dead-Key-Eingabe) darf NICHT abschicken.
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isSubmitDisabled) {
          void submit();
        }
      }
    },
    [submit, isSubmitDisabled],
  );

  const handleNotizChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const sliced = raw.slice(0, MAX_NOTIZ_LENGTH);
    setNotiz(sliced);
    if (raw.length > MAX_NOTIZ_LENGTH) {
      setTruncated(true);
    }
  }, []);

  if (open === null) return null;

  return (
    <Dialog isOpen={true} onClose={onClose} size="md" closeOnEscape={!isPending} closeOnClickOutside={!isPending} initialFocus={textareaRef as React.RefObject<HTMLElement>}>
      <div data-testid="melde-luecke-dialog" data-luecke-error={submitError !== null ? 'true' : undefined} data-reduced-motion={reducedMotion ? 'true' : 'false'} className="flex flex-col gap-4">
        <Dialog.Title className="text-lg">{`Ausrüstungs-Lücke melden — Einheit ${open.einheitName}`}</Dialog.Title>
        <Dialog.Body className="space-y-3">
          <p id={helpId} className="text-sm text-text-muted">
            Diese Rückmeldung erreicht den Sicherheitsbeauftragten direkt und ersetzt die Quittung. Die Bekanntgabe bleibt bis zur Klärung als „Lücke gemeldet" markiert.
          </p>
          <div className="flex flex-col gap-1">
            <label id={labelId} htmlFor="melde-luecke-textarea" className="text-sm font-medium text-text-primary">
              Beschreibung der Lücke
            </label>
            <textarea
              id="melde-luecke-textarea"
              ref={textareaRef}
              data-testid="melde-luecke-textarea"
              rows={4}
              value={notiz}
              onChange={handleNotizChange}
              onKeyDown={handleKeyDown}
              placeholder="Schutzanzug Größe L fehlt Einheit 2 — nachgeordert 14:28"
              maxLength={MAX_NOTIZ_LENGTH}
              aria-labelledby={labelId}
              aria-describedby={helpId}
              aria-required="true"
              className="border-border-default bg-surface-base focus:border-border-focus w-full rounded-md border px-3 py-2 text-sm text-text-primary focus:outline-none"
              disabled={isPending}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Tipp: Cmd/Ctrl + Enter sendet die Meldung.</span>
              <span data-testid="melde-luecke-counter" className={`tabular-nums ${notiz.length > COUNTER_WARNING_THRESHOLD ? 'text-status-warning-text' : 'text-text-muted'}`}>
                {notiz.length}/{MAX_NOTIZ_LENGTH}
              </span>
            </div>
            {truncated && (
              <p data-testid="melde-luecke-truncated" className="text-xs text-status-warning-text">
                Eingabe wurde auf {MAX_NOTIZ_LENGTH} Zeichen gekürzt.
              </p>
            )}
          </div>
          {submitError !== null && (
            <p data-testid="melde-luecke-error-text" role="alert" className="bg-status-danger-bg rounded-md border border-status-danger-border px-3 py-2 text-sm text-status-danger-text">
              {submitError}
            </p>
          )}
        </Dialog.Body>
        <Dialog.Footer loading={isPending}>
          <Button data-testid="melde-luecke-cancel" intent="secondary" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button data-testid="melde-luecke-submit" intent="primary" onClick={() => void submit()} disabled={isSubmitDisabled}>
            Senden
          </Button>
        </Dialog.Footer>
      </div>
    </Dialog>
  );
}
