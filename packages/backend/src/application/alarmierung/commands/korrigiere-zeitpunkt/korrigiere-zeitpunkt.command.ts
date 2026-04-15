import { Result } from '@domain/common/result';
import { ZEITPUNKT_FELDER, type ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';

export interface KorrigiereZeitpunktCommandProps {
  readonly alarmierungId: string;
  readonly empfaengerId: string;
  readonly feld: ZeitpunktFeld;
  readonly wert: Date | null;
  readonly updatedBy: string;
}

/**
 * Command: Manuelles Nachtragen oder Korrigieren eines Zeitpunkts
 * (`ausgeruecktAm` / `vorOrtAm` / `wiederFreiAm`) eines Empfängers.
 *
 * `wert = null` löscht den vorhandenen Wert. Audit-Trail wird als Domain-Event
 * (`AlarmierungZeitpunktKorrigiertEvent`) geschrieben.
 */
export class KorrigiereZeitpunktCommand {
  private constructor(
    public readonly alarmierungId: string,
    public readonly empfaengerId: string,
    public readonly feld: ZeitpunktFeld,
    public readonly wert: Date | null,
    public readonly updatedBy: string,
  ) {}

  static create(props: KorrigiereZeitpunktCommandProps): Result<KorrigiereZeitpunktCommand> {
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<KorrigiereZeitpunktCommand>('alarmierungId ist erforderlich');
    }
    const empfaengerId = props.empfaengerId?.trim();
    if (!empfaengerId) {
      return Result.fail<KorrigiereZeitpunktCommand>('empfaengerId ist erforderlich');
    }
    const updatedBy = props.updatedBy?.trim();
    if (!updatedBy) {
      return Result.fail<KorrigiereZeitpunktCommand>('updatedBy ist erforderlich');
    }
    if (!ZEITPUNKT_FELDER.includes(props.feld)) {
      return Result.fail<KorrigiereZeitpunktCommand>(`feld muss eines von ${ZEITPUNKT_FELDER.join(', ')} sein`);
    }
    if (props.wert !== null && !(props.wert instanceof Date)) {
      return Result.fail<KorrigiereZeitpunktCommand>('wert muss Date oder null sein');
    }
    return Result.ok(new KorrigiereZeitpunktCommand(alarmierungId, empfaengerId, props.feld, props.wert, updatedBy));
  }
}
