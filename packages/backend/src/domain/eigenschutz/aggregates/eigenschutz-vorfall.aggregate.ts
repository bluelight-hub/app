import { AggregateRoot } from '@domain/common/aggregate-root';
import { EntityId } from '@domain/common/entity-id';
import { Result } from '@domain/common/result';
import { VorfallGemeldetEvent } from '../events/vorfall-gemeldet.event';
import { VorfallGeschlossenEvent } from '../events/vorfall-geschlossen.event';
import { Beteiligter, type BeteiligterProps } from '../value-objects/beteiligter.vo';
import { KontextSnapshot } from '../value-objects/kontext-snapshot.vo';
import { Wo } from '../value-objects/wo.vo';

/**
 * Sentinel-Errors aus `EigenschutzVorfall.create`. Der Controller mappt
 * `BusinessRule:WallclockDriftTooLarge` auf HTTP 422 mit dem Sentinel-Namen
 * im `rule`-Feld der Wrapped-Error-Response.
 */
export const VORFALL_WALLCLOCK_DRIFT = 'BusinessRule:WallclockDriftTooLarge';

/**
 * Sentinel — Vorfall ist bereits geschlossen. Mapping zur HTTP-Schicht:
 * Controller → 422 mit `rule: 'VorfallBereitsGeschlossen'`.
 */
export const VORFALL_BEREITS_GESCHLOSSEN = 'BusinessRule:VorfallBereitsGeschlossen';

const WAS_MIN = 1;
const WAS_MAX = 80;
const MASSNAHMEN_MAX = 4000;
const VORFALL_ZEIT_FUTURE_SLACK_MS = 5 * 60 * 1000;
const SCHLIESSUNGS_BEGRUENDUNG_MAX = 500;

export class EigenschutzVorfallId extends EntityId<'EigenschutzVorfall'> {}

export interface CreateEigenschutzVorfallProps {
  id?: string;
  einsatzId: string;
  einheitId: string;
  vorfallZeit: Date;
  wann: Date;
  was: string;
  wo: Wo | null;
  beteiligte: readonly Beteiligter[];
  massnahmen: string;
  unfallkasseRelevant: boolean;
  erfasstVonUserId: string;
  erfasstAm?: Date;
  kontextSnapshot: Record<string, unknown>;
  gefBeurteilungVersionId?: string | null;
  now?: Date;
}

export interface ReconstituteEigenschutzVorfallProps {
  id: string;
  einsatzId: string;
  einheitId: string;
  vorfallZeit: Date;
  wann: Date;
  was: string;
  wo: Wo | null;
  beteiligte: readonly Beteiligter[];
  massnahmen: string;
  unfallkasseRelevant: boolean;
  erfasstVonUserId: string;
  erfasstAm: Date;
  kontextSnapshot: Record<string, unknown>;
  gefBeurteilungVersionId: string | null;
  // Issue #415 — Closure-Metadaten (alle drei zusammen `null` für offene
  // Vorfälle; alle drei zusammen befüllt für geschlossene). Defense-in-Depth-
  // Check passiert im Reconstitute-Pfad.
  geschlossenAm?: Date | null;
  geschlossenVonUserId?: string | null;
  schliessungsBegruendung?: string | null;
}

/**
 * Aggregate Root für einen Eigenschutz-Vorfall (Story 5.1, FR31/FR32).
 *
 * **Append-only (Original-Recording):** Die Felder des ursprünglichen Vorfalls
 * (`was`, `wann`, `wo`, `beteiligte`, `massnahmen`, `vorfallZeit`,
 * `unfallkasseRelevant`, `kontextSnapshot`) sind nach `create()` unveränderlich.
 * Audit-Integrität + Snapshot-Invariante (Architektur §B2) verbieten
 * retroaktive Mutation. Edit-Pfad ist Phase-2 mit eigener Versions-Chain-Story.
 *
 * **Schließung (Issue #415) ist additive Information, keine Mutation:** Drei
 * nullable Closure-Felder (`geschlossenAm`, `geschlossenVonUserId`,
 * `schliessungsBegruendung`) werden via `close()` einmalig befüllt und
 * dokumentieren einen neuen Fakt über den Vorfall, ohne das Original-Recording
 * anzutasten. Re-Open ist nicht vorgesehen — `close()` ist idempotent gegen
 * Doppel-Klick, ein zweiter Aufruf liefert `BusinessRule:VorfallBereitsGeschlossen`.
 *
 * **`kontextSnapshot`-Vertrag:** In Story 5.1 schrieb der Handler `{}` als
 * Stub. Seit Story 5.2 baut der `ReportVorfallHandler` für **neue** Vorfälle
 * den Snapshot via `KontextSnapshotBuilder` und `create()` erzwingt eine
 * V1-konforme Shape. Reconstitute akzeptiert weiterhin `{}` (5.1-Bestand)
 * ODER V1 — bestehende `{}`-Zeilen werden NIE rückwirkend befüllt.
 * Snapshots sind unveränderlich (Architektur §B2).
 *
 * **`Wo | null`-Vertrag:** Aggregate hält `Wo | null` (Epic „optional"). Der
 * Mapper konvertiert `null ↔ ""` (Empty-String-Sentinel), weil die DB-Spalte
 * `EigenschutzVorfall.wo VARCHAR(500)` NOT NULL ist und Story 5.1 keine
 * Migration zieht. Aggregate-Invariante stellt sicher, dass `freitext.text`
 * mindestens 1 Zeichen hat — Empty-String kollidiert nie mit `null`-Sentinel.
 */
export class EigenschutzVorfall extends AggregateRoot<EigenschutzVorfallId> {
  // Issue #415 — Closure-Felder sind mutable (einmaliger Übergang
  // OFFEN → GESCHLOSSEN). Das Original-Recording (alle anderen Felder) bleibt
  // `readonly` — siehe Klassen-Doku.
  private _geschlossenAm: Date | null;
  private _geschlossenVonUserId: string | null;
  private _schliessungsBegruendung: string | null;

  private constructor(
    id: EigenschutzVorfallId,
    private readonly _einsatzId: string,
    private readonly _einheitId: string,
    private readonly _vorfallZeit: Date,
    private readonly _wann: Date,
    private readonly _was: string,
    private readonly _wo: Wo | null,
    private readonly _beteiligte: readonly Beteiligter[],
    private readonly _massnahmen: string,
    private readonly _unfallkasseRelevant: boolean,
    private readonly _erfasstVonUserId: string,
    private readonly _erfasstAm: Date,
    private readonly _kontextSnapshot: Record<string, unknown>,
    private readonly _gefBeurteilungVersionId: string | null,
    geschlossenAm: Date | null = null,
    geschlossenVonUserId: string | null = null,
    schliessungsBegruendung: string | null = null,
  ) {
    super(id);
    this._geschlossenAm = geschlossenAm;
    this._geschlossenVonUserId = geschlossenVonUserId;
    this._schliessungsBegruendung = schliessungsBegruendung;
  }

  static create(props: CreateEigenschutzVorfallProps): Result<EigenschutzVorfall> {
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<EigenschutzVorfall>('einsatzId ist erforderlich');
    }
    if (!props.einheitId || props.einheitId.trim().length === 0) {
      return Result.fail<EigenschutzVorfall>('einheitId ist erforderlich');
    }
    if (!props.erfasstVonUserId || props.erfasstVonUserId.trim().length === 0) {
      return Result.fail<EigenschutzVorfall>('erfasstVonUserId ist erforderlich');
    }
    if (!(props.vorfallZeit instanceof Date) || Number.isNaN(props.vorfallZeit.getTime())) {
      return Result.fail<EigenschutzVorfall>('vorfallZeit ist erforderlich');
    }
    if (!(props.wann instanceof Date) || Number.isNaN(props.wann.getTime())) {
      return Result.fail<EigenschutzVorfall>('wann ist erforderlich');
    }

    const now = props.now ?? new Date();
    if (props.vorfallZeit.getTime() > now.getTime() + VORFALL_ZEIT_FUTURE_SLACK_MS) {
      return Result.fail<EigenschutzVorfall>(VORFALL_WALLCLOCK_DRIFT);
    }
    if (props.wann.getTime() > now.getTime() + VORFALL_ZEIT_FUTURE_SLACK_MS) {
      return Result.fail<EigenschutzVorfall>(VORFALL_WALLCLOCK_DRIFT);
    }

    const was = props.was?.trim() ?? '';
    if (was.length < WAS_MIN) {
      return Result.fail<EigenschutzVorfall>('was ist erforderlich');
    }
    if (was.length > WAS_MAX) {
      return Result.fail<EigenschutzVorfall>(`was darf maximal ${WAS_MAX} Zeichen haben`);
    }

    if (props.wo !== null && !(props.wo instanceof Wo)) {
      return Result.fail<EigenschutzVorfall>('wo muss ein Wo-VO oder null sein');
    }

    if (!Array.isArray(props.beteiligte)) {
      return Result.fail<EigenschutzVorfall>('beteiligte muss ein Array sein');
    }
    for (const entry of props.beteiligte) {
      if (!(entry instanceof Beteiligter)) {
        return Result.fail<EigenschutzVorfall>('beteiligte: jeder Eintrag muss ein Beteiligter-VO sein');
      }
    }

    const massnahmen = props.massnahmen ?? '';
    if (typeof massnahmen !== 'string') {
      return Result.fail<EigenschutzVorfall>('massnahmen muss ein String sein');
    }
    if (massnahmen.length > MASSNAHMEN_MAX) {
      return Result.fail<EigenschutzVorfall>(`massnahmen darf maximal ${MASSNAHMEN_MAX} Zeichen haben`);
    }

    if (typeof props.unfallkasseRelevant !== 'boolean') {
      return Result.fail<EigenschutzVorfall>('unfallkasseRelevant muss ein Boolean sein');
    }

    // Story 5.2 AC3: Snapshot muss V1-konform sein. Story 5.1-Bestand mit `{}`
    // läuft NICHT durch `create()` — der Reconstitute-Pfad lässt `{}` weiter zu.
    const snapshotResult = KontextSnapshot.create(props.kontextSnapshot);
    if (snapshotResult.isFailure || !snapshotResult.value) {
      return Result.fail<EigenschutzVorfall>(snapshotResult.error ?? 'kontextSnapshot ungültig');
    }
    const snapshotJson = snapshotResult.value.toJSON();
    // Aggregate-FK auf `gefaehrdungsbeurteilung_versionen.id` muss immer aus dem
    // Snapshot abgeleitet werden — explizit übergebener Wert bleibt nur als
    // optionaler Shortcut für reconstitute-Pfade. In `create()` ist der Snapshot
    // die Authoritative-Quelle.
    const gefBeurteilungVersionId = snapshotResult.value.gefBeurteilungVersionId;

    const idResult = EigenschutzVorfallId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<EigenschutzVorfall>(idResult.error ?? 'Ungültige ID');
    }

    const aggregate = new EigenschutzVorfall(
      idResult.value as EigenschutzVorfallId,
      props.einsatzId,
      props.einheitId,
      props.vorfallZeit,
      props.wann,
      was,
      props.wo,
      [...props.beteiligte],
      massnahmen,
      props.unfallkasseRelevant,
      props.erfasstVonUserId,
      props.erfasstAm ?? now,
      snapshotJson as Record<string, unknown>,
      gefBeurteilungVersionId,
    );

    aggregate.addDomainEvent(new VorfallGemeldetEvent(props.einsatzId, props.erfasstVonUserId, props.einheitId, aggregate.id.value, props.vorfallZeit, props.unfallkasseRelevant));

    return Result.ok(aggregate);
  }

  static reconstitute(props: ReconstituteEigenschutzVorfallProps): Result<EigenschutzVorfall> {
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<EigenschutzVorfall>('reconstitute: einsatzId ist erforderlich');
    }
    if (!props.einheitId || props.einheitId.trim().length === 0) {
      return Result.fail<EigenschutzVorfall>('reconstitute: einheitId ist erforderlich');
    }
    if (!Array.isArray(props.beteiligte)) {
      return Result.fail<EigenschutzVorfall>('reconstitute: beteiligte muss ein Array sein');
    }
    // Story 5.2 AC3: Reconstitute-Pfad akzeptiert `{}` (5.1-Bestand) ODER eine
    // V1-Snapshot-Shape. Der Mapper fängt korrupte Daten primär ab (AC9), aber
    // Defense-in-Depth: für non-`{}`-Inputs prüfen wir hier zusätzlich gegen
    // das V1-Schema, damit ein Caller, der den Mapper umgeht (Test-Helper,
    // ETL-Pfad), keinen korrupten Snapshot ins Aggregate injizieren kann.
    if (!props.kontextSnapshot || typeof props.kontextSnapshot !== 'object' || Array.isArray(props.kontextSnapshot)) {
      return Result.fail<EigenschutzVorfall>('reconstitute: kontextSnapshot muss ein Objekt sein');
    }
    if (Object.keys(props.kontextSnapshot).length > 0) {
      const snapshotResult = KontextSnapshot.reconstitute(props.kontextSnapshot);
      if (snapshotResult.isFailure || !snapshotResult.value) {
        return Result.fail<EigenschutzVorfall>(snapshotResult.error ?? 'reconstitute: kontextSnapshot ungültig');
      }
    }
    const idResult = EigenschutzVorfallId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<EigenschutzVorfall>(`reconstitute: ungültige ID ${props.id}`);
    }

    // Issue #415: Closure-Felder konsistent prüfen. Entweder alle drei `null`
    // (offener Vorfall) ODER `geschlossenAm` + `geschlossenVonUserId` befüllt
    // (`schliessungsBegruendung` darf zusätzlich `null` sein — User-optional).
    const geschlossenAm = props.geschlossenAm ?? null;
    const geschlossenVonUserId = props.geschlossenVonUserId ?? null;
    const schliessungsBegruendung = props.schliessungsBegruendung ?? null;
    const hasClosureTimestamp = geschlossenAm !== null;
    const hasClosureUser = geschlossenVonUserId !== null;
    if (hasClosureTimestamp !== hasClosureUser) {
      return Result.fail<EigenschutzVorfall>('reconstitute: geschlossenAm und geschlossenVonUserId müssen gemeinsam gesetzt oder gemeinsam null sein');
    }
    if (!hasClosureTimestamp && schliessungsBegruendung !== null) {
      return Result.fail<EigenschutzVorfall>('reconstitute: schliessungsBegruendung darf nur bei geschlossenem Vorfall gesetzt sein');
    }
    if (geschlossenAm !== null && (!(geschlossenAm instanceof Date) || Number.isNaN(geschlossenAm.getTime()))) {
      return Result.fail<EigenschutzVorfall>('reconstitute: geschlossenAm ist kein gültiges Datum');
    }

    return Result.ok(
      new EigenschutzVorfall(
        idResult.value as EigenschutzVorfallId,
        props.einsatzId,
        props.einheitId,
        props.vorfallZeit,
        props.wann,
        props.was,
        props.wo,
        [...props.beteiligte],
        props.massnahmen,
        props.unfallkasseRelevant,
        props.erfasstVonUserId,
        props.erfasstAm,
        { ...props.kontextSnapshot },
        props.gefBeurteilungVersionId,
        geschlossenAm,
        geschlossenVonUserId,
        schliessungsBegruendung,
      ),
    );
  }

  /**
   * Schließt den Vorfall (Issue #415). Idempotent: ein zweiter Aufruf bei
   * bereits geschlossenem Vorfall liefert
   * `BusinessRule:VorfallBereitsGeschlossen`.
   *
   * - `userId` ist Pflicht (Audit-Akteur).
   * - `begruendung` ist optional. Empty-String wird als `null` behandelt;
   *   getrimmte Eingabe > 500 Zeichen wird abgelehnt.
   * - Emittiert `VorfallGeschlossenEvent` bei Erfolg.
   */
  close(userId: string, begruendung?: string | null, now?: Date): Result<VorfallGeschlossenEvent> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<VorfallGeschlossenEvent>('userId ist erforderlich');
    }
    if (this._geschlossenAm !== null) {
      return Result.fail<VorfallGeschlossenEvent>(VORFALL_BEREITS_GESCHLOSSEN);
    }

    let normalizedBegruendung: string | null = null;
    if (begruendung !== undefined && begruendung !== null) {
      if (typeof begruendung !== 'string') {
        return Result.fail<VorfallGeschlossenEvent>('begruendung muss ein String sein');
      }
      const trimmed = begruendung.trim();
      if (trimmed.length === 0) {
        normalizedBegruendung = null;
      } else if (trimmed.length > SCHLIESSUNGS_BEGRUENDUNG_MAX) {
        return Result.fail<VorfallGeschlossenEvent>(`begruendung darf maximal ${SCHLIESSUNGS_BEGRUENDUNG_MAX} Zeichen haben`);
      } else {
        normalizedBegruendung = trimmed;
      }
    }

    const closedAt = now ?? new Date();
    if (!(closedAt instanceof Date) || Number.isNaN(closedAt.getTime())) {
      return Result.fail<VorfallGeschlossenEvent>('now ist kein gültiges Datum');
    }

    this._geschlossenAm = closedAt;
    this._geschlossenVonUserId = userId;
    this._schliessungsBegruendung = normalizedBegruendung;

    const event = new VorfallGeschlossenEvent(this._einsatzId, userId, this._einheitId, this.id.value, closedAt);
    this.addDomainEvent(event);
    return Result.ok<VorfallGeschlossenEvent>(event);
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get einheitId(): string {
    return this._einheitId;
  }
  get vorfallZeit(): Date {
    return new Date(this._vorfallZeit.getTime());
  }
  get wann(): Date {
    return new Date(this._wann.getTime());
  }
  get was(): string {
    return this._was;
  }
  get wo(): Wo | null {
    return this._wo;
  }
  get beteiligte(): readonly BeteiligterProps[] {
    return Object.freeze(this._beteiligte.map((b) => b.toJSON()));
  }
  get beteiligteVOs(): readonly Beteiligter[] {
    return Object.freeze([...this._beteiligte]);
  }
  get massnahmen(): string {
    return this._massnahmen;
  }
  get unfallkasseRelevant(): boolean {
    return this._unfallkasseRelevant;
  }
  get erfasstVonUserId(): string {
    return this._erfasstVonUserId;
  }
  get erfasstAm(): Date {
    return new Date(this._erfasstAm.getTime());
  }
  get kontextSnapshot(): Record<string, unknown> {
    // Deep-Copy via structuredClone — verschachtelte Arrays/Objekte (z. B.
    // `aktivePsaProfile`, `sicherheitsregeln`, `gefaehrdungsbeurteilung.items`)
    // dürfen vom Caller nicht über shared references mutiert werden. Spec §B2
    // verlangt Snapshot-Unveränderlichkeit.
    return structuredClone(this._kontextSnapshot);
  }
  get gefBeurteilungVersionId(): string | null {
    return this._gefBeurteilungVersionId;
  }

  get geschlossenAm(): Date | null {
    return this._geschlossenAm === null ? null : new Date(this._geschlossenAm.getTime());
  }

  get geschlossenVonUserId(): string | null {
    return this._geschlossenVonUserId;
  }

  get schliessungsBegruendung(): string | null {
    return this._schliessungsBegruendung;
  }

  get isGeschlossen(): boolean {
    return this._geschlossenAm !== null;
  }
}
