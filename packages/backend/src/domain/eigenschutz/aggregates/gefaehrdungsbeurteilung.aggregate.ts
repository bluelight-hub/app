import { AggregateRoot } from '@domain/common/aggregate-root';
import { EntityId } from '@domain/common/entity-id';
import { Result } from '@domain/common/result';
import { GefaehrdungsbeurteilungAktualisiertEvent, type GefaehrdungsbeurteilungAktualisiertChangedFields } from '../events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungsbeurteilungErstelltEvent } from '../events/gefaehrdungsbeurteilung-erstellt.event';
import { GefaehrdungItem } from '../value-objects/gefaehrdung-item.vo';

/**
 * Sentinel-Error aus `updateItems`, wenn der Client mit einer veralteten
 * `expectedVersion` kam. Der Controller mappt diesen Präfix auf HTTP 409 mit
 * `context.attemptedVersion`. `currentVersion` wird vom Frontend via GET
 * nachgeladen; der Optimistic-Rollback im Hook stellt den alten Cache wieder
 * her, `onSettled`-Invalidate liefert danach die Server-Wahrheit.
 */
export const GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED = 'ConflictDetected:Gefaehrdungsbeurteilung';

/**
 * Sentinel-Error aus `updateItems`, wenn `newItems` mehrere Einträge mit
 * derselben `id` enthält. Der Controller mappt dies auf HTTP 422.
 */
export const GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID = 'BusinessRule:DuplicateItemId';

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
    // Defensive-Copy: externe Mutation des internen Arrays würde Aggregate-
    // Kapselung brechen, ohne ein Domain-Event auszulösen (TS-`readonly`
    // schützt nur Compile-Zeit, nicht Runtime).
    return [...this._items];
  }
  get version(): number {
    return this._version;
  }
  get createdBy(): string {
    return this._createdBy;
  }

  /**
   * Ersetzt die `items`-Liste atomar, inkrementiert die Version und emittiert
   * ein `GefaehrdungsbeurteilungAktualisiertEvent`. Basis für Story 2.2
   * (expliziter POST-Endpoint), Story 2.5 (Auto-Save) und Story 2.3
   * (Version-Chain-Semantik).
   *
   * **Optimistic-Concurrency (Architecture §E):** `expectedVersion` muss exakt
   * der aktuellen Aggregate-Version entsprechen. Ein Mismatch bedeutet, dass
   * ein anderer Client zwischendurch gespeichert hat — der Handler mappt das
   * auf HTTP 409.
   *
   * **Diff-Berechnung:** `changedFields` ist ein zusammenfassendes Diff
   * (added/removed/updated) auf Basis der Item-IDs. Items ohne ID gelten als
   * neu angelegt. Inhaltliche Feld-Diffs pro Item sind Story-2.3-Scope.
   */
  updateItems(newItems: GefaehrdungItem[], expectedVersion: number, userId: string): Result<void> {
    if (!Array.isArray(newItems)) {
      return Result.fail<void>('newItems muss ein Array sein');
    }
    if (this._version !== expectedVersion) {
      return Result.fail<void>(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED);
    }

    // Duplikat-ID-Guard: ohne diesen Check würde `computeItemsDiff` doppelte
    // IDs im Set kollabieren, aber `updated++` mehrfach hochzählen — falsche
    // `changedFields`-Metriken + widersprüchlicher JSONB-State.
    const seenIds = new Set<string>();
    for (const item of newItems) {
      if (!item.id) continue;
      if (seenIds.has(item.id)) {
        return Result.fail<void>(GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID);
      }
      seenIds.add(item.id);
    }

    const changedFields = this.computeItemsDiff(this._items, newItems);
    const fromVersion = this._version;
    const toVersion = this._version + 1;

    // Defensive-Copy: wir übernehmen NICHT die vom Handler übergebene Referenz,
    // damit externe Mutationen das Aggregate nicht silent verändern.
    this._items = [...newItems];
    this._version = toVersion;

    this.addDomainEvent(new GefaehrdungsbeurteilungAktualisiertEvent(this._einsatzId, userId, this._einheitId, this.id.value, fromVersion, toVersion, changedFields));

    return Result.ok();
  }

  private computeItemsDiff(oldItems: readonly GefaehrdungItem[], newItems: readonly GefaehrdungItem[]): GefaehrdungsbeurteilungAktualisiertChangedFields {
    const oldIds = new Set<string>();
    for (const item of oldItems) {
      if (item.id) oldIds.add(item.id);
    }
    const newIds = new Set<string>();
    for (const item of newItems) {
      if (item.id) newIds.add(item.id);
    }

    let added = 0;
    let updated = 0;
    for (const item of newItems) {
      if (!item.id || !oldIds.has(item.id)) added++;
      else updated++;
    }

    let removed = 0;
    for (const item of oldItems) {
      if (item.id && !newIds.has(item.id)) removed++;
    }

    return { added, removed, updated };
  }
}
