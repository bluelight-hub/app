import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

interface OperativeRoleProps extends Record<string, unknown> {
  value: string;
}

/**
 * OperativeRole Value Object — Operative Zugangsebene eines Benutzers.
 *
 * Drei Stufen:
 * - FUEHRUNGSKRAFT: Voller operativer Zugang (inkl. Führungsunterstützung)
 * - EINSATZKRAFT: Einsätze sichtbar, Beitritt per Anfrage
 * - EXTERNE: Nur eingeladene Einsätze sichtbar
 */
export class OperativeRole extends ValueObject<OperativeRoleProps> {
  private static readonly ALLOWED_VALUES = ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'] as const;

  private constructor(value: string) {
    super({ value });
  }

  public static create(value: string): Result<OperativeRole> {
    if (!OperativeRole.ALLOWED_VALUES.includes(value as (typeof OperativeRole.ALLOWED_VALUES)[number])) {
      return Result.fail<OperativeRole>(`Ungültige operative Rolle: ${value}. Erlaubte Werte: ${OperativeRole.ALLOWED_VALUES.join(', ')}`);
    }
    return Result.ok<OperativeRole>(new OperativeRole(value));
  }

  public static FUEHRUNGSKRAFT(): OperativeRole {
    return new OperativeRole('FUEHRUNGSKRAFT');
  }

  public static EINSATZKRAFT(): OperativeRole {
    return new OperativeRole('EINSATZKRAFT');
  }

  public static EXTERNE(): OperativeRole {
    return new OperativeRole('EXTERNE');
  }

  get value(): string {
    return this.props.value;
  }

  /** FK und EK sehen die Einsatz-Liste, Externe nicht */
  public canAccessEinsatzList(): boolean {
    return this.value !== 'EXTERNE';
  }

  /** Nur FK kann Einsätze direkt öffnen (EK/Ex nur über Zuweisung) */
  public canOpenEinsatz(): boolean {
    return this.value === 'FUEHRUNGSKRAFT';
  }

  /** Nur FK kann Einsätze archivieren/löschen */
  public canArchiveEinsatz(): boolean {
    return this.value === 'FUEHRUNGSKRAFT';
  }

  /** FK und EK müssen eine Stammperson haben, Externe nicht */
  public requiresStammperson(): boolean {
    return this.value !== 'EXTERNE';
  }

  public toString(): string {
    return this.value;
  }
}
