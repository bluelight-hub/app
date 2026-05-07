import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type {
  IGefaehrdungsbeurteilungVersionRepository,
  IPsaProfilZuweisungReadRepository,
  ISicherheitsregelVersionRepository,
  PsaProfilZuweisungReadRow,
  SicherheitsregelVersionAtTimeRow,
} from '@domain/eigenschutz/repositories';
import { GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, LOGGER, PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY, SICHERHEITSREGEL_VERSION_REPOSITORY } from '@infrastructure/di-tokens';
import {
  EigenschutzKontextSnapshotV1,
  type EigenschutzKontextSnapshotV1Type,
  type GefaehrdungsbeurteilungSnapshotV1Type,
  type PsaProfilSnapshotV1Type,
  type SicherheitsregelSnapshotV1Type,
} from '@domain/eigenschutz/schemas/eigenschutz-snapshot.schema';

/**
 * Story 5.2 AC7 — Application-Service zum Bauen eines `EigenschutzKontextSnapshotV1`
 * für einen neuen Vorfall.
 *
 * Komponiert drei Domain-Ports parallel (`Promise.all`) und reduziert die
 * Treffer auf die Schema-Shape. Defense-in-Depth: nach dem Zusammenbau wird
 * das Resultat erneut gegen das Vertrags-Schema geparst — Sentinel
 * `Invariant:KontextSnapshotBuilder:OutputSchemaDrift:*` greift, falls eine
 * Repo-Mapper-Drift unerwartete Felder einschleust.
 *
 * **Composing Service:** Der Builder ist NICHT als Domain-Port modelliert —
 * er ist ein Application-Layer-Composing-Service über drei bereits existente
 * Ports (Pattern: vergleichbar mit `MeldeLueckeHandler`-Hilfsfunktionen).
 */
@Injectable()
export class KontextSnapshotBuilder {
  constructor(
    @Inject(GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY)
    private readonly gefVersionRepo: IGefaehrdungsbeurteilungVersionRepository,
    @Inject(PSA_PROFIL_ZUWEISUNG_READ_REPOSITORY)
    private readonly psaReadRepo: IPsaProfilZuweisungReadRepository,
    @Inject(SICHERHEITSREGEL_VERSION_REPOSITORY)
    private readonly sicherheitsregelVersionRepo: ISicherheitsregelVersionRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async build(args: { einsatzId: string; einheitId: string; snapshotAt: Date; tx: TransactionContext }): Promise<Result<EigenschutzKontextSnapshotV1Type>> {
    const [gefResult, psaResult, regelnResult] = await Promise.all([
      this.gefVersionRepo.findVersionAtTimeForEinheit(args.einsatzId, args.einheitId, args.snapshotAt, args.tx),
      this.psaReadRepo.findActiveProfileByEinheitAtTime(args.einsatzId, args.einheitId, args.snapshotAt, args.tx),
      this.sicherheitsregelVersionRepo.findVersionsForEinheitAtTime(args.einsatzId, args.einheitId, args.snapshotAt, args.tx),
    ]);

    if (gefResult.isFailure) {
      return Result.fail<EigenschutzKontextSnapshotV1Type>(`InfrastructureError:KontextSnapshotBuilder:GefaehrdungsbeurteilungReadFailed:${trim(gefResult.error)}`);
    }
    if (psaResult.isFailure) {
      return Result.fail<EigenschutzKontextSnapshotV1Type>(`InfrastructureError:KontextSnapshotBuilder:PsaProfileReadFailed:${trim(psaResult.error)}`);
    }
    if (regelnResult.isFailure) {
      return Result.fail<EigenschutzKontextSnapshotV1Type>(`InfrastructureError:KontextSnapshotBuilder:SicherheitsregelnReadFailed:${trim(regelnResult.error)}`);
    }

    const gefRow = gefResult.value ?? null;
    const psaRows: PsaProfilZuweisungReadRow[] = psaResult.value ?? [];
    const regelnRows: SicherheitsregelVersionAtTimeRow[] = regelnResult.value ?? [];

    // Code-Review-Patch (P5): Invariant gegen Mehrfach-aktive Versionen pro
    // `regelId`. Eine korrupte Sicherheitsregel-Version-Chain (überlappende
    // halb-offene Intervalle) darf NICHT in einen mehrdeutigen Snapshot
    // münden — fail-loud, damit der Defekt sichtbar bleibt.
    const overlapping = findOverlappingRegelVersions(regelnRows);
    if (overlapping !== null) {
      return Result.fail<EigenschutzKontextSnapshotV1Type>(`Invariant:KontextSnapshotBuilder:OverlappingRegelVersions:${overlapping}`);
    }

    const snapshot = {
      schemaVersion: 1 as const,
      snapshotAt: args.snapshotAt.toISOString(),
      einsatzId: args.einsatzId,
      einheitId: args.einheitId,
      gefaehrdungsbeurteilung: gefRow ? mapGefaehrdungsbeurteilung(gefRow) : null,
      aktivePsaProfile: psaRows.map(mapPsaProfil),
      sicherheitsregeln: dedupeRegeln(regelnRows, args.einheitId),
    };

    const validation = EigenschutzKontextSnapshotV1.safeParse(snapshot);
    if (!validation.success) {
      const issue = trim(validation.error.issues[0]?.message ?? 'unbekannt');
      this.logger.error('KontextSnapshotBuilder: Output-Schema-Drift erkannt', {
        einsatzId: args.einsatzId,
        einheitId: args.einheitId,
        snapshotAt: args.snapshotAt.toISOString(),
        issue,
      });
      return Result.fail<EigenschutzKontextSnapshotV1Type>(`Invariant:KontextSnapshotBuilder:OutputSchemaDrift:${issue}`);
    }

    return Result.ok(validation.data);
  }
}

function mapGefaehrdungsbeurteilung(row: {
  gefBeurteilungId: string;
  versionId: string;
  version: number;
  items: Array<{ toJSON?: () => unknown }>;
  gueltigVon: Date;
}): GefaehrdungsbeurteilungSnapshotV1Type {
  // `versionId` ist die Versions-Row-PK (FK-Ziel von
  // `EigenschutzVorfall.gefBeurteilungVersionId`); `gefBeurteilungId` ist
  // der Parent-Aggregat-Schlüssel und gehört NICHT in den Snapshot.
  return {
    versionId: row.versionId,
    version: row.version,
    gueltigVon: row.gueltigVon.toISOString(),
    // Items sind Domain-VOs — toJSON liefert die Persistenz-Form, die der
    // Shared-Schema-Validator akzeptiert.
    items: row.items.map((item) => (typeof item.toJSON === 'function' ? (item.toJSON() as { title: string; [k: string]: unknown }) : (item as unknown as { title: string; [k: string]: unknown }))),
  };
}

function mapPsaProfil(row: PsaProfilZuweisungReadRow): PsaProfilSnapshotV1Type {
  return {
    id: row.id,
    profil: row.profil,
    gueltigVon: row.gueltigVon.toISOString(),
    gueltigBis: row.gueltigBis ? row.gueltigBis.toISOString() : null,
    begruendung: row.begruendung,
    propagationGroupId: row.propagationGroupId,
  };
}

/**
 * Dedupliziert pro `regelId+versionId`-Schlüssel und aggregiert die zugehörigen
 * `einheitIds`. Eine einsatzweite Regel wird im Snapshot der angefragten
 * Einheit mit dieser einen `einheitId` gelistet (kein Cross-Einheit-Bleed —
 * die Repo-Query filtert ohnehin auf die anfragende Einheit, einsatzweite
 * Regeln matchen aber zusätzlich). Konkret zugeordnete Regeln behalten ihre
 * `einheitId`. Bei einer reinen Einzel-Einheits-Abfrage ist die resultierende
 * `einheitIds`-Liste trivial — der Builder hält trotzdem die Array-Shape
 * konsistent zum Vertrags-Schema (AC1), damit zukünftige Multi-Einheit-
 * Snapshots dieselbe Form nutzen können.
 */
function dedupeRegeln(rows: SicherheitsregelVersionAtTimeRow[], einheitId: string): SicherheitsregelSnapshotV1Type[] {
  const byKey = new Map<string, SicherheitsregelSnapshotV1Type>();
  for (const row of rows) {
    const key = `${row.regelId}::${row.versionId}`;
    const existing = byKey.get(key);
    if (existing) {
      const targetEinheit = row.einheitId ?? einheitId;
      if (!existing.einheitIds.includes(targetEinheit)) {
        existing.einheitIds = [...existing.einheitIds, targetEinheit];
      }
      continue;
    }
    byKey.set(key, {
      regelId: row.regelId,
      versionId: row.versionId,
      version: row.version,
      titel: row.titel,
      inhalt: row.inhalt,
      einsatzweit: row.einsatzweit,
      einheitIds: [row.einheitId ?? einheitId],
      gueltigVon: row.gueltigVon.toISOString(),
    });
  }
  return Array.from(byKey.values());
}

function trim(value: string | undefined): string {
  if (!value) return 'unknown';
  const MAX = 200;
  return value.length > MAX ? `${value.slice(0, MAX)}…` : value;
}

/**
 * Erkennt mehrere aktive Versionen pro `regelId` zum `snapshotAt`. Die Repo-
 * Query darf pro `regelId` höchstens eine Version liefern (halb-offenes
 * Intervall garantiert das); zwei oder mehr Versionen für dieselbe `regelId`
 * sind ein Daten-Defekt und müssen fail-loud signalisiert werden.
 *
 * @returns die kollidierende `regelId` oder `null` wenn alles eindeutig.
 */
function findOverlappingRegelVersions(rows: SicherheitsregelVersionAtTimeRow[]): string | null {
  const seenRegelVersionen = new Map<string, string>();
  for (const row of rows) {
    const existingVersionId = seenRegelVersionen.get(row.regelId);
    if (existingVersionId !== undefined && existingVersionId !== row.versionId) {
      return row.regelId;
    }
    if (existingVersionId === undefined) {
      seenRegelVersionen.set(row.regelId, row.versionId);
    }
  }
  return null;
}
