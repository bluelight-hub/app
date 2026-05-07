import { Result } from '@domain/common/result';
import { EigenschutzKontextSnapshotV1, type EigenschutzKontextSnapshotV1Type } from '../schemas/eigenschutz-snapshot.schema';

/**
 * Story 5.2 — Domain-VO `KontextSnapshot`.
 *
 * Hält die Snapshot-Invariante (`schemaVersion === 1`, strict-Shape) für die
 * Vorfall-Dokumentation. Validation läuft via Zod (`EigenschutzKontextSnapshotV1`)
 * — Zod hat keine NestJS-/Prisma-Bindung und ist als Cross-Layer-Schema-Lib
 * im Domain-Layer zulässig (Pattern Story 2.1 `gefaehrdung-item.vo.ts`).
 *
 * Sentinels:
 * - `ValidationFailed:KontextSnapshot:SchemaParseError:<zod-issue>` (max 200
 *   Zeichen, kein PII) — Konstruktion eines neuen Snapshots aus Builder-Output.
 * - `InfrastructureError:KontextSnapshotCorrupt:<zod-issue>` — Re-Konstituierung
 *   aus DB-JSONB schlägt fehl (Mapper-Fail-Loud, AC9).
 */
export class KontextSnapshot {
  private constructor(private readonly props: EigenschutzKontextSnapshotV1Type) {}

  /**
   * Konstruktion aus Builder-/Application-Output. Schlägt mit
   * `ValidationFailed:KontextSnapshot:SchemaParseError:*` fehl, wenn die
   * übergebene Struktur nicht V1-konform ist.
   */
  static create(props: unknown): Result<KontextSnapshot> {
    const parsed = EigenschutzKontextSnapshotV1.safeParse(props);
    if (!parsed.success) {
      const issue = trimZodIssue(parsed.error.issues[0]?.message ?? 'unbekannter Fehler');
      return Result.fail<KontextSnapshot>(`ValidationFailed:KontextSnapshot:SchemaParseError:${issue}`);
    }
    return Result.ok(new KontextSnapshot(parsed.data));
  }

  /**
   * Re-Konstituierung aus persistiertem JSONB. Identische Validation, anderer
   * Sentinel — der Caller (Repo/Mapper) mappt diesen auf einen 500-Server-Error,
   * weil ein korrupter Snapshot ein Infrastruktur-Defekt und kein Input-Fehler ist.
   */
  static reconstitute(raw: unknown): Result<KontextSnapshot> {
    const parsed = EigenschutzKontextSnapshotV1.safeParse(raw);
    if (!parsed.success) {
      const issue = trimZodIssue(parsed.error.issues[0]?.message ?? 'unbekannter Fehler');
      return Result.fail<KontextSnapshot>(`InfrastructureError:KontextSnapshotCorrupt:${issue}`);
    }
    return Result.ok(new KontextSnapshot(parsed.data));
  }

  /**
   * Liefert eine immutable Deep-Copy der Snapshot-Daten. Nutzer dürfen das
   * Resultat mutieren, ohne den VO-Zustand zu beeinflussen.
   */
  toJSON(): EigenschutzKontextSnapshotV1Type {
    return structuredClone(this.props);
  }

  get schemaVersion(): 1 {
    return this.props.schemaVersion;
  }

  get einsatzId(): string {
    return this.props.einsatzId;
  }

  get einheitId(): string {
    return this.props.einheitId;
  }

  /**
   * FK-Hint für `EigenschutzVorfall.gefBeurteilungVersionId` (Architektur §F
   * Z. 1138-1140). `null`, wenn die Einheit zum Vorfallzeitpunkt keine
   * Beurteilung hatte.
   */
  get gefBeurteilungVersionId(): string | null {
    return this.props.gefaehrdungsbeurteilung?.versionId ?? null;
  }
}

/** Trim-Helper für Zod-Issue-Messages — vermeidet PII-Leak im Sentinel. */
function trimZodIssue(message: string): string {
  const MAX = 200;
  return message.length > MAX ? `${message.slice(0, MAX)}…` : message;
}
