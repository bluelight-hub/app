import { AggregateRoot } from '@domain/common/aggregate-root';
import { EntityId } from '@domain/common/entity-id';
import { Result } from '@domain/common/result';
import { GefaehrdungsbeurteilungAktualisiertEvent, type GefaehrdungItemFieldKey, type GefaehrdungsbeurteilungAktualisiertChangedFields } from '../events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungsbeurteilungErstelltEvent } from '../events/gefaehrdungsbeurteilung-erstellt.event';
import { GefaehrdungItem } from '../value-objects/gefaehrdung-item.vo';

/**
 * Sentinel-Error aus `updateItems`, wenn der Client mit einer veralteten
 * `expectedVersion` kam. Der Controller mappt diesen Präfix auf HTTP 409 mit
 * `context.currentVersion` + `context.attemptedVersion`. Die aktuelle Version
 * hängt der Handler als `:current=<n>`-Suffix an (siehe Story 2.3, AC10).
 */
export const GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED = 'ConflictDetected:Gefaehrdungsbeurteilung';

/**
 * Sentinel-Error aus `updateItems`, wenn `newItems` mehrere Einträge mit
 * derselben `id` enthält. Der Controller mappt dies auf HTTP 422.
 */
export const GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID = 'BusinessRule:DuplicateItemId';

/**
 * Sentinel-Error aus `updateItems`, wenn die Audit-Quersumme nach dem Diff
 * nicht aufgeht (`unchanged + updated.length + added.length !== newItems.length`).
 * Ein solcher Zustand bedeutet einen Aggregate-internen Programmierfehler;
 * der Controller mappt den `Invariant:`-Prefix auf HTTP 500 (`context.layer = 'domain'`),
 * da ein externer Client diesen Fall per Design nicht provozieren kann.
 */
export const GEFAEHRDUNGSBEURTEILUNG_DIFF_SUM_MISMATCH = 'Invariant:DiffSumMismatch';

/**
 * Type-Safe Identifier für `Gefaehrdungsbeurteilung`. Nutzt die generische
 * EntityId-Basis mit Literal-Type-Tag, damit der Compiler eine Gefährdungs-
 * beurteilungs-ID nicht versehentlich mit einer anderen Entity-ID verwechselt.
 */
export class GefaehrdungsbeurteilungId extends EntityId<'Gefaehrdungsbeurteilung'> {}

/**
 * Properties für die Factory-Methode `Gefaehrdungsbeurteilung.create`.
 * `items` stammt entweder aus einer Vorlage (Deep-Copy durch Handler) oder
 * ist ein leeres Array (Leer-Formular).
 */
export interface CreateGefaehrdungsbeurteilungProps {
  einsatzId: string;
  einheitId: string;
  createdBy: string;
  vorlageId?: string | null;
  gefahrenzoneId?: string | null;
  items: GefaehrdungItem[];
  id?: string;
}

/**
 * Properties für `Gefaehrdungsbeurteilung.reconstitute` — wird vom Mapper
 * beim Read aus der DB genutzt. Im Unterschied zu `create` wird `version`
 * mitgegeben (statt auf 1 fixiert) und es werden keine Domain-Events emittiert.
 */
export interface ReconstituteGefaehrdungsbeurteilungProps {
  id: string;
  einsatzId: string;
  einheitId: string;
  createdBy: string;
  vorlageId: string | null;
  gefahrenzoneId: string | null;
  items: GefaehrdungItem[];
  version: number;
}

/**
 * Aggregate Root für eine Gefährdungsbeurteilung (Story 2.1).
 *
 * **Scope Story 2.1:** Nur die Create-Flussinvarianten sind hier modelliert.
 * Story 2.2–2.5 ergänzt `addItem`, `updateItem`, `removeItem`,
 * `finalizeVersion` etc.
 *
 * **Invarianten:**
 * 1. `einsatzId`, `einheitId`, `createdBy` sind Pflicht (nicht-leer).
 * 2. `vorlageId` und `gefahrenzoneId` sind optional (kann bei Leer-Formular
 *    bzw. wenn keine Gefahrenzone verknüpft ist `null` sein).
 * 3. Die initiale Version ist 1 (Schema-Default) — sobald Story 2.3 Versions-
 *    Transitions erlaubt, wandert die Logik ins Aggregate.
 * 4. Factory emittiert genau **ein** `GefaehrdungsbeurteilungErstelltEvent`.
 */
export class Gefaehrdungsbeurteilung extends AggregateRoot<GefaehrdungsbeurteilungId> {
  private constructor(
    id: GefaehrdungsbeurteilungId,
    private readonly _einsatzId: string,
    private readonly _einheitId: string,
    private readonly _vorlageId: string | null,
    private readonly _gefahrenzoneId: string | null,
    private _items: GefaehrdungItem[],
    private _version: number,
    private readonly _createdBy: string,
  ) {
    super(id);
  }

  static create(props: CreateGefaehrdungsbeurteilungProps): Result<Gefaehrdungsbeurteilung> {
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<Gefaehrdungsbeurteilung>('einsatzId ist erforderlich');
    }
    if (!props.einheitId || props.einheitId.trim().length === 0) {
      return Result.fail<Gefaehrdungsbeurteilung>('einheitId ist erforderlich');
    }
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<Gefaehrdungsbeurteilung>('createdBy ist erforderlich');
    }
    if (!Array.isArray(props.items)) {
      return Result.fail<Gefaehrdungsbeurteilung>('items muss ein Array sein');
    }

    const idResult = GefaehrdungsbeurteilungId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Gefaehrdungsbeurteilung>(idResult.error ?? 'Ungültige ID');
    }

    const aggregate = new Gefaehrdungsbeurteilung(
      idResult.value as GefaehrdungsbeurteilungId,
      props.einsatzId,
      props.einheitId,
      props.vorlageId ?? null,
      props.gefahrenzoneId ?? null,
      props.items,
      1,
      props.createdBy,
    );

    aggregate.addDomainEvent(new GefaehrdungsbeurteilungErstelltEvent(props.einsatzId, props.createdBy, props.einheitId, aggregate.id.value, aggregate._vorlageId, aggregate._items.length));

    return Result.ok(aggregate);
  }

  /**
   * Rekonstruiert ein Aggregate aus DB-State (Mapper-Pfad). Setzt die
   * tatsächliche DB-`version` und emittiert **keine** Domain-Events — der
   * Persisted-State wurde bereits seinerzeit veröffentlicht.
   *
   * Wird nur vom Infrastructure-Mapper aufgerufen; Anwendungs-/Handler-Code
   * verwendet ausschließlich `create` oder lädt via Repository.
   */
  static reconstitute(props: ReconstituteGefaehrdungsbeurteilungProps): Gefaehrdungsbeurteilung {
    // Invariant-Parität zu `create()`: auch ein rehydriertes Aggregate darf
    // keine leeren Pflicht-Felder tragen. Eine korrupte DB-Row darf nicht
    // silent in-memory weiterleben — lieber hart werfen, damit der Mapper-
    // Pfad den Fehler an die Observability durchreicht.
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      throw new Error('Gefaehrdungsbeurteilung.reconstitute: einsatzId ist erforderlich');
    }
    if (!props.einheitId || props.einheitId.trim().length === 0) {
      throw new Error('Gefaehrdungsbeurteilung.reconstitute: einheitId ist erforderlich');
    }
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      throw new Error('Gefaehrdungsbeurteilung.reconstitute: createdBy ist erforderlich');
    }
    if (!Array.isArray(props.items)) {
      throw new Error('Gefaehrdungsbeurteilung.reconstitute: items muss ein Array sein');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new Error(`Gefaehrdungsbeurteilung.reconstitute: version muss Integer ≥ 1 sein (erhalten: ${String(props.version)})`);
    }

    const idResult = GefaehrdungsbeurteilungId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Gefaehrdungsbeurteilung.reconstitute: ungültige ID ${props.id} (${idResult.error ?? 'unknown'})`);
    }
    return new Gefaehrdungsbeurteilung(
      idResult.value as GefaehrdungsbeurteilungId,
      props.einsatzId,
      props.einheitId,
      props.vorlageId,
      props.gefahrenzoneId,
      [...props.items],
      props.version,
      props.createdBy,
    );
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get einheitId(): string {
    return this._einheitId;
  }
  get vorlageId(): string | null {
    return this._vorlageId;
  }
  get gefahrenzoneId(): string | null {
    return this._gefahrenzoneId;
  }
  get items(): readonly GefaehrdungItem[] {
    // Defensive-Copy + Runtime-Freeze: `readonly` schützt nur zur Compile-Zeit;
    // ein Type-Cast würde den internen Array mutierbar machen. `Object.freeze`
    // wirft bei Mutations-Versuchen im strict mode / schluckt sie im sloppy mode,
    // sodass ein Caller das Aggregate nie unbemerkt korrumpieren kann.
    return Object.freeze([...this._items]);
  }
  get version(): number {
    return this._version;
  }
  get createdBy(): string {
    return this._createdBy;
  }

  /**
   * Ersetzt die `items`-Liste atomar, inkrementiert die Version und emittiert
   * ein `GefaehrdungsbeurteilungAktualisiertEvent`.
   *
   * **Optimistic-Concurrency (Architecture §E):** `expectedVersion` muss exakt
   * der aktuellen Aggregate-Version entsprechen. Ein Mismatch liefert
   * `GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED`; der Handler ergänzt diesen
   * Sentinel um `:current=<n>`, damit der Controller HTTP 409 mit beiden
   * Versionen im Context rendern kann (Story 2.3, AC10).
   *
   * **Diff-Berechnung (Story 2.3, AC3–AC5):** `computeItemsDiff` liefert
   * strukturiertes Per-Item-Diff mit `added: string[]`, `removed: string[]`,
   * `updated: Array<{id, fields[]}>` und `unchanged: number`. Items ohne
   * client-seitige `id` tragen im `added`-Array den synthetischen Eintrag
   * `"generated:<sortIndex>"`. Der Diff enforced die Audit-Quersumme
   * `unchanged + updated.length + added.length === newItems.length` — wird
   * sie verletzt, liefert `updateItems` `Invariant:DiffSumMismatch` statt
   * einem korrupten Event.
   */
  updateItems(newItems: GefaehrdungItem[], expectedVersion: number, userId: string): Result<void> {
    if (!Array.isArray(newItems)) {
      return Result.fail<void>('newItems muss ein Array sein');
    }
    if (this._version !== expectedVersion) {
      return Result.fail<void>(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED);
    }

    // Duplikat-ID-Guard: ohne diesen Check würde `computeItemsDiff` doppelte
    // IDs im Set kollabieren und zu widersprüchlichem JSONB-State führen. Der
    // Guard läuft VOR dem Diff-Compute (AC4 — Story 2.3).
    const seenIds = new Set<string>();
    for (const item of newItems) {
      if (!item.id) continue;
      if (seenIds.has(item.id)) {
        return Result.fail<void>(GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID);
      }
      seenIds.add(item.id);
    }

    const diffResult = this.computeItemsDiff(this._items, newItems);
    if (diffResult.isFailure || !diffResult.value) {
      return Result.fail<void>(diffResult.error ?? GEFAEHRDUNGSBEURTEILUNG_DIFF_SUM_MISMATCH);
    }
    const changedFields = diffResult.value;
    const fromVersion = this._version;
    const toVersion = this._version + 1;

    // Defensive-Copy: wir übernehmen NICHT die vom Handler übergebene Referenz,
    // damit externe Mutationen das Aggregate nicht silent verändern.
    this._items = [...newItems];
    this._version = toVersion;

    this.addDomainEvent(new GefaehrdungsbeurteilungAktualisiertEvent(this._einsatzId, userId, this._einheitId, this.id.value, fromVersion, toVersion, changedFields));

    return Result.ok();
  }

  private computeItemsDiff(oldItems: readonly GefaehrdungItem[], newItems: readonly GefaehrdungItem[]): Result<GefaehrdungsbeurteilungAktualisiertChangedFields> {
    const oldById = new Map<string, GefaehrdungItem>();
    for (const item of oldItems) {
      if (item.id) oldById.set(item.id, item);
    }

    const added: string[] = [];
    const updated: Array<{ id: string; fields: GefaehrdungItemFieldKey[] }> = [];
    let unchanged = 0;
    const seenNewIds = new Set<string>();
    let generatedCounter = 0;

    for (const item of newItems) {
      if (!item.id) {
        // ID-lose Items sind neu angelegt — wir reservieren einen stabilen
        // Index-basierten Token, damit Consumer (Ampel-Projection, Timeline)
        // Zählungen eindeutig auflösen können.
        added.push(`generated:${generatedCounter}`);
        generatedCounter += 1;
        continue;
      }
      seenNewIds.add(item.id);
      const oldItem = oldById.get(item.id);
      if (!oldItem) {
        added.push(item.id);
        continue;
      }
      const fields = oldItem.diffFields(item);
      if (fields.length === 0) {
        unchanged += 1;
      } else {
        updated.push({ id: item.id, fields });
      }
    }

    const removed: string[] = [];
    for (const item of oldItems) {
      if (item.id && !seenNewIds.has(item.id)) {
        removed.push(item.id);
      }
    }

    const changedFields: GefaehrdungsbeurteilungAktualisiertChangedFields = { added, removed, updated, unchanged };

    // Audit-Quersumme: jedes `newItems`-Element landet entweder in `added`,
    // `updated` oder `unchanged`. Eine Verletzung ist immer ein Programmier-
    // fehler im Aggregate selbst (nicht durch Client-Input erreichbar) —
    // wir rejecten defensiv, damit die Event-Payload immer konsistent bleibt.
    if (added.length + updated.length + unchanged !== newItems.length) {
      return Result.fail<GefaehrdungsbeurteilungAktualisiertChangedFields>(GEFAEHRDUNGSBEURTEILUNG_DIFF_SUM_MISMATCH);
    }

    return Result.ok(changedFields);
  }
}
