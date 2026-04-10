import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { ZeichenEntferntEvent } from '../events/zeichen-entfernt.event';
import { ZeichenErstelltEvent } from '../events/zeichen-erstellt.event';
import { ZeichenPlatziertEvent } from '../events/zeichen-platziert.event';
import { ZeichenVerschobenEvent } from '../events/zeichen-verschoben.event';
import { TaktischesZeichenId } from '../value-objects/taktisches-zeichen-id';
import { ZeichenDefinition } from '../value-objects/zeichen-definition.vo';

/**
 * Props für TaktischesZeichen.create() Factory Method.
 */
export interface CreateTaktischesZeichenProps {
  einsatzId: string;
  zeichenDefinition: ZeichenDefinition;
  label?: string;
  notiz?: string;
  referenzTyp?: string;
  referenzId?: string;
  istAusKatalog: boolean;
  katalogEintragId?: string;
  createdBy: string;
}

/**
 * Props für TaktischesZeichen.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteTaktischesZeichenProps {
  id: TaktischesZeichenId;
  einsatzId: string;
  zeichenDefinition: ZeichenDefinition;
  label?: string;
  notiz?: string;
  referenzTyp?: string;
  referenzId?: string;
  lat?: number;
  lng?: number;
  mgrs?: string;
  lagekarteId?: string;
  istAusKatalog: boolean;
  katalogEintragId?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Props für TaktischesZeichen.aktualisiere() Method.
 */
export interface UpdateTaktischesZeichenProps {
  zeichenDefinition?: ZeichenDefinition;
  label?: string;
  notiz?: string;
  updatedBy: string;
}

/**
 * TaktischesZeichen Aggregate Root.
 *
 * Repräsentiert ein taktisches Zeichen im System, das einem Einsatz zugeordnet ist.
 * Ein Zeichen kann optional auf einer Lagekarte mit GPS-Koordinaten platziert sein.
 *
 * **Invarianten:**
 * - einsatzId ist Pflichtfeld (Zeichen gehört immer zu einem Einsatz)
 * - zeichenDefinition ist Pflichtfeld (mind. Grundzeichen)
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - lat und lng müssen gemeinsam gesetzt oder beide undefined sein (Atomarität der Position)
 * - lagekarteId ist nur sinnvoll wenn lat/lng gesetzt sind
 *
 * **Event Flow:**
 * - create() → ZeichenErstelltEvent
 * - platziere() → ZeichenPlatziertEvent
 * - verschiebe() → ZeichenVerschobenEvent
 * - entferneVonKarte() → ZeichenEntferntEvent
 */
export class TaktischesZeichen extends AggregateRoot<TaktischesZeichenId> {
  private _einsatzId: string;
  private _zeichenDefinition: ZeichenDefinition;
  private _label?: string;
  private _notiz?: string;
  private _referenzTyp?: string;
  private _referenzId?: string;
  private _lat?: number;
  private _lng?: number;
  private _mgrs?: string;
  private _lagekarteId?: string;
  private _istAusKatalog: boolean;
  private _katalogEintragId?: string;
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: TaktischesZeichenId,
    einsatzId: string,
    zeichenDefinition: ZeichenDefinition,
    createdBy: string,
    istAusKatalog: boolean,
    label?: string,
    notiz?: string,
    referenzTyp?: string,
    referenzId?: string,
    lat?: number,
    lng?: number,
    mgrs?: string,
    lagekarteId?: string,
    katalogEintragId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._zeichenDefinition = zeichenDefinition;
    this._createdBy = createdBy;
    this._istAusKatalog = istAusKatalog;
    this._label = label;
    this._notiz = notiz;
    this._referenzTyp = referenzTyp;
    this._referenzId = referenzId;
    this._lat = lat;
    this._lng = lng;
    this._mgrs = mgrs;
    this._lagekarteId = lagekarteId;
    this._katalogEintragId = katalogEintragId;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /** ID des zugehörigen Einsatzes. */
  get einsatzId(): string {
    return this._einsatzId;
  }

  /** Zeichendefinition (Grundzeichen, Organisation usw.) als Value Object. */
  get zeichenDefinition(): ZeichenDefinition {
    return this._zeichenDefinition;
  }

  /** Optionale Beschriftung des Zeichens (frei wählbar). */
  get label(): string | undefined {
    return this._label;
  }

  /** Optionale Notiz/Bemerkung zum Zeichen. */
  get notiz(): string | undefined {
    return this._notiz;
  }

  /** Art der verknüpften Ressource (z.B. "EINHEIT", "FAHRZEUG"). */
  get referenzTyp(): string | undefined {
    return this._referenzTyp;
  }

  /** ID der verknüpften Ressource. */
  get referenzId(): string | undefined {
    return this._referenzId;
  }

  /** WGS84 Breitengrad der Kartenposition. */
  get lat(): number | undefined {
    return this._lat;
  }

  /** WGS84 Längengrad der Kartenposition. */
  get lng(): number | undefined {
    return this._lng;
  }

  /** Optionale MGRS-Koordinate (Military Grid Reference System). */
  get mgrs(): string | undefined {
    return this._mgrs;
  }

  /** ID der Lagekarte, auf der das Zeichen platziert ist. */
  get lagekarteId(): string | undefined {
    return this._lagekarteId;
  }

  /** Gibt an ob das Zeichen aus dem Katalog stammt (true) oder manuell erstellt wurde (false). */
  get istAusKatalog(): boolean {
    return this._istAusKatalog;
  }

  /** ID des Katalogeintrags, wenn das Zeichen aus dem Katalog stammt. */
  get katalogEintragId(): string | undefined {
    return this._katalogEintragId;
  }

  /** User-ID des Erstellers für den Audit-Trail. */
  get createdBy(): string {
    return this._createdBy;
  }

  /** User-ID des letzten Bearbeiters für den Audit-Trail. */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  /**
   * Computed Property: Gibt an ob das Zeichen auf einer Lagekarte platziert ist.
   * Ein Zeichen ist platziert wenn lat UND lng gesetzt sind.
   */
  get istPlatziert(): boolean {
    return this._lat !== undefined && this._lng !== undefined;
  }

  // ============ Factory Methods ============

  /**
   * Factory Method zur Erstellung eines neuen taktischen Zeichens.
   * Emittiert ZeichenErstelltEvent.
   *
   * @param props - Pflicht- und optionale Felder für das neue Zeichen
   * @returns Result<TaktischesZeichen> - Erfolg oder Fehler
   */
  static create(props: CreateTaktischesZeichenProps): Result<TaktischesZeichen> {
    if (!props.einsatzId || props.einsatzId.trim() === '') {
      return Result.fail<TaktischesZeichen>('EINSATZ_ID_REQUIRED');
    }

    if (!props.createdBy || props.createdBy.trim() === '') {
      return Result.fail<TaktischesZeichen>('CREATED_BY_REQUIRED');
    }

    const idResult = TaktischesZeichenId.create();
    if (idResult.isFailure) {
      return Result.fail<TaktischesZeichen>(idResult.error ?? 'Fehler bei der ID-Generierung');
    }
    const id = idResult.value as TaktischesZeichenId;

    const zeichen = new TaktischesZeichen(
      id,
      props.einsatzId.trim(),
      props.zeichenDefinition,
      props.createdBy.trim(),
      props.istAusKatalog,
      props.label?.trim(),
      props.notiz?.trim(),
      props.referenzTyp?.trim(),
      props.referenzId?.trim(),
      undefined,
      undefined,
      undefined,
      undefined,
      props.katalogEintragId?.trim(),
    );

    zeichen.addDomainEvent(
      new ZeichenErstelltEvent(
        id.value,
        props.einsatzId.trim(),
        props.zeichenDefinition.toJson(),
        props.label?.trim(),
        props.referenzTyp?.trim(),
        props.referenzId?.trim(),
        props.createdBy.trim(),
        id.value,
      ),
    );

    return Result.ok<TaktischesZeichen>(zeichen);
  }

  /**
   * Rekonstruiert ein TaktischesZeichen Aggregate aus DB-Daten.
   * KEINE Domain Events werden emittiert (nur Hydration aus Persistenz).
   *
   * @param props - Vollständige Daten aus der Datenbank
   * @returns TaktischesZeichen Instanz ohne Domain Events
   */
  static reconstitute(props: ReconstituteTaktischesZeichenProps): TaktischesZeichen {
    return new TaktischesZeichen(
      props.id,
      props.einsatzId,
      props.zeichenDefinition,
      props.createdBy,
      props.istAusKatalog,
      props.label,
      props.notiz,
      props.referenzTyp,
      props.referenzId,
      props.lat,
      props.lng,
      props.mgrs,
      props.lagekarteId,
      props.katalogEintragId,
      props.createdAt,
      props.updatedAt,
      props.updatedBy,
    );
  }

  // ============ Business Methods ============

  /**
   * Platziert das Zeichen auf einer Lagekarte mit GPS-Koordinaten.
   * Emittiert ZeichenPlatziertEvent.
   *
   * **Business Rules:**
   * - lat und lng sind Pflicht für die Platzierung
   * - lagekarteId ist Pflicht für die Platzierung
   * - Ein bereits platziertes Zeichen kann erneut platziert werden (Überschreibung)
   *
   * @param lagekarteId - ID der Lagekarte
   * @param lat - WGS84 Breitengrad
   * @param lng - WGS84 Längengrad
   * @param mgrs - Optionale MGRS-Koordinate
   * @returns Result<void> - Erfolg oder Fehler
   */
  public platziere(lagekarteId: string, lat: number, lng: number, mgrs?: string): Result<void> {
    if (!lagekarteId || lagekarteId.trim() === '') {
      return Result.fail<void>('LAGEKARTE_ID_REQUIRED');
    }

    this._lagekarteId = lagekarteId.trim();
    this._lat = lat;
    this._lng = lng;
    this._mgrs = mgrs?.trim();
    this.updateTimestamp();

    this.addDomainEvent(new ZeichenPlatziertEvent(this.id.value, this._einsatzId, lagekarteId.trim(), lat, lng, mgrs?.trim(), this.id.value));

    return Result.ok<void>(undefined);
  }

  /**
   * Verschiebt das bereits platzierte Zeichen auf eine neue Position.
   * Emittiert ZeichenVerschobenEvent.
   *
   * **Business Rules:**
   * - Das Zeichen muss bereits platziert sein (istPlatziert === true)
   * - Neue Koordinaten müssen sich von den aktuellen unterscheiden
   *
   * @param lat - Neuer WGS84 Breitengrad
   * @param lng - Neuer WGS84 Längengrad
   * @param mgrs - Optionale neue MGRS-Koordinate
   * @returns Result<void> - Erfolg oder Fehler
   */
  public verschiebe(lat: number, lng: number, mgrs?: string): Result<void> {
    if (!this.istPlatziert) {
      return Result.fail<void>('ZEICHEN_NICHT_PLATZIERT');
    }

    this._lat = lat;
    this._lng = lng;
    this._mgrs = mgrs?.trim();
    this.updateTimestamp();

    this.addDomainEvent(new ZeichenVerschobenEvent(this.id.value, this._einsatzId, lat, lng, mgrs?.trim(), this.id.value));

    return Result.ok<void>(undefined);
  }

  /**
   * Aktualisiert die Metadaten des Zeichens (Definition, Label, Notiz).
   * Emittiert kein eigenes Event (kein dediziertes AKTUALISIERT-Event benötigt,
   * da der AKTUALISIERT-Event-Name im EVENT_NAMES definiert ist und später ergänzt
   * werden kann).
   *
   * **Business Rules:**
   * - Nur übergebene Felder (nicht undefined) werden aktualisiert
   * - updatedBy ist Pflichtfeld für Audit-Trail
   *
   * @param props - Zu aktualisierende Felder
   * @returns Result<void> - Erfolg oder Fehler
   */
  public aktualisiere(props: UpdateTaktischesZeichenProps): Result<void> {
    if (!props.updatedBy || props.updatedBy.trim() === '') {
      return Result.fail<void>('UPDATED_BY_REQUIRED');
    }

    if (props.zeichenDefinition !== undefined) {
      this._zeichenDefinition = props.zeichenDefinition;
    }

    if (props.label !== undefined) {
      this._label = props.label.trim() || undefined;
    }

    if (props.notiz !== undefined) {
      this._notiz = props.notiz.trim() || undefined;
    }

    this._updatedBy = props.updatedBy.trim();
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }

  /**
   * Entfernt das Zeichen von der Lagekarte (löscht Positionsdaten und Lagekarten-Referenz).
   * Emittiert ZeichenEntferntEvent.
   *
   * Das Zeichen selbst bleibt im System erhalten (Soft-Remove von der Karte),
   * nur die Verknüpfung zur Lagekarte und die Positionsdaten werden entfernt.
   *
   * **Business Rules:**
   * - Das Zeichen muss platziert sein um entfernt werden zu können
   *
   * @returns Result<void> - Erfolg oder Fehler
   */
  public entferneVonKarte(): Result<void> {
    if (!this.istPlatziert) {
      return Result.fail<void>('ZEICHEN_NICHT_PLATZIERT');
    }

    this._lat = undefined;
    this._lng = undefined;
    this._mgrs = undefined;
    this._lagekarteId = undefined;
    this.updateTimestamp();

    this.addDomainEvent(new ZeichenEntferntEvent(this.id.value, this._einsatzId, this.id.value));

    return Result.ok<void>(undefined);
  }
}
