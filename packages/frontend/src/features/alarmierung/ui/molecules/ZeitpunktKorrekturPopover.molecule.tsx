/**
 * ZeitpunktKorrekturPopover
 *
 * Popover mit `datetime-local`-Input zum manuellen Setzen oder Zurücksetzen
 * eines Zeitpunkts (ausgeruecktAm / vorOrtAm / wiederFreiAm).
 *
 * Forms-Stack: `@tanstack/react-form` in der wrappenden Zeile
 * (`EmpfaengerZeile`); dieses Molecule kapselt nur die UI-Mechanik.
 */

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useState } from 'react';
import { PiPencilSimple } from 'react-icons/pi';
import type { ZeitpunktFeld } from '../../schemas/alarmierung.schema';
import { ZeitpunktPill, type ZeitpunktQuelle } from '../atoms/ZeitpunktPill.atom';

const FELD_LABELS: Record<ZeitpunktFeld, string> = {
  ausgeruecktAm: 'Ausgerückt',
  vorOrtAm: 'Vor Ort',
  wiederFreiAm: 'Wieder frei',
};

export interface ZeitpunktKorrekturPopoverProps {
  feld: ZeitpunktFeld;
  wert?: Date | string | null;
  quelle?: ZeitpunktQuelle;
  disabled?: boolean;
  onSubmit: (isoValueOrNull: string | null) => void | Promise<void>;
}

/**
 * Wandelt einen Date/ISO-String in `YYYY-MM-DDTHH:mm` für `datetime-local`.
 */
function toLocalInputValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function ZeitpunktKorrekturPopover({ feld, wert, quelle, disabled, onSubmit }: ZeitpunktKorrekturPopoverProps) {
  const [draft, setDraft] = useState(() => toLocalInputValue(wert));
  const label = FELD_LABELS[feld];

  const handleSave = async (close: () => void) => {
    if (!draft) {
      await onSubmit(null);
      close();
      return;
    }
    const iso = new Date(draft).toISOString();
    await onSubmit(iso);
    close();
  };

  const handleReset = async (close: () => void) => {
    await onSubmit(null);
    close();
  };

  return (
    <Popover className="relative inline-block">
      <PopoverButton
        as="button"
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded border border-transparent hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        aria-label={`${label} bearbeiten`}
      >
        <ZeitpunktPill wert={wert} quelle={quelle} label={label} />
        <PiPencilSimple className="h-3 w-3 text-slate-400" aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel className="absolute z-20 mt-1 w-64 rounded border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {({ close }) => (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                {label}
                <Input type="datetime-local" inputSize="sm" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={disabled} fullWidth className="mt-1" />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button intent="secondary" appearance="ghost" size="sm" type="button" onClick={() => handleReset(close)} disabled={disabled}>
                Zurücksetzen
              </Button>
              <div className="flex gap-2">
                <Button intent="secondary" appearance="ghost" size="sm" type="button" onClick={() => close()}>
                  Abbrechen
                </Button>
                <Button intent="primary" size="sm" type="button" onClick={() => handleSave(close)} disabled={disabled}>
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
