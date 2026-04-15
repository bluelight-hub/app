import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { FunkkanalStatus } from '@domain/aggregates/funkkanal/funkkanal.entity';
import { Funkkanal } from '@domain/aggregates/funkkanal/funkkanal.entity';
import type { FunkkanalRolle, FunkkanalZuordnungKraftRef } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import { FunkkanalZuordnung } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import { FunkkanalArchiviertEvent } from '@domain/events/funkkanal-archiviert.event';
import type { FunkkanalChangedFields } from '@domain/events/funkkanal-geaendert.event';
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';

/**
 * Parameter für {@link FunkkanalAggregate.create}.
 */
export interface CreateFunkkanalArgs {
  readonly einsatzId: EinsatzId;
  readonly name: string;
  readonly details: KanalDetailsShape;
  readonly sortIndex: number;
  readonly zweck?: string;
  readonly createdBy?: string;
}

/**
 * Parameter für {@link FunkkanalAggregate.zuordneKraft}.
 */
export interface ZuordneKraftArgs {
  readonly kraftRef: FunkkanalZuordnungKraftRef;
  readonly rufnameSnapshot: string;
  readonly rolle: FunkkanalRolle;
  readonly createdBy?: string;
}

/**
 * DDD Aggregate Root für Funkkanäle eines Einsatzes.
 *
 * Das Aggregat verwaltet die Lifecycle-Daten eines Kanals (Name, Details,
 * Status, Sortierung, Zweck) sowie dessen Kraft-Zuordnungen und erzwingt
 * sämtliche Invarianten (eindeutige Zuordnungen, exklusive kraftRef-Kind).
 *
 * Persistenz: Funkkanal + Zuordnungen werden zusammen in einer Transaktion
 * gespeichert (siehe `prisma-funkkanal.repository`, Task 11).
 */
export class FunkkanalAggregate extends AggregateRoot<FunkkanalId> {
  private readonly _kanal: Funkkanal;
  private _zuordnungen: FunkkanalZuordnung[];

  protected constructor(kanal: Funkkanal, zuordnungen: FunkkanalZuordnung[], createdAt?: Date, updatedAt?: Date) {
    super(kanal.id, createdAt, updatedAt);
    this._kanal = kanal;
    this._zuordnungen = zuordnungen;
  }

  get kanal(): Funkkanal {
    return this._kanal;
  }

  get einsatzId(): EinsatzId {
    return this._kanal.einsatzId;
  }

  get name(): string {
    return this._kanal.name;
  }

  get details(): KanalDetailsShape {
    return this._kanal.details;
  }

  get status(): FunkkanalStatus {
    return this._kanal.status;
  }

  get zweck(): string | undefined {
    return this._kanal.zweck;
  }

  get sortIndex(): number {
    return this._kanal.sortIndex;
  }

  get zuordnungen(): ReadonlyArray<FunkkanalZuordnung> {
    return this._zuordnungen;
  }

  /**
   * Factory für neue Funkkanäle. Neue Kanäle starten immer im Status `aktiv`
   * und emittieren `FunkkanalErstelltEvent`. Status `archiviert` darf NICHT
   * direkt via Factory gesetzt werden.
   */
  public static create(args: CreateFunkkanalArgs): Result<FunkkanalAggregate> {
    const name = args.name?.trim();
    if (!name) {
      return Result.fail<FunkkanalAggregate>('Kanalname ist erforderlich');
    }
    if (!args.einsatzId) {
      return Result.fail<FunkkanalAggregate>('EinsatzId ist erforderlich');
    }
    if (!args.details) {
      return Result.fail<FunkkanalAggregate>('KanalDetails sind erforderlich');
    }
    if (!Number.isInteger(args.sortIndex) || args.sortIndex < 0) {
      return Result.fail<FunkkanalAggregate>('sortIndex muss ein nicht-negativer Integer sein');
    }

    const idResult = FunkkanalId.create();
    if (idResult.isFailure) {
      return Result.fail<FunkkanalAggregate>(idResult.error as string);
    }
    const id = idResult.value as FunkkanalId;

    const now = new Date();
    const kanal = new Funkkanal(id, args.einsatzId, name, args.details, 'aktiv', args.zweck?.trim() || undefined, args.sortIndex, now, now, args.createdBy, args.createdBy);

    const aggregate = new FunkkanalAggregate(kanal, [], now, now);
    aggregate.addDomainEvent(
      new FunkkanalErstelltEvent(id, args.einsatzId, {
        name: kanal.name,
        details: kanal.details,
        status: kanal.status,
        sortIndex: kanal.sortIndex,
        zweck: kanal.zweck,
      }),
    );
    return Result.ok<FunkkanalAggregate>(aggregate);
  }

  /**
   * Rekonstruiert ein Aggregat aus persistierten Daten (Repository-intern).
   * Emittiert KEINE Events.
   */
  public static reconstitute(kanal: Funkkanal, zuordnungen: FunkkanalZuordnung[]): FunkkanalAggregate {
    return new FunkkanalAggregate(kanal, zuordnungen, kanal.createdAt, kanal.updatedAt);
  }

  public isArchiviert(): boolean {
    return this._kanal.status === 'archiviert';
  }

  public rename(name: string, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    const trimmed = name?.trim();
    if (!trimmed) {
      return Result.fail<void>('Kanalname ist erforderlich');
    }
    if (trimmed === this._kanal.name) {
      return Result.ok<void>(undefined);
    }
    this._kanal.name = trimmed;
    this.touch(updatedBy);
    this.emitGeaendert({ name: trimmed });
    return Result.ok<void>(undefined);
  }

  public changeDetails(details: KanalDetailsShape, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    if (!details) {
      return Result.fail<void>('KanalDetails sind erforderlich');
    }
    this._kanal.details = details;
    this.touch(updatedBy);
    this.emitGeaendert({ details });
    return Result.ok<void>(undefined);
  }

  public setZweck(zweck: string | undefined, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    const normalized = zweck?.trim() || undefined;
    if (normalized === this._kanal.zweck) {
      return Result.ok<void>(undefined);
    }
    this._kanal.zweck = normalized;
    this.touch(updatedBy);
    this.emitGeaendert({ zweck: normalized });
    return Result.ok<void>(undefined);
  }

  public setSortIndex(sortIndex: number, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    if (!Number.isInteger(sortIndex) || sortIndex < 0) {
      return Result.fail<void>('sortIndex muss ein nicht-negativer Integer sein');
    }
    if (sortIndex === this._kanal.sortIndex) {
      return Result.ok<void>(undefined);
    }
    this._kanal.sortIndex = sortIndex;
    this.touch(updatedBy);
    this.emitGeaendert({ sortIndex });
    return Result.ok<void>(undefined);
  }

  public archive(updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Kanal ist bereits archiviert');
    }
    this._kanal.status = 'archiviert';
    this.touch(updatedBy);
    this.addDomainEvent(new FunkkanalArchiviertEvent(this._kanal.id, this._kanal.einsatzId));
    return Result.ok<void>(undefined);
  }

  public deactivate(updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht deaktiviert werden');
    }
    if (this._kanal.status === 'inaktiv') {
      return Result.fail<void>('Kanal ist bereits inaktiv');
    }
    this._kanal.status = 'inaktiv';
    this.touch(updatedBy);
    this.emitGeaendert({ status: 'inaktiv' });
    return Result.ok<void>(undefined);
  }

  public activate(updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht reaktiviert werden');
    }
    if (this._kanal.status === 'aktiv') {
      return Result.fail<void>('Kanal ist bereits aktiv');
    }
    this._kanal.status = 'aktiv';
    this.touch(updatedBy);
    this.emitGeaendert({ status: 'aktiv' });
    return Result.ok<void>(undefined);
  }

  public zuordneKraft(args: ZuordneKraftArgs): Result<FunkkanalZuordnung> {
    if (this.isArchiviert()) {
      return Result.fail<FunkkanalZuordnung>('Archivierter Kanal kann keine Zuordnungen erhalten');
    }
    const validation = validateKraftRef(args.kraftRef);
    if (validation.isFailure) {
      return Result.fail<FunkkanalZuordnung>(validation.error as string);
    }
    const rufname = args.rufnameSnapshot?.trim();
    if (!rufname) {
      return Result.fail<FunkkanalZuordnung>('rufnameSnapshot ist erforderlich');
    }
    if (!args.rolle) {
      return Result.fail<FunkkanalZuordnung>('Rolle ist erforderlich');
    }
    if (this._zuordnungen.some((z) => kraftRefEquals(z.kraftRef, args.kraftRef))) {
      return Result.fail<FunkkanalZuordnung>('Kraft ist bereits diesem Kanal zugeordnet');
    }

    const idResult = FunkkanalZuordnungId.create();
    if (idResult.isFailure) {
      return Result.fail<FunkkanalZuordnung>(idResult.error as string);
    }
    const id = idResult.value as FunkkanalZuordnungId;
    const zuordnung = new FunkkanalZuordnung(id, this._kanal.id, args.kraftRef, rufname, args.rolle, new Date(), args.createdBy);
    this._zuordnungen.push(zuordnung);
    this.touch(args.createdBy);
    this.addDomainEvent(new FunkkanalZuordnungErstelltEvent(this._kanal.id, this._kanal.einsatzId, id, args.kraftRef, rufname, args.rolle));
    return Result.ok<FunkkanalZuordnung>(zuordnung);
  }

  public aendereZuordnungRolle(zuordnungId: FunkkanalZuordnungId, rolle: FunkkanalRolle, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    const zuordnung = this._zuordnungen.find((z) => z.id.equals(zuordnungId));
    if (!zuordnung) {
      return Result.fail<void>('Zuordnung nicht gefunden');
    }
    if (zuordnung.rolle === rolle) {
      return Result.ok<void>(undefined);
    }
    zuordnung.changeRolle(rolle);
    this.touch(updatedBy);
    this.emitGeaendert({});
    return Result.ok<void>(undefined);
  }

  public entferneZuordnung(zuordnungId: FunkkanalZuordnungId, updatedBy?: string): Result<void> {
    if (this.isArchiviert()) {
      return Result.fail<void>('Archivierter Kanal kann nicht geändert werden');
    }
    const index = this._zuordnungen.findIndex((z) => z.id.equals(zuordnungId));
    if (index === -1) {
      return Result.fail<void>('Zuordnung nicht gefunden');
    }
    this._zuordnungen.splice(index, 1);
    this.touch(updatedBy);
    this.addDomainEvent(new FunkkanalZuordnungEntferntEvent(this._kanal.id, this._kanal.einsatzId, zuordnungId));
    return Result.ok<void>(undefined);
  }

  private touch(updatedBy?: string): void {
    this._kanal.updatedAt = new Date();
    this._kanal.updatedBy = updatedBy ?? this._kanal.updatedBy;
    this.updateTimestamp();
  }

  private emitGeaendert(changedFields: FunkkanalChangedFields): void {
    this.addDomainEvent(new FunkkanalGeaendertEvent(this._kanal.id, this._kanal.einsatzId, changedFields));
  }
}

function validateKraftRef(ref: FunkkanalZuordnungKraftRef): Result<void> {
  if (!ref || typeof ref !== 'object') {
    return Result.fail<void>('kraftRef ist erforderlich');
  }
  switch (ref.kind) {
    case 'fahrzeug':
      if (!ref.fahrzeugId?.trim()) return Result.fail<void>('fahrzeugId ist erforderlich');
      return Result.ok<void>(undefined);
    case 'person':
      if (!ref.personId?.trim()) return Result.fail<void>('personId ist erforderlich');
      return Result.ok<void>(undefined);
    case 'einheit':
      if (!ref.einheitId?.trim()) return Result.fail<void>('einheitId ist erforderlich');
      return Result.ok<void>(undefined);
    default:
      return Result.fail<void>('kraftRef.kind muss fahrzeug | person | einheit sein');
  }
}

function kraftRefEquals(a: FunkkanalZuordnungKraftRef, b: FunkkanalZuordnungKraftRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'fahrzeug' && b.kind === 'fahrzeug') return a.fahrzeugId === b.fahrzeugId;
  if (a.kind === 'person' && b.kind === 'person') return a.personId === b.personId;
  if (a.kind === 'einheit' && b.kind === 'einheit') return a.einheitId === b.einheitId;
  return false;
}
