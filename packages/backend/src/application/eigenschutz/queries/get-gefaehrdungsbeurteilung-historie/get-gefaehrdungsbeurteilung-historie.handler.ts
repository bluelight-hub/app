import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import type { GefaehrdungsbeurteilungVersionRow, IGefaehrdungsbeurteilungRepository, IGefaehrdungsbeurteilungVersionRepository } from '@domain/eigenschutz/repositories';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { UserId } from '@domain/value-objects/user-id';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { GetGefaehrdungsbeurteilungHistorieQuery } from './get-gefaehrdungsbeurteilung-historie.query';

/**
 * Sentinel-Präfix für „Beurteilung nicht gefunden" (oder gehört zu einem
 * anderen Einsatz). Wird symmetrisch zum {@link GetGefaehrdungsbeurteilungHandler}
 * gesetzt, damit der Controller den gemeinsamen `mapQueryError`-Pfad
 * wiederverwenden kann.
 */
export const GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Beurteilung',
} as const;

/**
 * Read-Model-Eintrag für eine einzelne Version in der Timeline.
 *
 * `changedByUserName` ist `null`, wenn der User-Lookup keinen Treffer liefert
 * (User soft-deleted / gelockt) **oder** wenn die User-ID nicht in ein valides
 * {@link UserId}-Value-Object konvertierbar ist (defensiv gegen Legacy-Daten).
 * Das Frontend fällt in diesem Fall auf eine UserId-Kurzform zurück.
 */
export interface HistorieEintragReadModel {
  version: number;
  gueltigVon: Date;
  gueltigBis: Date | null;
  changedByUserId: string;
  changedByUserName: string | null;
  changedFields: Record<string, unknown>;
  items: GefaehrdungItem[];
}

/**
 * Read-Model für die vollständige Timeline einer Gefährdungsbeurteilung.
 *
 * `aggregateVersion` liefert die aktuelle Aggregate-Version (für die
 * UI-Indikation „V N von M" und die Erkennung „aktuelle Version" in der
 * Detail-Drawer-Sicht).
 */
export interface HistorieReadModel {
  aggregateVersion: number;
  eintraege: HistorieEintragReadModel[];
}

/**
 * Query-Handler für die Versions-Timeline einer Gefährdungsbeurteilung
 * (Story 2.4 AC6).
 *
 * ## Flow
 * 1. `findReadModelById` laden → `null` ⇒ `NOT_FOUND`.
 * 2. Cross-Einsatz-Check (symmetrisch zum {@link GetGefaehrdungsbeurteilungHandler}):
 *    fremde `einsatzId` ⇒ `NOT_FOUND` (kein 403-Leak).
 * 3. `findVersionsByBeurteilung` laden.
 * 4. Distinct-`changedByUserId`-Set bilden und per `IUserRepository.findById`
 *    batched auflösen (ein `Promise.all`-Call, N Roundtrips — Plattform-Caching
 *    liegt außerhalb des Story-Scopes).
 * 5. Read-Model zusammenbauen; bei nicht auflösbarem User ⇒ `changedByUserName: null`
 *    (Defensive, nicht-blockierend — Historie wird **immer** geliefert).
 *
 * ## User-Namens-Resolution
 * Aktuell liefert `UserAggregate` nur `username.value` als anzeigbaren Namen
 * (siehe {@link IUserRepository} / `UserAggregate`). Eine plattformweite
 * Anreicherung mit `Nachname, Vorname` aus Stammperson ist als Cross-Cutting-
 * Task in einer späteren Story (vermutlich Story 5.2) geplant; der Vertrag
 * hier akzeptiert `string | null`, damit die spätere Erweiterung kompatibel
 * bleibt.
 */
@Injectable()
@QueryHandler(GetGefaehrdungsbeurteilungHistorieQuery)
export class GetGefaehrdungsbeurteilungHistorieHandler implements IQueryHandler<GetGefaehrdungsbeurteilungHistorieQuery, Result<HistorieReadModel>> {
  constructor(
    @Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)
    private readonly beurteilungRepo: IGefaehrdungsbeurteilungRepository,
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY)
    private readonly versionRepo: IGefaehrdungsbeurteilungVersionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetGefaehrdungsbeurteilungHistorieQuery): Promise<Result<HistorieReadModel>> {
    // 1. Read-Model laden.
    const readModelResult = await this.beurteilungRepo.findReadModelById(query.gefaehrdungsbeurteilungId);
    if (readModelResult.isFailure) {
      return Result.fail<HistorieReadModel>(readModelResult.error ?? 'Beurteilung konnte nicht geladen werden');
    }
    const readModel = readModelResult.value;
    if (!readModel) {
      return Result.fail<HistorieReadModel>(GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES.NOT_FOUND);
    }

    // 2. Cross-Einsatz-Check: fremder Einsatz ⇒ NotFound.
    if (readModel.aggregate.einsatzId !== query.einsatzId) {
      return Result.fail<HistorieReadModel>(GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES.NOT_FOUND);
    }

    // 3. Versions-Chain laden.
    const versionsResult = await this.versionRepo.findVersionsByBeurteilung(query.gefaehrdungsbeurteilungId);
    if (versionsResult.isFailure) {
      return Result.fail<HistorieReadModel>(versionsResult.error ?? 'Historie konnte nicht geladen werden');
    }
    const rows = versionsResult.value ?? [];

    // 4. Distinct-UserId-Batch-Resolve.
    const userIdToName = await this.resolveUserNames(rows);

    // 5. Read-Model zusammenbauen.
    const eintraege: HistorieEintragReadModel[] = rows.map((row) => ({
      version: row.version,
      gueltigVon: row.gueltigVon,
      gueltigBis: row.gueltigBis,
      changedByUserId: row.changedByUserId,
      changedByUserName: userIdToName.get(row.changedByUserId) ?? null,
      changedFields: row.changedFields,
      items: row.items,
    }));

    return Result.ok<HistorieReadModel>({
      aggregateVersion: readModel.aggregate.version,
      eintraege,
    });
  }

  /**
   * Batched User-Namens-Resolution für alle distinct `changedByUserId`-Werte
   * in der Versions-Chain. Pattern analog zu
   * `application/notiz/dto/notiz-response.factory.ts:23-58`.
   *
   * Für jede ID wird ein `IUserRepository.findById(UserId)`-Call abgesetzt
   * (`Promise.all` für Parallelität). Fehlschläge oder nicht gefundene User
   * führen zu `null` — die Historie ist **nie** blockiert durch User-Lookup-
   * Fehler (Defensive).
   */
  private async resolveUserNames(rows: readonly GefaehrdungsbeurteilungVersionRow[]): Promise<Map<string, string | null>> {
    const distinctIds = Array.from(new Set(rows.map((row) => row.changedByUserId)));
    const entries = await Promise.all(distinctIds.map(async (rawId): Promise<[string, string | null]> => [rawId, await this.resolveUserName(rawId)]));
    return new Map(entries);
  }

  /**
   * Löst einen Anzeige-Namen für eine einzelne User-ID auf; `null` bei:
   * - Invalidem CUID-Format (Defensive gegen Legacy-Rows).
   * - User nicht gefunden (soft-deleted / gelockt).
   * - Repository-Fehler (Defensive: Historie nicht blockieren).
   */
  private async resolveUserName(rawUserId: string): Promise<string | null> {
    const userIdResult = UserId.create(rawUserId);
    if (userIdResult.isFailure || !userIdResult.value) {
      return null;
    }
    const userResult = await this.userRepository.findById(userIdResult.value);
    if (userResult.isFailure || !userResult.value) {
      return null;
    }
    // Hinweis: `UserAggregate` trägt aktuell keinen aufgelösten Nachname/
    // Vorname — wir fallen auf `username.value` zurück. Eine plattformweite
    // Name-Resolution ist als Future-Work dokumentiert (siehe Klassen-JSDoc).
    return userResult.value.username.value;
  }
}
