import type { EigenschutzVorfall as PrismaEigenschutzVorfallRow, Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import { Beteiligter, type BeteiligterProps } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import { Wo, type WoProps } from '@domain/eigenschutz/value-objects/wo.vo';
import { EigenschutzKontextSnapshotV1 } from '@domain/eigenschutz/schemas/eigenschutz-snapshot.schema';

/**
 * Mapper zwischen Prisma-Row (`eigenschutz_vorfaelle`) und Domain-Aggregat
 * (Story 5.1).
 *
 * **`wo`-Vertrag (kritisch — kein Schema-Change in 5.1):**
 * - DB-Spalte `wo VARCHAR(500)` ist NOT NULL ohne Default.
 * - `Wo | null` (Domain) → `string` (DB): `null` → `""` (Empty-String-Sentinel),
 *   `Wo`-VO → `JSON.stringify(toJSON())`.
 * - `string` (DB) → `Wo | null` (Domain): `""` → `null`, sonst
 *   `JSON.parse + Wo.create`. Ungültiger JSON / unbekannter Discriminator
 *   liefert reconstitute-Failure (Repository mappt auf
 *   `InfrastructureError`-Sentinel).
 * - Aggregate-Invariante stellt sicher, dass `freitext.text.length ≥ 1` —
 *   Empty-String kollidiert nie mit `null`-Sentinel.
 */
export class PrismaEigenschutzVorfallMapper {
  static toDomain(row: PrismaEigenschutzVorfallRow): Result<EigenschutzVorfall> {
    const woResult = PrismaEigenschutzVorfallMapper.parseWo(row.wo);
    if (woResult.isFailure) {
      return Result.fail<EigenschutzVorfall>(woResult.error ?? 'Wo konnte nicht gelesen werden');
    }
    const beteiligteResult = PrismaEigenschutzVorfallMapper.parseBeteiligte(row.beteiligte);
    if (beteiligteResult.isFailure) {
      return Result.fail<EigenschutzVorfall>(beteiligteResult.error ?? 'Beteiligte konnten nicht gelesen werden');
    }
    const kontextSnapshotResult = PrismaEigenschutzVorfallMapper.parseKontextSnapshot(row.kontextSnapshot);
    if (kontextSnapshotResult.isFailure) {
      return Result.fail<EigenschutzVorfall>(kontextSnapshotResult.error ?? 'kontextSnapshot konnte nicht gelesen werden');
    }
    const kontextSnapshot = kontextSnapshotResult.value!;
    // Code-Review-Patch (P9): Fail-loud Konsistenz-Check zwischen JSONB-Snapshot
    // und FK-Spalte. 5.1-Bestand schreibt `{}` UND `null`-FK; ein V1-Snapshot
    // schreibt einen Snapshot mit Beurteilung ODER ohne — beides synchron.
    // Eine Row mit `kontextSnapshot={}` UND non-null `gefBeurteilungVersionId`
    // ist inkonsistent (5.1 hat keine Beurteilungs-FK gesetzt).
    if (Object.keys(kontextSnapshot).length === 0 && row.gefBeurteilungVersionId !== null) {
      return Result.fail<EigenschutzVorfall>('InfrastructureError:KontextSnapshotCorrupt:LegacyEmptyWithNonNullGefBeurteilungVersionId');
    }

    return EigenschutzVorfall.reconstitute({
      id: row.id,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      vorfallZeit: row.vorfallZeit,
      wann: row.wann,
      was: row.was,
      wo: woResult.value ?? null,
      beteiligte: beteiligteResult.value ?? [],
      massnahmen: row.massnahmen,
      unfallkasseRelevant: row.unfallkasseRelevant,
      erfasstVonUserId: row.erfasstVonUserId,
      erfasstAm: row.erfasstAm,
      kontextSnapshot,
      gefBeurteilungVersionId: row.gefBeurteilungVersionId,
    });
  }

  static toPrismaCreateInput(aggregate: EigenschutzVorfall): Prisma.EigenschutzVorfallUncheckedCreateInput {
    const beteiligteJson = aggregate.beteiligte.map((b) => ({ ...b })) as unknown as Prisma.InputJsonValue;
    const kontextSnapshotJson = aggregate.kontextSnapshot as unknown as Prisma.InputJsonValue;
    const woString = PrismaEigenschutzVorfallMapper.serializeWo(aggregate.wo);
    return {
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId,
      einheitId: aggregate.einheitId,
      vorfallZeit: aggregate.vorfallZeit,
      was: aggregate.was,
      wann: aggregate.wann,
      wo: woString,
      beteiligte: beteiligteJson,
      massnahmen: aggregate.massnahmen,
      unfallkasseRelevant: aggregate.unfallkasseRelevant,
      kontextSnapshot: kontextSnapshotJson,
      gefBeurteilungVersionId: aggregate.gefBeurteilungVersionId,
      erfasstAm: aggregate.erfasstAm,
      erfasstVonUserId: aggregate.erfasstVonUserId,
    };
  }

  static serializeWo(wo: Wo | null): string {
    if (wo === null) return '';
    return JSON.stringify(wo.toJSON());
  }

  static parseWo(raw: string): Result<Wo | null> {
    if (raw === '' || raw === null || raw === undefined) {
      return Result.ok<Wo | null>(null);
    }
    // Whitespace-only Strings sind kein gültiger Sentinel (`""`) und kein
    // gültiger JSON — DB-Korruption oder fehlerhafte Migration. Klare
    // Fehlermeldung, kein cryptic JSON.parse-Fehler.
    if (typeof raw !== 'string' || raw.trim() === '') {
      return Result.fail<Wo | null>('Wo-Payload ist whitespace-only oder kein String — DB-Korruption');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return Result.fail<Wo | null>(`Wo-JSON konnte nicht geparsed werden: ${error instanceof Error ? error.message : 'unknown'}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Result.fail<Wo | null>('Wo-Payload ist kein Objekt');
    }
    const value = parsed as Record<string, unknown>;
    if (value.kind === 'coordinate') {
      if (typeof value.longitude !== 'number' || !Number.isFinite(value.longitude)) {
        return Result.fail<Wo | null>('Wo.coordinate: longitude muss eine endliche Zahl sein');
      }
      if (typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)) {
        return Result.fail<Wo | null>('Wo.coordinate: latitude muss eine endliche Zahl sein');
      }
      const addressHint = typeof value.addressHint === 'string' ? value.addressHint : undefined;
      const props: WoProps = { kind: 'coordinate', longitude: value.longitude, latitude: value.latitude, ...(addressHint !== undefined ? { addressHint } : {}) };
      const result = Wo.create(props);
      if (result.isFailure || !result.value) return Result.fail<Wo | null>(result.error ?? 'Wo.coordinate ungültig');
      return Result.ok<Wo | null>(result.value);
    }
    if (value.kind === 'freitext') {
      const text = typeof value.text === 'string' ? value.text : '';
      const result = Wo.create({ kind: 'freitext', text });
      if (result.isFailure || !result.value) return Result.fail<Wo | null>(result.error ?? 'Wo.freitext ungültig');
      return Result.ok<Wo | null>(result.value);
    }
    return Result.fail<Wo | null>('Wo.kind ist unbekannt');
  }

  static parseBeteiligte(raw: unknown): Result<Beteiligter[]> {
    if (raw === null || raw === undefined) return Result.ok<Beteiligter[]>([]);
    if (!Array.isArray(raw)) {
      return Result.fail<Beteiligter[]>('Beteiligte-Payload ist kein Array');
    }
    const out: Beteiligter[] = [];
    // Append-only Audit-Invariante: invalide Einträge dürfen NICHT silent
    // gedroppt werden — sonst weicht das rehydrierte Aggregate von der
    // persistierten Realität ab. Bei jedem Fehler komplett failen.
    for (let idx = 0; idx < raw.length; idx += 1) {
      const entry = raw[idx];
      if (!entry || typeof entry !== 'object') {
        return Result.fail<Beteiligter[]>(`Beteiligter[${idx}]: Eintrag ist kein Objekt`);
      }
      const props = entry as unknown as BeteiligterProps;
      const result = Beteiligter.create(props);
      if (result.isFailure || !result.value) {
        return Result.fail<Beteiligter[]>(`Beteiligter[${idx}]: ${result.error ?? 'ungültig'}`);
      }
      out.push(result.value);
    }
    return Result.ok(out);
  }

  /**
   * Story 5.2 AC9 — fail-loud beim Lesen des `kontextSnapshot`-JSONB.
   *
   * - Literaler `{}`-Bestand (Story 5.1) → durchreichen (Reconstitute-Pfad
   *   im Aggregate akzeptiert Empty-Object).
   * - Valider V1-Snapshot → durchreichen.
   * - Alles andere (Array, primitive, korrupter JSONB) → `Result.fail` mit
   *   Sentinel `InfrastructureError:KontextSnapshotCorrupt:<reason>`. Der
   *   Repo-Pfad wandelt das in `INFRASTRUCTURE_ERROR_RECONSTITUTE` um.
   */
  static parseKontextSnapshot(raw: unknown): Result<Record<string, unknown>> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return Result.fail<Record<string, unknown>>('InfrastructureError:KontextSnapshotCorrupt:NotAnObject');
    }
    const obj = raw as Record<string, unknown>;
    // 5.1-Bestand: literaler Empty-Object — explizit erlaubt.
    if (Object.keys(obj).length === 0) {
      return Result.ok<Record<string, unknown>>({});
    }
    const parsed = EigenschutzKontextSnapshotV1.safeParse(obj);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'unbekannt';
      const trimmed = issue.length > 200 ? `${issue.slice(0, 200)}…` : issue;
      return Result.fail<Record<string, unknown>>(`InfrastructureError:KontextSnapshotCorrupt:${trimmed}`);
    }
    return Result.ok<Record<string, unknown>>(parsed.data as unknown as Record<string, unknown>);
  }
}
