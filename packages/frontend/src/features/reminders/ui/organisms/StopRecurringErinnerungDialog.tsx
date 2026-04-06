/**
 * StopRecurring Erinnerung Dialog
 *
 * **Story 6.5:** "Wiederkehrende Erinnerung stoppen"
 * AC1: Serie beenden (nur zukuenftige Instanzen)
 * AC2: Serie und aktuelle Instanz beenden
 */

import type { ErinnerungResponseDto } from '@/shared';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useCallback, useState } from 'react';
import { PiRepeat, PiStopCircle } from 'react-icons/pi';

import { useStopRecurringSeries } from '../../api';

interface StopRecurringErinnerungDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Die Erinnerung deren Serie gestoppt werden soll */
  erinnerung: ErinnerungResponseDto | null;
  /** Einsatz ID */
  einsatzId: string;
}

/**
 * Bestaetigungs-Dialog zum Stoppen einer wiederkehrenden Serie.
 *
 * **Story 6.5 AC1:** Serie beenden - keine weiteren Instanzen werden erstellt
 * **Story 6.5 AC2:** Optional: Auch die aktuelle aktive Instanz abbrechen
 */
export function StopRecurringErinnerungDialog({ isOpen, onClose, erinnerung, einsatzId }: StopRecurringErinnerungDialogProps) {
  const { mutate: stopRecurringSeries, isPending } = useStopRecurringSeries();
  const [cancelCurrent, setCancelCurrent] = useState(false);

  const handleStop = useCallback(() => {
    if (!erinnerung) return;

    stopRecurringSeries(
      {
        einsatzId,
        erinnerungId: erinnerung.id,
        cancelCurrent,
      },
      {
        onSuccess: () => {
          setCancelCurrent(false);
          onClose();
        },
      },
    );
  }, [erinnerung, einsatzId, cancelCurrent, stopRecurringSeries, onClose]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setCancelCurrent(false);
      onClose();
    }
  }, [isPending, onClose]);

  if (!erinnerung) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiStopCircle className="h-5 w-5 text-status-warning-text" />
        </div>
        <Dialog.Title>Wiederkehrende Serie beenden?</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-4">
          <div className="rounded-panel bg-status-warning-surface p-3">
            <p className="flex items-start gap-2 text-sm text-status-warning-text">
              <PiRepeat className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Zukuenftige Erinnerungen dieser Serie werden nicht mehr automatisch erstellt.</span>
            </p>
          </div>

          {/* Erinnerung-Details */}
          <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="w-28 flex-shrink-0 text-text-muted">Titel:</dt>
                <dd className="font-medium text-text-primary">{erinnerung.titel}</dd>
              </div>
              {erinnerung.recurringIntervalMinutes && (
                <div className="flex">
                  <dt className="w-28 flex-shrink-0 text-text-muted">Intervall:</dt>
                  <dd className="text-text-secondary">Alle {erinnerung.recurringIntervalMinutes} Min</dd>
                </div>
              )}
              {erinnerung.recurringCurrentCount > 0 && (
                <div className="flex">
                  <dt className="w-28 flex-shrink-0 text-text-muted">Instanzen:</dt>
                  <dd className="text-text-secondary">{erinnerung.recurringCurrentCount} erstellt</dd>
                </div>
              )}
            </dl>
          </div>

          {/* AC2: Checkbox fuer aktuelle Instanz abbrechen */}
          <label
            aria-label="Auch die aktuelle aktive Instanz abbrechen"
            className="flex cursor-pointer items-start gap-3 rounded-panel border border-border-subtle p-3 transition-colors hover:bg-action-secondary"
          >
            <input
              type="checkbox"
              checked={cancelCurrent}
              onChange={(e) => setCancelCurrent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-subtle text-status-warning-text focus-visible:shadow-focus-ring"
              disabled={isPending}
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Auch die aktuelle aktive Instanz abbrechen</span>
              <p className="mt-0.5 text-xs text-text-muted">Falls eine Instanz gerade aktiv ist (geplant/ausgeloest), wird sie ebenfalls beendet.</p>
            </div>
          </label>
        </div>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="warning" onClick={handleStop} loading={isPending}>
          <PiStopCircle className="mr-1.5 h-4 w-4" />
          Serie beenden
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
