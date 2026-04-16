/**
 * EmpfaengerZeile
 *
 * Tabellenzeile für einen Alarmierungs-Empfänger mit 4 editierbaren
 * Zeitstempel-Popovern (alarmiert / ausgerückt / vor Ort / wieder frei),
 * Empfänger-Typ-Badge, Reaktionszeit-Anzeige und Entfernen-Aktion.
 */

import type { AlarmierungEmpfaengerResponseDto } from '@bluelight-hub/shared/client';
import { PiTrash } from 'react-icons/pi';
import type { ZeitpunktFeld } from '../../schemas/alarmierung.schema';
import { EmpfaengerTypBadge } from '../atoms/EmpfaengerTypBadge.atom';
import { ReaktionszeitAnzeige } from '../atoms/ReaktionszeitAnzeige.atom';
import { ZeitpunktPill, type ZeitpunktQuelle } from '../atoms/ZeitpunktPill.atom';
import { ZeitpunktKorrekturPopover } from './ZeitpunktKorrekturPopover.molecule';

export interface EmpfaengerZeileProps {
  empfaenger: AlarmierungEmpfaengerResponseDto;
  disabled?: boolean;
  onKorrigiere: (feld: ZeitpunktFeld, isoValueOrNull: string | null) => void | Promise<void>;
  onEntferne?: () => void;
}

/**
 * Heuristik zur Quelle-Bestimmung: Wenn ein `letzterFmsStatus` gesetzt ist,
 * markieren wir den Zeitpunkt als FMS-erfasst, sonst als manuell. Eine
 * feinere Pro-Feld-Unterscheidung würde ein Server-seitiges Flag erfordern.
 */
function resolveQuelle(empfaenger: AlarmierungEmpfaengerResponseDto, hasValue: boolean): ZeitpunktQuelle {
  if (!hasValue) return 'leer';
  return empfaenger.letzterFmsStatus !== null && empfaenger.letzterFmsStatus !== undefined ? 'fms' : 'manuell';
}

export function EmpfaengerZeile({ empfaenger, disabled, onKorrigiere, onEntferne }: EmpfaengerZeileProps) {
  const quelle = (hasValue: boolean) => resolveQuelle(empfaenger, hasValue);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <EmpfaengerTypBadge kind={empfaenger.kind} size="sm" iconOnly />
          <span className="truncate font-medium text-slate-800 dark:text-slate-100">{empfaenger.nameSnapshot}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        {/* Alarmiert-Zeitpunkt ist fix (Trigger-Zeit), nicht editierbar */}
        <ZeitpunktPill wert={empfaenger.alarmiertAm} quelle="manuell" label="Alarmiert" />
      </td>
      <td className="px-3 py-2">
        <ZeitpunktKorrekturPopover
          feld="ausgeruecktAm"
          wert={empfaenger.ausgeruecktAm}
          quelle={quelle(Boolean(empfaenger.ausgeruecktAm))}
          disabled={disabled}
          onSubmit={(value) => onKorrigiere('ausgeruecktAm', value)}
        />
      </td>
      <td className="px-3 py-2">
        <ZeitpunktKorrekturPopover feld="vorOrtAm" wert={empfaenger.vorOrtAm} quelle={quelle(Boolean(empfaenger.vorOrtAm))} disabled={disabled} onSubmit={(value) => onKorrigiere('vorOrtAm', value)} />
      </td>
      <td className="px-3 py-2">
        <ZeitpunktKorrekturPopover
          feld="wiederFreiAm"
          wert={empfaenger.wiederFreiAm}
          quelle={quelle(Boolean(empfaenger.wiederFreiAm))}
          disabled={disabled}
          onSubmit={(value) => onKorrigiere('wiederFreiAm', value)}
        />
      </td>
      <td className="px-3 py-2">
        <ReaktionszeitAnzeige sekunden={empfaenger.reaktionszeitSekunden ?? null} size="sm" />
      </td>
      <td className="px-3 py-2 text-right">
        {onEntferne && (
          <button
            type="button"
            aria-label={`Empfänger ${empfaenger.nameSnapshot} entfernen`}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
            onClick={onEntferne}
            disabled={disabled}
          >
            <PiTrash className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
}
