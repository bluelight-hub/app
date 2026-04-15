import { Result } from '@domain/common/result';

/**
 * Polymorphe Empfänger-Referenz einer Alarmierung.
 *
 * Genau eine der drei FKs ist in der Persistenz gesetzt (Check-Constraint).
 * Domain arbeitet mit Discriminated Union via `kind`.
 */
export type AlarmierungEmpfaengerRef =
  | { readonly kind: 'fahrzeug'; readonly fahrzeugId: string }
  | { readonly kind: 'person'; readonly personId: string }
  | { readonly kind: 'einheit'; readonly einheitId: string };

export function validateEmpfaengerRef(ref: AlarmierungEmpfaengerRef): Result<void> {
  if (!ref || typeof ref !== 'object') {
    return Result.fail<void>('empfaengerRef ist erforderlich');
  }
  switch (ref.kind) {
    case 'fahrzeug':
      if (!ref.fahrzeugId?.trim()) return Result.fail<void>('fahrzeugId ist erforderlich');
      return Result.ok<void>(undefined);
    case 'person':
      if (!ref.personId?.trim()) return Result.fail<void>('personId ist erforderlich');
      return Result.ok<void>(undefined);
    case 'einheit':
      if (!ref.einheitId?.trim()) return Result.fail<void>('einheitId ist erforderlich');
      return Result.ok<void>(undefined);
    default:
      return Result.fail<void>('empfaengerRef.kind muss fahrzeug | person | einheit sein');
  }
}

export function empfaengerRefEquals(a: AlarmierungEmpfaengerRef, b: AlarmierungEmpfaengerRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'fahrzeug' && b.kind === 'fahrzeug') return a.fahrzeugId === b.fahrzeugId;
  if (a.kind === 'person' && b.kind === 'person') return a.personId === b.personId;
  if (a.kind === 'einheit' && b.kind === 'einheit') return a.einheitId === b.einheitId;
  return false;
}
