import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { FuehrungsrhythmusTemplateName } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-name';
import type { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import { FuehrungsrhythmusTemplateErstelltEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-erstellt.event';
import { FuehrungsrhythmusTemplateGeloeschtEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-geloescht.event';
import { FuehrungsrhythmusTemplateAktualisiertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-aktualisiert.event';
import type { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

/**
 * Props fuer die Erstellung eines neuen Fuehrungsrhythmus-Templates.
 */
export interface CreateFuehrungsrhythmusTemplateProps {
  name: string;
  beschreibung?: string;
  eintraege: FuehrungsrhythmusEintrag[];
  createdBy: UserId;
  scope?: FuehrungsrhythmusTemplateScope;
  einsatzId?: EinsatzId;
}

/**
 * Props fuer die Rekonstruktion eines Fuehrungsrhythmus-Templates aus der Datenbank.
 */
export interface ReconstructFuehrungsrhythmusTemplateProps {
  id: FuehrungsrhythmusTemplateId;
  name: FuehrungsrhythmusTemplateName;
  beschreibung: string | null;
  eintraege: FuehrungsrhythmusEintrag[];
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: UserId | null;
  scope: FuehrungsrhythmusTemplateScope;
  einsatzId: EinsatzId | null;
}

/**
 * FuehrungsrhythmusTemplate Aggregate Root.
 * Kapselt Business Rules fuer Fuehrungsrhythmus-Templates (Konfiguration/Stammdaten).
 *
 * Ein Fuehrungsrhythmus-Template definiert eine Reihe von wiederkehrenden Eintraegen
 * (z.B. Lagebesprechung alle 30 min, Funkmeldecheck alle 15 min),
 * die auf einen Einsatz angewendet werden können.
 */
export class FuehrungsrhythmusTemplate extends AggregateRoot<FuehrungsrhythmusTemplateId> {
  public static readonly MAX_BESCHREIBUNG_LENGTH = 500;
  public static readonly MIN_EINTRAEGE = 1;

  private _name: FuehrungsrhythmusTemplateName;
  private _beschreibung: string | null;
  private _eintraege: FuehrungsrhythmusEintrag[];
  private readonly _createdBy: UserId;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: UserId | null;
  private _scope: FuehrungsrhythmusTemplateScope;
  private _einsatzId: EinsatzId | null;

  private constructor(
    id: FuehrungsrhythmusTemplateId,
    name: FuehrungsrhythmusTemplateName,
    beschreibung: string | null,
    eintraege: FuehrungsrhythmusEintrag[],
    createdBy: UserId,
    scope: FuehrungsrhythmusTemplateScope = FuehrungsrhythmusTemplateScope.GLOBAL,
    einsatzId: EinsatzId | null = null,
    createdAt?: Date,
    updatedAt?: Date,
    isDeleted = false,
    deletedAt: Date | null = null,
    deletedBy: UserId | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._beschreibung = beschreibung;
    this._eintraege = eintraege;
    this._createdBy = createdBy;
    this._scope = scope;
    this._einsatzId = einsatzId;
    this._isDeleted = isDeleted;
    this._deletedAt = deletedAt;
    this._deletedBy = deletedBy;
  }

  // Getters
  get name(): FuehrungsrhythmusTemplateName {
    return this._name;
  }
  get beschreibung(): string | null {
    return this._beschreibung;
  }
  get eintraege(): FuehrungsrhythmusEintrag[] {
    return [...this._eintraege];
  }
  get createdBy(): UserId {
    return this._createdBy;
  }
  get isDeleted(): boolean {
    return this._isDeleted;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }
  get deletedBy(): UserId | null {
    return this._deletedBy;
  }
  get scope(): FuehrungsrhythmusTemplateScope {
    return this._scope;
  }
  get einsatzId(): EinsatzId | null {
    return this._einsatzId;
  }

  /**
   * Factory Method: Neues Fuehrungsrhythmus-Template erstellen.
   */
  static create(props: CreateFuehrungsrhythmusTemplateProps): Result<FuehrungsrhythmusTemplate> {
    // Validiere Name
    const nameResult = FuehrungsrhythmusTemplateName.create(props.name);
    if (nameResult.isFailure || !nameResult.value) {
      return Result.fail<FuehrungsrhythmusTemplate>(nameResult.error ?? 'FR_TEMPLATE_NAME_INVALID');
    }

    // Validiere Eintraege (mind. 1 Eintrag erforderlich)
    if (!props.eintraege || props.eintraege.length < FuehrungsrhythmusTemplate.MIN_EINTRAEGE) {
      return Result.fail<FuehrungsrhythmusTemplate>('FR_TEMPLATE_EINTRAEGE_EMPTY');
    }

    // Validiere Beschreibung
    let beschreibung: string | null = null;
    if (props.beschreibung != null && props.beschreibung.trim().length > 0) {
      const trimmedBeschreibung = props.beschreibung.trim();
      if (trimmedBeschreibung.length > FuehrungsrhythmusTemplate.MAX_BESCHREIBUNG_LENGTH) {
        return Result.fail<FuehrungsrhythmusTemplate>(`FR_TEMPLATE_BESCHREIBUNG_TOO_LONG: Beschreibung darf maximal ${FuehrungsrhythmusTemplate.MAX_BESCHREIBUNG_LENGTH} Zeichen haben`);
      }
      beschreibung = trimmedBeschreibung;
    }

    // Generiere ID
    const idResult = FuehrungsrhythmusTemplateId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<FuehrungsrhythmusTemplate>(idResult.error ?? 'FR_TEMPLATE_ID_INVALID');
    }

    // Validiere Scope + einsatzId Konsistenz
    const scope = props.scope ?? FuehrungsrhythmusTemplateScope.GLOBAL;
    if (scope === FuehrungsrhythmusTemplateScope.EINSATZ && !props.einsatzId) {
      return Result.fail<FuehrungsrhythmusTemplate>('EINSATZ_SCOPE_REQUIRES_EINSATZ_ID');
    }
    if (scope === FuehrungsrhythmusTemplateScope.GLOBAL && props.einsatzId) {
      return Result.fail<FuehrungsrhythmusTemplate>('GLOBAL_SCOPE_NO_EINSATZ_ID');
    }

    const template = new FuehrungsrhythmusTemplate(
      idResult.value as FuehrungsrhythmusTemplateId,
      nameResult.value,
      beschreibung,
      [...props.eintraege],
      props.createdBy,
      scope,
      props.einsatzId ?? null,
    );

    // Emit Domain Event
    template.addDomainEvent(
      new FuehrungsrhythmusTemplateErstelltEvent(
        idResult.value as FuehrungsrhythmusTemplateId,
        nameResult.value.value,
        props.eintraege.length,
        props.createdBy,
        (idResult.value as FuehrungsrhythmusTemplateId).toString(),
      ),
    );

    return Result.ok<FuehrungsrhythmusTemplate>(template);
  }

  /**
   * Reconstruct: Fuehrungsrhythmus-Template aus der Datenbank rekonstruieren.
   */
  static reconstruct(props: ReconstructFuehrungsrhythmusTemplateProps): FuehrungsrhythmusTemplate {
    return new FuehrungsrhythmusTemplate(
      props.id,
      props.name,
      props.beschreibung,
      [...props.eintraege],
      props.createdBy,
      props.scope,
      props.einsatzId,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
      props.deletedAt,
      props.deletedBy,
    );
  }

  /**
   * Update: Aktualisiert Name, Beschreibung und Eintraege des Templates (Story 6.8).
   * Business Rule: Bereits gelöschte Templates können nicht aktualisiert werden.
   */
  public update(props: { name: string; beschreibung: string | null; eintraege: FuehrungsrhythmusEintrag[]; aktualisiertVon: UserId }): Result<void> {
    if (this._isDeleted) {
      return Result.fail<void>('FR_TEMPLATE_ALREADY_DELETED');
    }

    const nameResult = FuehrungsrhythmusTemplateName.create(props.name);
    if (nameResult.isFailure || !nameResult.value) {
      return Result.fail<void>(nameResult.error ?? 'FR_TEMPLATE_NAME_INVALID');
    }

    if (!props.eintraege || props.eintraege.length < FuehrungsrhythmusTemplate.MIN_EINTRAEGE) {
      return Result.fail<void>('FR_TEMPLATE_EINTRAEGE_EMPTY');
    }

    let beschreibung: string | null = null;
    if (props.beschreibung != null && props.beschreibung.trim().length > 0) {
      const trimmedBeschreibung = props.beschreibung.trim();
      if (trimmedBeschreibung.length > FuehrungsrhythmusTemplate.MAX_BESCHREIBUNG_LENGTH) {
        return Result.fail<void>(`FR_TEMPLATE_BESCHREIBUNG_TOO_LONG: Beschreibung darf maximal ${FuehrungsrhythmusTemplate.MAX_BESCHREIBUNG_LENGTH} Zeichen haben`);
      }
      beschreibung = trimmedBeschreibung;
    }

    this._name = nameResult.value;
    this._beschreibung = beschreibung;
    this._eintraege = [...props.eintraege];
    this.updateTimestamp();

    this.addDomainEvent(new FuehrungsrhythmusTemplateAktualisiertEvent(this._id, this._name.value, props.aktualisiertVon, this._id.toString()));

    return Result.ok<void>(undefined);
  }

  /**
   * Soft-Delete: Markiert das Fuehrungsrhythmus-Template als gelöscht.
   * Business Rule: Bereits gelöschte Templates können nicht erneut gelöscht werden.
   */
  public softDelete(deletedBy: UserId): Result<void> {
    if (this._isDeleted) {
      return Result.fail<void>('FR_TEMPLATE_ALREADY_DELETED');
    }

    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedBy = deletedBy;
    this.updateTimestamp();

    this.addDomainEvent(new FuehrungsrhythmusTemplateGeloeschtEvent(this._id, this._name.value, deletedBy, this._id.toString()));

    return Result.ok<void>(undefined);
  }
}
