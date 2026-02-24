import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Props fuer EinsatzRolle Value Object.
 */
interface EinsatzRolleProps extends Record<string, unknown> {
  value: string;
}

/**
 * Erlaubte EinsatzRolle-Werte als Typ.
 */
export type EinsatzRolleValue = (typeof EinsatzRolle.ALLOWED_VALUES)[number];

/**
 * EinsatzRolle Value Object — Befehlsspezifische Rollen pro Einsatz.
 *
 * Modelliert die vier Befehlsmanagement-Rollen gemaess Story 5.2 AC1:
 * - BEFEHLSGEBER: Einsatzleiter/Abschnittsleiter — kann Befehle erteilen lassen
 * - ERSTELLER: Melder/Stabsmitarbeiter — kann Befehle erfassen
 * - EMPFAENGER: Gruppenfuehrer/Einheitsfuehrer — empfaengt und quittiert Befehle
 * - BEOBACHTER: Read-Only — kann alle Befehle einsehen, keine Aktionen
 */
export class EinsatzRolle extends ValueObject<EinsatzRolleProps> {
  /**
   * Erlaubte Rollen-Werte.
   */
  static readonly ALLOWED_VALUES = ['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER'] as const;

  /**
   * Getter fuer den Rollen-Wert.
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Private Constructor — erzwingt Factory Methods.
   */
  private constructor(value: string) {
    super({ value });
  }

  /**
   * Prueft ob ein Wert eine gueltige Rolle ist.
   */
  private static isValidRolle(value: string): boolean {
    return EinsatzRolle.ALLOWED_VALUES.includes(value as EinsatzRolleValue);
  }

  /**
   * Factory Method mit Validierung.
   */
  static create(value: string): Result<EinsatzRolle> {
    if (!EinsatzRolle.isValidRolle(value)) {
      return Result.fail<EinsatzRolle>(`Ungueltige Rolle: ${value}. Erlaubte Werte: ${EinsatzRolle.ALLOWED_VALUES.join(', ')}`);
    }
    return Result.ok<EinsatzRolle>(new EinsatzRolle(value));
  }

  /** Static Factory fuer BEFEHLSGEBER. */
  static BEFEHLSGEBER(): EinsatzRolle {
    return new EinsatzRolle('BEFEHLSGEBER');
  }

  /** Static Factory fuer ERSTELLER. */
  static ERSTELLER(): EinsatzRolle {
    return new EinsatzRolle('ERSTELLER');
  }

  /** Static Factory fuer EMPFAENGER. */
  static EMPFAENGER(): EinsatzRolle {
    return new EinsatzRolle('EMPFAENGER');
  }

  /** Static Factory fuer BEOBACHTER. */
  static BEOBACHTER(): EinsatzRolle {
    return new EinsatzRolle('BEOBACHTER');
  }

  /**
   * String-Repraesentation fuer Logging.
   */
  public toString(): string {
    return this.value;
  }
}
