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
        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
          <PiStopCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <Dialog.Title>Wiederkehrende Serie beenden?</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="flex items-start gap-2 text-amber-800 text-sm dark:text-amber-300">
              <PiRepeat className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Zukuenftige Erinnerungen dieser Serie werden nicht mehr automatisch erstellt.</span>
            </p>
          </div>

          {/* Erinnerung-Details */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="w-28 flex-shrink-0 text-gray-500 dark:text-gray-400">Titel:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{erinnerung.titel}</dd>
              </div>
              {erinnerung.recurringIntervalMinutes && (
                <div className="flex">
                  <dt className="w-28 flex-shrink-0 text-gray-500 dark:text-gray-400">Intervall:</dt>
                  <dd className="text-gray-700 dark:text-gray-300">Alle {erinnerung.recurringIntervalMinutes} Min</dd>
                </div>
              )}
              {(erinnerung.recurringCurrentCount as unknown as number) > 0 && (
                <div className="flex">
                  <dt className="w-28 flex-shrink-0 text-gray-500 dark:text-gray-400">Instanzen:</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{erinnerung.recurringCurrentCount as unknown as number} erstellt</dd>
                </div>
              )}
            </dl>
          </div>

          {/* AC2: Checkbox fuer aktuelle Instanz abbrechen */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="checkbox"
              checked={cancelCurrent}
              onChange={(e) => setCancelCurrent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              disabled={isPending}
            />
            <div>
              <span className="font-medium text-gray-900 text-sm dark:text-white">Auch die aktuelle aktive Instanz abbrechen</span>
              <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">Falls eine Instanz gerade aktiv ist (geplant/ausgeloest), wird sie ebenfalls beendet.</p>
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
