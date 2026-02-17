import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Props für BefehlStatus Value Object.
 */
interface BefehlStatusProps extends Record<string, unknown> {
  value: string;
}

/**
 * BefehlStatus Value Object mit State Machine Logic.
 *
 * Modelliert den Lebenszyklus eines Befehls als State Machine:
 *
 * ```
 * ERTEILT → ZUGESTELLT → QUITTIERT
 *     ↓
 * KORRIGIERT
 * ```
 *
 * - `ERTEILT`: Initialer Status bei Befehlserstellung
 * - `ZUGESTELLT`: Alle Empfänger haben den Befehl erhalten
 * - `QUITTIERT`: Alle Empfänger haben quittiert
 * - `KORRIGIERT`: Befehl wurde durch Korrekturbefehl ersetzt
 */
export class BefehlStatus extends ValueObject<BefehlStatusProps> {
  private static readonly ALLOWED_VALUES = ['ERTEILT', 'ZUGESTELLT', 'QUITTIERT', 'KORRIGIERT'] as const;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  private static isValidStatus(value: string): boolean {
    return BefehlStatus.ALLOWED_VALUES.includes(value as (typeof BefehlStatus.ALLOWED_VALUES)[number]);
  }

  /**
   * Factory Method mit Validierung.
   */
  static create(value: string): Result<BefehlStatus> {
    if (!BefehlStatus.isValidStatus(value)) {
      return Result.fail<BefehlStatus>(`Ungültiger Befehl-Status: ${value}. Erlaubte Werte: ${BefehlStatus.ALLOWED_VALUES.join(', ')}`);
    }
    return Result.ok<BefehlStatus>(new BefehlStatus(value));
  }

  /** Convenience Factory für Status ERTEILT. */
  static ERTEILT(): BefehlStatus {
    return new BefehlStatus('ERTEILT');
  }

  /** Convenience Factory für Status ZUGESTELLT. */
  static ZUGESTELLT(): BefehlStatus {
    return new BefehlStatus('ZUGESTELLT');
  }

  /** Convenience Factory für Status QUITTIERT. */
  static QUITTIERT(): BefehlStatus {
    return new BefehlStatus('QUITTIERT');
  }

  /** Convenience Factory für Status KORRIGIERT. */
  static KORRIGIERT(): BefehlStatus {
    return new BefehlStatus('KORRIGIERT');
  }

  /**
   * State Machine Logic: Prüft ob eine Transition zu einem neuen Status erlaubt ist.
   *
   * Erlaubte Transitions:
   * - ERTEILT → ZUGESTELLT, KORRIGIERT
   * - ZUGESTELLT → QUITTIERT, KORRIGIERT
   * - QUITTIERT → (keine, finaler Status)
   * - KORRIGIERT → (keine, finaler Status)
   */
  public canTransitionTo(newStatus: BefehlStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      ERTEILT: ['ZUGESTELLT', 'KORRIGIERT'],
      ZUGESTELLT: ['QUITTIERT', 'KORRIGIERT'],
      QUITTIERT: [],
      KORRIGIERT: [],
    };

    const allowedTargets = validTransitions[this.value] || [];
    return allowedTargets.includes(newStatus.value);
  }

  public toString(): string {
    return this.value;
  }
}
