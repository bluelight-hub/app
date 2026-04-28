import { AggregateRoot } from '@domain/common/aggregate-root';
import { EntityId } from '@domain/common/entity-id';
import { Result } from '@domain/common/result';
import type { PsaProfil } from '@/generated/prisma/enums';
import { PsaProfilGeaendertEvent } from '../events/psa-profil-geaendert.event';

/**
 * Sentinel-Error für Optimistic-Concurrency-Verletzungen beim Schließen
 * (Deaktivieren) einer aktiven `PsaProfilZuweisung`-Row. Der Repository-
 * Pfad ergänzt den Sentinel um `:current=<n>`, damit der Controller HTTP
 * 409 mit `context.currentVersion` + `context.attemptedVersion` rendern
 * kann (Pattern aus Story 2.3).
 */
export const PSA_PROFIL_CONFLICT_DETECTED = 'ConflictDetected:PsaProfilZuweisung';

/**
 * Sentinel-Error, wenn zwei parallele Operationen versuchen, dasselbe
 * `(einsatzId, einheitId, profil)`-Tripel als aktiv anzulegen (AC8).
 * Defense-in-Depth-Application-Guard im Repository UND ggf. Postgres-
 * Partial-Unique-Index `WHERE gueltig_bis IS NULL`.
 */
export const PSA_PROFIL_DUPLICATE_ACTIVE = 'ConflictDetected:DuplicateActivePsaProfilZuweisung';

const BEGRUENDUNG_MIN_LENGTH = 1;
const BEGRUENDUNG_MAX_LENGTH = 500;

export class PsaProfilZuweisungId extends EntityId<'PsaProfilZuweisung'> {}

export interface CreatePsaProfilZuweisungProps {
  id?: string;
  einsatzId: string;
  einheitId: string;
  profil: PsaProfil;
  begruendung: string;
  aktiviertVonUserId: string;
  propagationGroupId: string;
  gueltigVon?: Date;
}

export interface ReconstitutePsaProfilZuweisungProps {
  id: string;
  einsatzId: string;
  einheitId: string;
  profil: PsaProfil;
  gueltigVon: Date;
  gueltigBis: Date | null;
  aktiviertVonUserId: string;
  begruendung: string;
  propagationGroupId: string;
  version: number;
}

/**
 * Aggregate Root für eine PSA-Profil-Zuweisung (Story 3.1).
 *
 * **Invarianten:**
 * 1. `einsatzId`, `einheitId`, `aktiviertVonUserId`, `propagationGroupId`
 *    sind nicht-leere Strings.
 * 2. `begruendung` nach `.trim()` zwischen 1 und 500 Zeichen.
 * 3. `gueltigBis` ist entweder `null` (aktiv) oder ein Datum ≥ `gueltigVon`.
 * 4. `version` ≥ 1.
 *
 * **Lifecycle-Pfade:**
 * - **Aktivieren** (kein Vorprofil aktiv): `create()` → neue Row,
 *   `gueltigBis = null`, `version = 1`. Emittiert `PsaProfilGeaendertEvent`
 *   mit `aktion: 'AKTIVIERT'`.
 * - **Deaktivieren** (Profil aktiv): `deactivate(...)` auf das hydrierte
 *   Aggregate — schließt die Row (`gueltigBis = now()`, `version + 1`).
 *   Emittiert `PsaProfilGeaendertEvent` mit `aktion: 'DEAKTIVIERT'`.
 * - **Wechsel** A → B: zwei separate Aggregate-Operationen in derselben
 *   TX (close A + create B), beide mit identischer `propagationGroupId`.
 *
 * **Optimistic Concurrency:** Der Schließ-Pfad nutzt das `version`-Feld;
 * das Aggregate führt einen In-Memory-Check (`assertVersion`), der
 * Repository-Pfad sichert das DB-seitig via
 * `updateMany WHERE id = ? AND version = expectedVersion` (Story 2.3
 * Pattern). Der Aktivierungs-Pfad braucht keine Versions-Prüfung — er
 * INSERTet eine neue Row mit `version = 1`.
 */
export class PsaProfilZuweisung extends AggregateRoot<PsaProfilZuweisungId> {
  private constructor(
    id: PsaProfilZuweisungId,
    private readonly _einsatzId: string,
    private readonly _einheitId: string,
    private readonly _profil: PsaProfil,
    private readonly _gueltigVon: Date,
    private _gueltigBis: Date | null,
    private readonly _aktiviertVonUserId: string,
    private _begruendung: string,
    private readonly _propagationGroupId: string,
    private _version: number,
  ) {
    super(id);
  }

  static create(props: CreatePsaProfilZuweisungProps): Result<PsaProfilZuweisung> {
    const validation = PsaProfilZuweisung.validateBaseFields(props);
    if (validation.isFailure) {
      return Result.fail<PsaProfilZuweisung>(validation.error!);
    }
    const begruendungResult = PsaProfilZuweisung.validateBegruendung(props.begruendung);
    if (begruendungResult.isFailure) {
      return Result.fail<PsaProfilZuweisung>(begruendungResult.error!);
    }

    const idResult = PsaProfilZuweisungId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<PsaProfilZuweisung>(idResult.error ?? 'Ungültige PsaProfilZuweisungId');
    }

    const begruendung = props.begruendung.trim();
    if (props.gueltigVon !== undefined && (!(props.gueltigVon instanceof Date) || Number.isNaN(props.gueltigVon.getTime()))) {
      return Result.fail<PsaProfilZuweisung>('PsaProfilZuweisung.create: gueltigVon muss ein gültiges Datum sein');
    }
    const gueltigVon = props.gueltigVon ?? new Date();

    const aggregate = new PsaProfilZuweisung(
      idResult.value as PsaProfilZuweisungId,
      props.einsatzId,
      props.einheitId,
      props.profil,
      gueltigVon,
      null,
      props.aktiviertVonUserId,
      begruendung,
      props.propagationGroupId,
      1,
    );

    aggregate.addDomainEvent(
      new PsaProfilGeaendertEvent(
        props.einsatzId,
        props.aktiviertVonUserId,
        props.einheitId,
        aggregate.id.value,
        props.propagationGroupId,
        props.profil,
        'AKTIVIERT',
        begruendung,
        aggregate.id.value,
        gueltigVon,
      ),
    );

    return Result.ok(aggregate);
  }

  static reconstitute(props: ReconstitutePsaProfilZuweisungProps): Result<PsaProfilZuweisung> {
    const validation = PsaProfilZuweisung.validateBaseFields({
      einsatzId: props.einsatzId,
      einheitId: props.einheitId,
      profil: props.profil,
      aktiviertVonUserId: props.aktiviertVonUserId,
      propagationGroupId: props.propagationGroupId,
    });
    if (validation.isFailure) {
      return Result.fail<PsaProfilZuweisung>(`PsaProfilZuweisung.reconstitute: ${validation.error}`);
    }
    const begruendungResult = PsaProfilZuweisung.validateBegruendung(props.begruendung);
    if (begruendungResult.isFailure) {
      return Result.fail<PsaProfilZuweisung>(`PsaProfilZuweisung.reconstitute: ${begruendungResult.error}`);
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      return Result.fail<PsaProfilZuweisung>(`PsaProfilZuweisung.reconstitute: version muss Integer ≥ 1 sein (erhalten: ${String(props.version)})`);
    }
    if (!(props.gueltigVon instanceof Date) || Number.isNaN(props.gueltigVon.getTime())) {
      return Result.fail<PsaProfilZuweisung>('PsaProfilZuweisung.reconstitute: gueltigVon muss ein gültiges Datum sein');
    }
    if (props.gueltigBis !== null) {
      if (!(props.gueltigBis instanceof Date) || Number.isNaN(props.gueltigBis.getTime())) {
        return Result.fail<PsaProfilZuweisung>('PsaProfilZuweisung.reconstitute: gueltigBis muss null oder ein gültiges Datum sein');
      }
      if (props.gueltigBis.getTime() < props.gueltigVon.getTime()) {
        return Result.fail<PsaProfilZuweisung>('PsaProfilZuweisung.reconstitute: gueltigBis darf nicht vor gueltigVon liegen');
      }
    }

    const idResult = PsaProfilZuweisungId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<PsaProfilZuweisung>(`PsaProfilZuweisung.reconstitute: ungültige ID ${props.id} (${idResult.error ?? 'unknown'})`);
    }

    return Result.ok(
      new PsaProfilZuweisung(
        idResult.value as PsaProfilZuweisungId,
        props.einsatzId,
        props.einheitId,
        props.profil,
        props.gueltigVon,
        props.gueltigBis,
        props.aktiviertVonUserId,
        props.begruendung.trim(),
        props.propagationGroupId,
        props.version,
      ),
    );
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get einheitId(): string {
    return this._einheitId;
  }
  get profil(): PsaProfil {
    return this._profil;
  }
  get gueltigVon(): Date {
    return this._gueltigVon;
  }
  get gueltigBis(): Date | null {
    return this._gueltigBis;
  }
  get aktiviertVonUserId(): string {
    return this._aktiviertVonUserId;
  }
  get begruendung(): string {
    return this._begruendung;
  }
  get propagationGroupId(): string {
    return this._propagationGroupId;
  }
  get version(): number {
    return this._version;
  }
  get istAktiv(): boolean {
    return this._gueltigBis === null;
  }

  /**
   * Schließt die aktive Zuweisung — setzt `gueltigBis = now()`, inkrementiert
   * `version` und emittiert ein `PsaProfilGeaendertEvent` mit
   * `aktion: 'DEAKTIVIERT'`. Die `propagationGroupId` der Operation wird
   * vom Handler vererbt; beim Wechsel A → B teilen sich beide Events
   * (close A + create B) dieselbe Gruppen-ID.
   *
   * **Pre-Conditions:**
   * - Aggregate ist aktiv (`gueltigBis === null`); sonst
   *   `BusinessRule:PsaProfilBereitsDeaktiviert`.
   * - `expectedVersion === this.version`; sonst
   *   `ConflictDetected:PsaProfilZuweisung:current=<n>`.
   * - `userId` und `begruendung` sind gültig.
   */
  deactivate(props: { expectedVersion: number; userId: string; begruendung: string; propagationGroupId: string; gueltigBis?: Date }): Result<void> {
    if (!this.istAktiv) {
      return Result.fail<void>('BusinessRule:PsaProfilBereitsDeaktiviert');
    }
    if (this._version !== props.expectedVersion) {
      // AC5 (Story 3.2): Aggregate-OCC-Pfad ergänzt den Sentinel um
      // `:current=<n>`, damit der Controller `currentVersion` in den 409-Body
      // hebt. Format-Vertrag mit `mapMutationError`: `key=value`-Suffixe,
      // Reihenfolge nicht verbindlich.
      return Result.fail<void>(`${PSA_PROFIL_CONFLICT_DETECTED}:current=${this._version}`);
    }
    if (!props.userId || props.userId.trim().length === 0) {
      return Result.fail<void>('userId ist erforderlich');
    }
    if (!props.propagationGroupId || props.propagationGroupId.trim().length === 0) {
      return Result.fail<void>('propagationGroupId ist erforderlich');
    }
    const begruendungResult = PsaProfilZuweisung.validateBegruendung(props.begruendung);
    if (begruendungResult.isFailure) {
      return Result.fail<void>(begruendungResult.error!);
    }

    const begruendungTrim = props.begruendung.trim();
    const closingTimestamp = props.gueltigBis ?? new Date();
    if (closingTimestamp.getTime() < this._gueltigVon.getTime()) {
      return Result.fail<void>('gueltigBis darf nicht vor gueltigVon liegen');
    }

    this._gueltigBis = closingTimestamp;
    this._begruendung = begruendungTrim;
    this._version = this._version + 1;

    this.addDomainEvent(
      new PsaProfilGeaendertEvent(
        this._einsatzId,
        props.userId,
        this._einheitId,
        this.id.value,
        props.propagationGroupId,
        this._profil,
        'DEAKTIVIERT',
        begruendungTrim,
        this.id.value,
        closingTimestamp,
      ),
    );

    return Result.ok();
  }

  private static validateBaseFields(props: { einsatzId: string; einheitId: string; profil: PsaProfil; aktiviertVonUserId: string; propagationGroupId: string }): Result<void> {
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<void>('einsatzId ist erforderlich');
    }
    if (!props.einheitId || props.einheitId.trim().length === 0) {
      return Result.fail<void>('einheitId ist erforderlich');
    }
    if (!props.profil || typeof props.profil !== 'string') {
      return Result.fail<void>('profil ist erforderlich');
    }
    if (!props.aktiviertVonUserId || props.aktiviertVonUserId.trim().length === 0) {
      return Result.fail<void>('aktiviertVonUserId ist erforderlich');
    }
    if (!props.propagationGroupId || props.propagationGroupId.trim().length === 0) {
      return Result.fail<void>('propagationGroupId ist erforderlich');
    }
    return Result.ok();
  }

  private static validateBegruendung(begruendung: string): Result<void> {
    if (typeof begruendung !== 'string') {
      return Result.fail<void>('begruendung muss ein String sein');
    }
    const trim = begruendung.trim();
    if (trim.length < BEGRUENDUNG_MIN_LENGTH) {
      return Result.fail<void>('begruendung ist erforderlich');
    }
    if (trim.length > BEGRUENDUNG_MAX_LENGTH) {
      return Result.fail<void>(`begruendung darf höchstens ${BEGRUENDUNG_MAX_LENGTH} Zeichen lang sein`);
    }
    return Result.ok();
  }
}
