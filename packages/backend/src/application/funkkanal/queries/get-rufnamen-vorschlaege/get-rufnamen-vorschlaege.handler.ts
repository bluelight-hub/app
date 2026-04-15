import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { GetRufnamenVorschlaegeQuery, RufnamenVorschlaegeResult } from './get-rufnamen-vorschlaege.query';

/**
 * Handler für {@link GetRufnamenVorschlaegeQuery}.
 *
 * Aggregiert Fahrzeuge, Personen und Einheiten eines Einsatzes und liefert
 * deren Rufnamen-relevanten Felder in einem einzigen Response. Verwendet
 * von der Zuordnungs-UI zur Rufnamen-Auswahl.
 */
@Injectable()
export class GetRufnamenVorschlaegeQueryHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG) private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON) private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepository: IEinsatzEinheitRepository,
  ) {}

  async execute(query: GetRufnamenVorschlaegeQuery): Promise<Result<RufnamenVorschlaegeResult>> {
    const [fahrzeugeResult, personenResult, einheitenResult] = await Promise.all([
      this.fahrzeugRepository.findByEinsatzId(query.einsatzId),
      this.personRepository.findByEinsatzId(query.einsatzId),
      this.einheitRepository.findByEinsatzId(query.einsatzId),
    ]);
    if (fahrzeugeResult.isFailure || !fahrzeugeResult.value) {
      return Result.fail<RufnamenVorschlaegeResult>(fahrzeugeResult.error ?? 'Fahrzeuge konnten nicht geladen werden');
    }
    if (personenResult.isFailure || !personenResult.value) {
      return Result.fail<RufnamenVorschlaegeResult>(personenResult.error ?? 'Personen konnten nicht geladen werden');
    }
    if (einheitenResult.isFailure || !einheitenResult.value) {
      return Result.fail<RufnamenVorschlaegeResult>(einheitenResult.error ?? 'Einheiten konnten nicht geladen werden');
    }

    return Result.ok<RufnamenVorschlaegeResult>({
      fahrzeuge: fahrzeugeResult.value.map((fz) => ({ id: fz.id.value, funkrufname: fz.funkrufname })),
      personen: personenResult.value
        .map((person) => {
          const rufname = person.funkrufname?.trim() || `${person.vorname} ${person.nachname}`.trim();
          return { id: person.id.value, funkrufname: rufname };
        })
        .filter((entry) => entry.funkrufname.length > 0),
      einheiten: einheitenResult.value.map((einheit) => ({ id: einheit.id.value, name: einheit.name })),
    });
  }
}
