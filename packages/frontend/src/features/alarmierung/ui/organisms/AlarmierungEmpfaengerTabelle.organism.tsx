/**
 * AlarmierungEmpfaengerTabelle
 *
 * Tabelle aller Empfänger einer Alarmierung. Sortierbar nach Name oder
 * Reaktionszeit; Zeitpunkte sind inline via Popover editierbar.
 */

import type { AlarmierungEmpfaengerResponseDto, AlarmierungResponseDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';
import { useMemo, useState } from 'react';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { useEntferneEmpfaenger, useKorrigiereZeitpunkt } from '../../api/mutations';
import type { ZeitpunktFeld } from '../../schemas/alarmierung.schema';
import { EmpfaengerZeile } from '../molecules/EmpfaengerZeile.molecule';

type SortKey = 'name' | 'reaktionszeit';

export interface AlarmierungEmpfaengerTabelleProps {
  einsatzId: string;
  alarmierung: AlarmierungResponseDto;
  disabled?: boolean;
}

function sortEmpfaenger(list: AlarmierungEmpfaengerResponseDto[], key: SortKey, dir: 'asc' | 'desc'): AlarmierungEmpfaengerResponseDto[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (key === 'name') {
      return a.nameSnapshot.localeCompare(b.nameSnapshot, 'de-DE');
    }
    const aVal = a.reaktionszeitSekunden ?? Number.POSITIVE_INFINITY;
    const bVal = b.reaktionszeitSekunden ?? Number.POSITIVE_INFINITY;
    return aVal - bVal;
  });
  if (dir === 'desc') copy.reverse();
  return copy;
}

export function AlarmierungEmpfaengerTabelle({ einsatzId, alarmierung, disabled }: AlarmierungEmpfaengerTabelleProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const korrigiereZeitpunkt = useKorrigiereZeitpunkt(einsatzId);
  const entferneEmpfaenger = useEntferneEmpfaenger(einsatzId);

  const sorted = useMemo(() => sortEmpfaenger(alarmierung.empfaenger, sortKey, sortDir), [alarmierung.empfaenger, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleKorrigiere = (empfaengerId: string) => (feld: ZeitpunktFeld, wert: string | null) => {
    korrigiereZeitpunkt.mutate({ alarmierungId: alarmierung.id, empfaengerId, feld, wert });
  };

  const handleEntferne = (empfaengerId: string) => () => {
    if (!window.confirm('Empfänger wirklich aus der Alarmierung entfernen?')) return;
    entferneEmpfaenger.mutate({ alarmierungId: alarmierung.id, empfaengerId });
  };

  const SortButton = ({ label, value, colKey }: { label: string; value: SortKey; colKey: string }) => {
    const active = sortKey === value;
    const Icon = sortDir === 'asc' ? PiCaretUp : PiCaretDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(value)}
        className={cn('inline-flex items-center gap-1 text-left font-semibold', active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200')}
        data-col={colKey}
      >
        {label}
        {active && <Icon className="h-3 w-3" aria-hidden="true" />}
      </button>
    );
  };

  if (alarmierung.empfaenger.length === 0) {
    return <p className="text-sm text-slate-500">Keine Empfänger erfasst.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              <SortButton label="Empfänger" value="name" colKey="name" />
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Alarmiert
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Ausgerückt
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Vor Ort
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Wieder frei
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              <SortButton label="Reaktionszeit" value="reaktionszeit" colKey="reaktionszeit" />
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((empfaenger) => (
            <EmpfaengerZeile
              key={empfaenger.id}
              empfaenger={empfaenger}
              disabled={disabled || korrigiereZeitpunkt.isPending}
              onKorrigiere={handleKorrigiere(empfaenger.id)}
              onEntferne={handleEntferne(empfaenger.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
