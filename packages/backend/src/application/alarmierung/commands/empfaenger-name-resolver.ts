import { Result } from '@domain/common/result';
import type { AlarmierungEmpfaengerRef } from '@domain/aggregates/alarmierung/alarmierung-empfaenger-ref';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';

/**
 * Repos für die Ermittlung des Name-Snapshots eines Empfängers.
 *
 * Wird per Constructor in alle Handler injiziert, die Empfänger neu anlegen.
 */
export interface EmpfaengerNameRepositories {
  readonly fahrzeug: IEinsatzFahrzeugRepository;
  readonly person: IEinsatzPersonRepository;
  readonly einheit: IEinsatzEinheitRepository;
}

/**
 * Ermittelt den Name-Snapshot eines Empfängers.
 *
 * Wenn der Aufrufer einen `providedSnapshot` mitliefert, wird dieser verwendet —
 * andernfalls wird das jeweilige Kräfte-Repository konsultiert. Liefert
 * `Result.fail`, wenn die referenzierte Kraft nicht gefunden wird oder weder
 * Funkrufname noch Name liefert.
 *
 * Analog zum Vorgehen im Funkkanal-Modul (Issue #407).
 */
export async function resolveEmpfaengerNameSnapshot(repos: EmpfaengerNameRepositories, ref: AlarmierungEmpfaengerRef, providedSnapshot?: string): Promise<Result<string>> {
  if (providedSnapshot && providedSnapshot.trim().length > 0) {
    return Result.ok<string>(providedSnapshot.trim());
  }
  switch (ref.kind) {
    case 'fahrzeug': {
      const idResult = EinsatzFahrzeugId.create(ref.fahrzeugId);
      if (idResult.isFailure || !idResult.value) {
        return Result.fail<string>(idResult.error ?? 'Ungültige EinsatzFahrzeugId');
      }
      const fahrzeugResult = await repos.fahrzeug.findById(idResult.value);
      if (fahrzeugResult.isFailure || !fahrzeugResult.value) {
        return Result.fail<string>('Fahrzeug nicht gefunden');
      }
      const snapshot = fahrzeugResult.value.funkrufname?.trim();
      if (!snapshot) {
        return Result.fail<string>('Fahrzeug hat keinen Funkrufnamen');
      }
      return Result.ok<string>(snapshot);
    }
    case 'person': {
      const idResult = EinsatzPersonId.create(ref.personId);
      if (idResult.isFailure || !idResult.value) {
        return Result.fail<string>(idResult.error ?? 'Ungültige EinsatzPersonId');
      }
      const personResult = await repos.person.findById(idResult.value);
      if (personResult.isFailure || !personResult.value) {
        return Result.fail<string>('Person nicht gefunden');
      }
      const person = personResult.value;
      const snapshot = person.funkrufname?.trim() || `${person.vorname} ${person.nachname}`.trim();
      if (!snapshot) {
        return Result.fail<string>('Person hat weder Funkrufnamen noch Namensangabe');
      }
      return Result.ok<string>(snapshot);
    }
    case 'einheit': {
      const einheitResult = await repos.einheit.findById(ref.einheitId);
      if (einheitResult.isFailure || !einheitResult.value) {
        return Result.fail<string>('Einheit nicht gefunden');
      }
      const snapshot = einheitResult.value.name?.trim();
      if (!snapshot) {
        return Result.fail<string>('Einheit hat keinen Namen');
      }
      return Result.ok<string>(snapshot);
    }
  }
}
