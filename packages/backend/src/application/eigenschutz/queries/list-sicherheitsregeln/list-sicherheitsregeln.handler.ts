import { Result } from '@domain/common/result';
import type { ISicherheitsregelRepository, SicherheitsregelReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { KRAEFTE_REPOSITORIES, SICHERHEITSREGEL_REPOSITORY } from '@infrastructure/di-tokens';
import { ListSicherheitsregelnQuery } from './list-sicherheitsregeln.query';

/**
 * Listet aktive Sicherheitsregeln eines Einsatzes als Read-Models
 * (Story 2.6 AC6).
 *
 * Die Einsatz-Mitgliedschaft wird durch die Controller-Guard-Kette geprüft;
 * der Handler delegiert die Filterung an das Repository und reicht deren
 * Read-Models transparent durch. `findActiveByEinsatz` garantiert nur Rows
 * mit `SicherheitsregelVersion.gueltigBis IS NULL` (keine abgekündigten) —
 * damit bleibt AC4 konsistent: logisch abgekündigte Rows fallen aus der
 * Liste heraus, auch wenn sie physisch noch existieren (append-only).
 */
@Injectable()
@QueryHandler(ListSicherheitsregelnQuery)
export class ListSicherheitsregelnHandler implements IQueryHandler<ListSicherheitsregelnQuery, Result<SicherheitsregelReadModel[]>> {
  constructor(
    @Inject(SICHERHEITSREGEL_REPOSITORY)
    private readonly sicherheitsregelRepo: ISicherheitsregelRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
  ) {}

  async execute(query: ListSicherheitsregelnQuery): Promise<Result<SicherheitsregelReadModel[]>> {
    // Cross-Einsatz-Schutz für den optionalen `einheitId`-Filter:
    // Eine Einheit aus einem anderen Einsatz darf nicht als gültiger
    // Filter durchgehen — sonst liefert die Repository-Where-Klausel
    // stillschweigend nur einsatzweite Regeln und der Aufrufer denkt,
    // die Einheit hätte einfach keine Regeln. Stattdessen: 404.
    if (query.einheitId !== undefined && query.einheitId !== null && query.einheitId !== '') {
      const einheitResult = await this.einheitRepo.findById(query.einheitId);
      if (einheitResult.isFailure) {
        return Result.fail<SicherheitsregelReadModel[]>(einheitResult.error ?? 'Einheit konnte nicht geladen werden');
      }
      const einheit = einheitResult.value;
      if (!einheit || einheit.einsatzId !== query.einsatzId) {
        return Result.fail<SicherheitsregelReadModel[]>('NotFound:Einheit');
      }
    }

    const result = await this.sicherheitsregelRepo.findActiveByEinsatz(query.einsatzId, query.einheitId);
    if (result.isFailure || !result.value) {
      return Result.fail<SicherheitsregelReadModel[]>(result.error ?? 'Sicherheitsregeln konnten nicht geladen werden');
    }
    return Result.ok(result.value);
  }
}
