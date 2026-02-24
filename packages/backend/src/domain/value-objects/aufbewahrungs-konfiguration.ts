import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Props fuer AufbewahrungsKonfiguration Value Object.
 */
interface AufbewahrungsKonfigurationProps extends Record<string, unknown> {
  aufbewahrungsfristJahre: number;
  freigabeperiodeTage: number;
  automatischLoeschenAktiv: boolean;
}

/**
 * AufbewahrungsKonfiguration Value Object — DSGVO-Aufbewahrungsregeln.
 *
 * Modelliert die konfigurierbaren Parameter fuer die Datenaufbewahrung:
 * - aufbewahrungsfristJahre: Wie lange Daten aufbewahrt werden (Default: 10 Jahre, GoBD §147 AO)
 * - freigabeperiodeTage: Wartezeit vor endgueltiger Loeschung nach Anonymisierung (Default: 30 Tage)
 * - automatischLoeschenAktiv: Ob der Cronjob aktiv ist
 *
 * @remarks Story 5.5 AC1
 */
export class AufbewahrungsKonfiguration extends ValueObject<AufbewahrungsKonfigurationProps> {
  static readonly MIN_FRIST_JAHRE = 1;
  static readonly MAX_FRIST_JAHRE = 30;
  static readonly MIN_FREIGABE_TAGE = 1;
  static readonly MAX_FREIGABE_TAGE = 365;
  static readonly DEFAULT_FRIST_JAHRE = 10;
  static readonly DEFAULT_FREIGABE_TAGE = 30;

  get aufbewahrungsfristJahre(): number {
    return this.props.aufbewahrungsfristJahre;
  }

  get freigabeperiodeTage(): number {
    return this.props.freigabeperiodeTage;
  }

  get automatischLoeschenAktiv(): boolean {
    return this.props.automatischLoeschenAktiv;
  }

  private constructor(props: AufbewahrungsKonfigurationProps) {
    super(props);
  }

  /**
   * Factory Method mit Validierung.
   */
  static create(aufbewahrungsfristJahre: number, freigabeperiodeTage: number, automatischLoeschenAktiv: boolean): Result<AufbewahrungsKonfiguration> {
    if (!Number.isInteger(aufbewahrungsfristJahre)) {
      return Result.fail<AufbewahrungsKonfiguration>('Aufbewahrungsfrist muss eine ganze Zahl sein');
    }
    if (aufbewahrungsfristJahre < AufbewahrungsKonfiguration.MIN_FRIST_JAHRE || aufbewahrungsfristJahre > AufbewahrungsKonfiguration.MAX_FRIST_JAHRE) {
      return Result.fail<AufbewahrungsKonfiguration>(`Aufbewahrungsfrist muss zwischen ${AufbewahrungsKonfiguration.MIN_FRIST_JAHRE} und ${AufbewahrungsKonfiguration.MAX_FRIST_JAHRE} Jahren liegen`);
    }

    if (!Number.isInteger(freigabeperiodeTage)) {
      return Result.fail<AufbewahrungsKonfiguration>('Freigabeperiode muss eine ganze Zahl sein');
    }
    if (freigabeperiodeTage < AufbewahrungsKonfiguration.MIN_FREIGABE_TAGE || freigabeperiodeTage > AufbewahrungsKonfiguration.MAX_FREIGABE_TAGE) {
      return Result.fail<AufbewahrungsKonfiguration>(`Freigabeperiode muss zwischen ${AufbewahrungsKonfiguration.MIN_FREIGABE_TAGE} und ${AufbewahrungsKonfiguration.MAX_FREIGABE_TAGE} Tagen liegen`);
    }

    return Result.ok<AufbewahrungsKonfiguration>(
      new AufbewahrungsKonfiguration({
        aufbewahrungsfristJahre,
        freigabeperiodeTage,
        automatischLoeschenAktiv,
      }),
    );
  }

  /**
   * Default-Konfiguration (GoBD §147 AO Defaults).
   */
  static default(): AufbewahrungsKonfiguration {
    return new AufbewahrungsKonfiguration({
      aufbewahrungsfristJahre: AufbewahrungsKonfiguration.DEFAULT_FRIST_JAHRE,
      freigabeperiodeTage: AufbewahrungsKonfiguration.DEFAULT_FREIGABE_TAGE,
      automatischLoeschenAktiv: false,
    });
  }

  public toString(): string {
    return `Aufbewahrung: ${this.aufbewahrungsfristJahre}J, Freigabe: ${this.freigabeperiodeTage}T, Aktiv: ${this.automatischLoeschenAktiv}`;
  }
}
