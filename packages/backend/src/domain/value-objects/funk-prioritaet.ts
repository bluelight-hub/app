import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

/**
 * Gültige Werte für FunkPrioritaet (BOS-Funkverkehr).
 *
 * - `routine`: Normale Kommunikation
 * - `prioritaet`: Vorrangige Nachricht (z.B. Lagemeldung)
 * - `notfall`: Notfall-Priorität triggert Broadcast-Alert an alle Einsatzbeteiligten
 */
export type FunkPrioritaetValue = 'routine' | 'prioritaet' | 'notfall';

interface FunkPrioritaetProps extends Record<string, unknown> {
  value: FunkPrioritaetValue;
}

/**
 * FunkPrioritaet Value Object.
 *
 * Modelliert die Priorität eines Funkspruchs. Einzige Eskalations-Invariante
 * am FunkKontext: `notfall` triggert den Broadcast-Alert an alle
 * Einsatzbeteiligten. Andere Prioritäten sind rein informativ.
 */
export class FunkPrioritaet extends ValueObject<FunkPrioritaetProps> {
  private static readonly ALLOWED_VALUES: readonly FunkPrioritaetValue[] = ['routine', 'prioritaet', 'notfall'];

  get value(): FunkPrioritaetValue {
    return this.props.value;
  }

  private constructor(value: FunkPrioritaetValue) {
    super({ value });
  }

  private static isValid(value: string): value is FunkPrioritaetValue {
    return FunkPrioritaet.ALLOWED_VALUES.includes(value as FunkPrioritaetValue);
  }

  /**
   * Factory Method mit Validierung.
   */
  static create(value: string): Result<FunkPrioritaet> {
    if (!FunkPrioritaet.isValid(value)) {
      return Result.fail<FunkPrioritaet>(`Ungültige FunkPrioritaet: ${value}. Erlaubte Werte: ${FunkPrioritaet.ALLOWED_VALUES.join(', ')}`);
    }
    return Result.ok<FunkPrioritaet>(new FunkPrioritaet(value));
  }

  static ROUTINE(): FunkPrioritaet {
    return new FunkPrioritaet('routine');
  }

  static PRIORITAET(): FunkPrioritaet {
    return new FunkPrioritaet('prioritaet');
  }

  static NOTFALL(): FunkPrioritaet {
    return new FunkPrioritaet('notfall');
  }

  /**
   * True wenn die Priorität `notfall` ist — löst den Broadcast-Alert aus.
   */
  isNotfall(): boolean {
    return this.value === 'notfall';
  }

  toString(): string {
    return this.value;
  }
}
