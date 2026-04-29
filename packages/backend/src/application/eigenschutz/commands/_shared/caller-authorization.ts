import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';

/**
 * Sentinel-Konstante für die Caller-Authorization. Wird vom AckPsaQuittung-
 * und MeldeLuecke-Handler 1:1 weitergereicht (Story 3.6 AC4 — beide
 * Handler nutzen denselben Helper).
 */
export const UNZULAESSIGE_EINHEITEN_ZUORDNUNG = 'BusinessRule:UnzulaessigeEinheitenZuordnung';

export interface CallerAuthorizationDeps {
  teilnehmerRepo: IEinsatzTeilnehmerRepository;
  einheitRepo: IEinsatzEinheitRepository;
}

/**
 * DRY-Helper für `AckPsaQuittungHandler` (Story 3.4) und
 * `MeldeLueckeHandler` (Story 3.6 AC4).
 *
 * Prüft Defense-in-Depth zur Permission-Schicht:
 * 1. Caller hat aktive `EinsatzTeilnehmer`-Bindung im Einsatz.
 * 2. `teilnehmer.einsatzId === einsatzId` (Cross-Einsatz-Bypass-Schutz).
 * 3. `teilnehmer.leftAt === null` (ausgeschiedene Teilnehmer dürfen nicht
 *    mehr quittieren / Lücken melden).
 * 4. Caller-`EinsatzPerson` ist Mitglied der `einheitId` über
 *    `EinsatzPersonEinheit`.
 *
 * **Sentinel:** Bei jedem Verstoß wird `BusinessRule:UnzulaessigeEinheitenZuordnung`
 * zurückgegeben — der Caller (Handler) reicht den Sentinel an den Controller
 * weiter, der ihn auf HTTP 422 mappt.
 *
 * **Bewusst KEIN abstrakter `BaseAckHandler`:** Diese Refactoring-Entscheidung
 * ist eine kleine lokale DRY-Optimierung (zwei Aufrufer, identische Logik).
 * Eine Helper-Funktion reicht — kein neues Klassen-Konstrukt.
 */
export async function assertCallerAuthorizedForEinheit(
  tx: TransactionContext,
  deps: CallerAuthorizationDeps,
  params: {
    einsatzId: string;
    callerUserId: string;
    einheitId: string;
  },
): Promise<Result<void>> {
  const teilnehmer = await deps.teilnehmerRepo.findByEinsatzAndUser(params.einsatzId, params.callerUserId, tx);
  if (!teilnehmer) {
    return Result.fail<void>(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  }
  if (teilnehmer.einsatzId !== params.einsatzId) {
    return Result.fail<void>(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  }
  if (teilnehmer.leftAt !== null) {
    return Result.fail<void>(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  }
  const isMemberOfEinheit = await deps.einheitRepo.existsPersonenZuordnung(teilnehmer.einsatzPersonId, params.einheitId, tx);
  if (!isMemberOfEinheit) {
    return Result.fail<void>(UNZULAESSIGE_EINHEITEN_ZUORDNUNG);
  }
  return Result.ok<void>(undefined);
}
