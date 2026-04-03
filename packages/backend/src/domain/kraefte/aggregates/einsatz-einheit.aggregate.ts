import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '../common/einsatz-einheit-error-codes';
import { EINSATZ_EINHEIT_VALIDATION, EINSATZ_EINHEIT_VALIDATION_ERRORS } from '../constants/einsatz-einheit-validation.constants';
import { EinheitAufgeloestEvent } from '../events/einheit-aufgeloest.event';
import { EinheitErstelltEvent } from '../events/einheit-erstellt.event';
import { EinheitStatusGeaendertEvent } from '../events/einheit-status-geaendert.event';
import { EinsatzEinheitId } from '../value-objects/einsatz-einheit-id';

/**
 * Gültige Einheitentypen (framework-agnostisch, kein Prisma-Import).
 * Muss mit Prisma Enum `EinsatzEinheitTyp` synchron gehalten werden.
 */
const VALID_EINHEIT_TYPEN = ['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'] as const;
type EinsatzEinheitTyp = (typeof VALID_EINHEIT_TYPEN)[number];

/**
 * Gültige Einheitenstatus (framework-agnostisch, kein Prisma-Import).
 * Muss mit Prisma Enum `EinsatzEinheitStatus` synchron gehalten werden.
 */
const VALID_EINHEIT_STATUS = ['AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST'] as const;
type EinsatzEinheitStatus = (typeof VALID_EINHEIT_STATUS)[number];

/**
 * Props für EinsatzEinheit.create() Factory Method.
 * Erstellt eine neue taktische Einheit im Einsatz.
 */
export interface CreateEinsatzEinheitProps {
  /** Einsatz-ID (UUID) zu dem die Einheit gehört */
  einsatzId: string;
  /** Name der Einheit (z.B. "1. Bergungsgruppe") */
  name: string;
  /** Typ der Einheit (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT) */
  typ: EinsatzEinheitTyp;
  /** Funktion der Einheit (optional, z.B. "Bergung") */
  funktion?: string;
  /** ID der übergeordneten Einheit (optional, für Hierarchie) */
  parentId?: string;
  /** Soll-Stärke der Einheit (optional, default: 0) */
  sollStaerke?: number;
  /** Auftrag der Einheit (optional) */
  auftrag?: string;
  /** Einsatzort der Einheit (optional) */
  einsatzort?: string;
  /** User-ID der die Einheit erstellt (Audit-Trail) */
  createdBy: string;
}

/**
 * Props für EinsatzEinheit.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteEinsatzEinheitProps {
  id: string;
  einsatzId: string;
  parentId?: string;
  name: string;
  typ: string;
  funktion?: string;
  status: string;
  einheitenfuehrerId?: string;
  sollStaerke: number;
  auftrag?: string;
  einsatzort?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  istStaerke?: number;
}

/**
 * EinsatzEinheit Aggregate Root.
 *
 * Repräsentiert eine taktische Einheit in einem aktiven Einsatz.
 * Einheiten bilden eine Hierarchie (Abschnitt → Zug → Gruppe → Staffel → Trupp)
 * und können Personen zugewiesen bekommen.
 *
 * **Hierarchie:**
 * - `parentId` referenziert die übergeordnete Einheit
 * - null = Top-Level Einheit (kein Vorgesetzter)
 * - Zirkuläre Hierarchien werden im Application Layer geprüft
 *
 * **Status-Lifecycle:**
 * - AUFGESTELLT → EINSATZBEREIT → IM_EINSATZ → AUFGELOEST
 * - IN_RESERVE als Zwischenstatus möglich
 * - AUFGELOEST ist Endstatus (emittiert zusätzliches EinheitAufgeloestEvent)
 *
 * **Invarianten:**
 * - einsatzId ist Pflichtfeld (FK zu Einsatz)
 * - name ist Pflichtfeld (1-100 Zeichen)
 * - typ muss gültiger EinsatzEinheitTyp sein
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - sollStaerke muss zwischen 0 und 9999 liegen
 */
export class EinsatzEinheit extends AggregateRoot<EinsatzEinheitId> {
  private readonly _einsatzId: string; // IMMUTABLE: FK zu Einsatz
  private _parentId?: string; // Übergeordnete Einheit (nullable)
  private _name: string; // Name der Einheit
  private _typ: EinsatzEinheitTyp; // Typ (TRUPP, STAFFEL, etc.)
  private _funktion?: string; // Funktion (optional, z.B. "Bergung")
  private _status: EinsatzEinheitStatus; // Aktueller Status
  private _einheitenfuehrerId?: string; // Einheitenführer (EinsatzPerson-ID)
  private _sollStaerke: number; // Soll-Stärke
  private _auftrag?: string; // Auftrag (optional)
  private _einsatzort?: string; // Einsatzort (optional)
  private _createdBy: string;
  private _updatedBy?: string;
  private _istStaerke: number; // Berechnete Ist-Stärke (aus DB)

  private constructor(
    id: EinsatzEinheitId,
    einsatzId: string,
    name: string,
    typ: EinsatzEinheitTyp,
    status: EinsatzEinheitStatus,
    sollStaerke: number,
    createdBy: string,
    parentId?: string,
    funktion?: string,
    einheitenfuehrerId?: string,
    auftrag?: string,
    einsatzort?: string,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
    istStaerke?: number,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._parentId = parentId;
    this._name = name;
    this._typ = typ;
    this._status = status;
    this._einheitenfuehrerId = einheitenfuehrerId;
    this._sollStaerke = sollStaerke;
    this._funktion = funktion;
    this._auftrag = auftrag;
    this._einsatzort = einsatzort;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
    this._istStaerke = istStaerke ?? 0;
  }

  // ============ Getters ============

  /** Einsatz-ID (UUID) zu dem diese Einheit gehört */
  get einsatzId(): string {
    return this._einsatzId;
  }

  /** ID der übergeordneten Einheit (null = Top-Level) */
  get parentId(): string | undefined {
    return this._parentId;
  }

  /** Name der Einheit (z.B. "1. Bergungsgruppe") */
  get name(): string {
    return this._name;
  }

  /** Typ der Einheit (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT) */
  get typ(): EinsatzEinheitTyp {
    return this._typ;
  }

  /** Funktion der Einheit (optional, z.B. "Bergung") */
  get funktion(): string | undefined {
    return this._funktion;
  }

  /** Aktueller Status der Einheit */
  get status(): EinsatzEinheitStatus {
    return this._status;
  }

  /** Einheitenführer-ID (EinsatzPerson-ID, nullable) */
  get einheitenfuehrerId(): string | undefined {
    return this._einheitenfuehrerId;
  }

  /** Soll-Stärke der Einheit */
  get sollStaerke(): number {
    return this._sollStaerke;
  }

  /** Auftrag der Einheit (optional) */
  get auftrag(): string | undefined {
    return this._auftrag;
  }

  /** Einsatzort der Einheit (optional) */
  get einsatzort(): string | undefined {
    return this._einsatzort;
  }

  /** User-ID des Erstellers (Audit-Trail) */
  get createdBy(): string {
    return this._createdBy;
  }

  /** User-ID des letzten Bearbeiters (Audit-Trail) */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  /** Ist-Stärke der Einheit (berechneter Wert aus Personen-Zuordnungen) */
  get istStaerke(): number {
    return this._istStaerke;
  }

  // ============ Factory Methods ============

  /**
   * Factory Method: Erstellt eine neue taktische Einheit.
   *
   * Initialer Status: AUFGESTELLT
   * Emittiert EinheitErstelltEvent für ETB-Eintrag.
   *
   * @param props - CreateEinsatzEinheitProps mit Einheiten-Daten
   * @returns Result<EinsatzEinheit> - Success oder Failure mit Fehlermeldung
   */
  static create(props: CreateEinsatzEinheitProps): Result<EinsatzEinheit> {
    // Validation: einsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.EINSATZ_ID_REQUIRED);
    }

    // Validation: name
    const trimmedName = props.name?.trim() ?? '';
    if (trimmedName.length < EINSATZ_EINHEIT_VALIDATION.NAME_MIN_LENGTH) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_REQUIRED);
    }
    if (trimmedName.length > EINSATZ_EINHEIT_VALIDATION.NAME_MAX_LENGTH) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_TOO_LONG);
    }

    // Validation: typ
    if (!props.typ || !VALID_EINHEIT_TYPEN.includes(props.typ)) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.TYP_INVALID);
    }

    // Validation: funktion (optional)
    let trimmedFunktion: string | undefined = props.funktion?.trim();
    if (trimmedFunktion && trimmedFunktion.length > EINSATZ_EINHEIT_VALIDATION.FUNKTION_MAX_LENGTH) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.FUNKTION_TOO_LONG);
    }
    if (trimmedFunktion !== undefined && trimmedFunktion.length === 0) {
      trimmedFunktion = undefined;
    }

    // Validation: parentId (optional, muss CUID2 sein wenn gesetzt)
    let trimmedParentId: string | undefined = props.parentId?.trim();
    if (trimmedParentId && trimmedParentId.length > 0) {
      if (!isCuid(trimmedParentId)) {
        return Result.fail<EinsatzEinheit>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'parentId muss ein gültiger CUID2-Identifier sein'));
      }
    } else {
      trimmedParentId = undefined;
    }

    // Validation: sollStaerke (optional, default: 0)
    const sollStaerke = props.sollStaerke ?? 0;
    if (sollStaerke < EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MIN) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.SOLL_STAERKE_TOO_SMALL);
    }
    if (sollStaerke > EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MAX) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.SOLL_STAERKE_TOO_LARGE);
    }

    // Validation: auftrag (optional)
    let trimmedAuftrag: string | undefined = props.auftrag?.trim();
    if (trimmedAuftrag && trimmedAuftrag.length > EINSATZ_EINHEIT_VALIDATION.AUFTRAG_MAX_LENGTH) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.AUFTRAG_TOO_LONG);
    }
    if (trimmedAuftrag !== undefined && trimmedAuftrag.length === 0) {
      trimmedAuftrag = undefined;
    }

    // Validation: einsatzort (optional)
    let trimmedEinsatzort: string | undefined = props.einsatzort?.trim();
    if (trimmedEinsatzort && trimmedEinsatzort.length > EINSATZ_EINHEIT_VALIDATION.EINSATZORT_MAX_LENGTH) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.EINSATZORT_TOO_LONG);
    }
    if (trimmedEinsatzort !== undefined && trimmedEinsatzort.length === 0) {
      trimmedEinsatzort = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<EinsatzEinheit>(EINSATZ_EINHEIT_VALIDATION_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<EinsatzEinheit>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Create ID
    const idResult = EinsatzEinheitId.create();
    if (idResult.isFailure) {
      return Result.fail<EinsatzEinheit>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzEinheit>('Fehler bei ID-Generierung');
    }

    // Create Aggregate (initialer Status: AUFGESTELLT)
    const einheit = new EinsatzEinheit(
      id as EinsatzEinheitId,
      trimmedEinsatzId,
      trimmedName,
      props.typ,
      'AUFGESTELLT',
      sollStaerke,
      trimmedCreatedBy,
      trimmedParentId,
      trimmedFunktion,
      undefined, // einheitenfuehrerId
      trimmedAuftrag,
      trimmedEinsatzort,
    );

    // Emit Domain Event (für ETB-Eintrag)
    einheit.addDomainEvent(new EinheitErstelltEvent(trimmedEinsatzId, (id as EinsatzEinheitId).value, trimmedName, props.typ, trimmedFunktion, trimmedCreatedBy));

    return Result.ok<EinsatzEinheit>(einheit);
  }

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteEinsatzEinheitProps mit allen DB-Feldern
   * @returns Result<EinsatzEinheit>
   */
  static reconstitute(props: ReconstituteEinsatzEinheitProps): Result<EinsatzEinheit> {
    const idResult = EinsatzEinheitId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail<EinsatzEinheit>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzEinheit>('Ungültige ID');
    }

    // Typ validieren
    if (!VALID_EINHEIT_TYPEN.includes(props.typ as EinsatzEinheitTyp)) {
      return Result.fail<EinsatzEinheit>(`Ungültiger Typ in DB-Daten: ${props.typ}`);
    }

    // Status validieren
    if (!VALID_EINHEIT_STATUS.includes(props.status as EinsatzEinheitStatus)) {
      return Result.fail<EinsatzEinheit>(`Ungültiger Status in DB-Daten: ${props.status}`);
    }

    // Trim für Konsistenz
    const trimmedFunktion = props.funktion?.trim();
    const funktion = trimmedFunktion && trimmedFunktion.length > 0 ? trimmedFunktion : undefined;

    const trimmedAuftrag = props.auftrag?.trim();
    const auftrag = trimmedAuftrag && trimmedAuftrag.length > 0 ? trimmedAuftrag : undefined;

    const trimmedEinsatzort = props.einsatzort?.trim();
    const einsatzort = trimmedEinsatzort && trimmedEinsatzort.length > 0 ? trimmedEinsatzort : undefined;

    const trimmedParentId = props.parentId?.trim();
    const parentId = trimmedParentId && trimmedParentId.length > 0 ? trimmedParentId : undefined;

    const trimmedEinheitenfuehrerId = props.einheitenfuehrerId?.trim();
    const einheitenfuehrerId = trimmedEinheitenfuehrerId && trimmedEinheitenfuehrerId.length > 0 ? trimmedEinheitenfuehrerId : undefined;

    return Result.ok<EinsatzEinheit>(
      new EinsatzEinheit(
        id as EinsatzEinheitId,
        props.einsatzId.trim(),
        props.name.trim(),
        props.typ as EinsatzEinheitTyp,
        props.status as EinsatzEinheitStatus,
        props.sollStaerke,
        props.createdBy.trim(),
        parentId,
        funktion,
        einheitenfuehrerId,
        auftrag,
        einsatzort,
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
        props.istStaerke,
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert die Details einer Einheit.
   *
   * Keine spezifischen Domain Events (nur State-Update).
   *
   * @param props - Zu aktualisierende Felder (alle optional)
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  updateDetails(props: {
    name?: string;
    typ?: EinsatzEinheitTyp;
    funktion?: string | null;
    sollStaerke?: number;
    auftrag?: string | null;
    einsatzort?: string | null;
    updatedBy: string;
  }): Result<void> {
    // Validation: updatedBy
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0 || !isCuid(trimmedUpdatedBy)) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    // Validation + Update: name
    if (props.name !== undefined) {
      const trimmedName = props.name.trim();
      if (trimmedName.length < EINSATZ_EINHEIT_VALIDATION.NAME_MIN_LENGTH) {
        return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_REQUIRED);
      }
      if (trimmedName.length > EINSATZ_EINHEIT_VALIDATION.NAME_MAX_LENGTH) {
        return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_TOO_LONG);
      }
      this._name = trimmedName;
    }

    // Validation + Update: typ
    if (props.typ !== undefined) {
      if (!VALID_EINHEIT_TYPEN.includes(props.typ)) {
        return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.TYP_INVALID);
      }
      this._typ = props.typ;
    }

    // Validation + Update: funktion (null = entfernen)
    if (props.funktion !== undefined) {
      if (props.funktion === null) {
        this._funktion = undefined;
      } else {
        const trimmedFunktion = props.funktion.trim();
        if (trimmedFunktion.length > EINSATZ_EINHEIT_VALIDATION.FUNKTION_MAX_LENGTH) {
          return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.FUNKTION_TOO_LONG);
        }
        this._funktion = trimmedFunktion.length > 0 ? trimmedFunktion : undefined;
      }
    }

    // Validation + Update: sollStaerke
    if (props.sollStaerke !== undefined) {
      if (props.sollStaerke < EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MIN) {
        return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.SOLL_STAERKE_TOO_SMALL);
      }
      if (props.sollStaerke > EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MAX) {
        return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.SOLL_STAERKE_TOO_LARGE);
      }
      this._sollStaerke = props.sollStaerke;
    }

    // Validation + Update: auftrag (null = entfernen)
    if (props.auftrag !== undefined) {
      if (props.auftrag === null) {
        this._auftrag = undefined;
      } else {
        const trimmedAuftrag = props.auftrag.trim();
        if (trimmedAuftrag.length > EINSATZ_EINHEIT_VALIDATION.AUFTRAG_MAX_LENGTH) {
          return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.AUFTRAG_TOO_LONG);
        }
        this._auftrag = trimmedAuftrag.length > 0 ? trimmedAuftrag : undefined;
      }
    }

    // Validation + Update: einsatzort (null = entfernen)
    if (props.einsatzort !== undefined) {
      if (props.einsatzort === null) {
        this._einsatzort = undefined;
      } else {
        const trimmedEinsatzort = props.einsatzort.trim();
        if (trimmedEinsatzort.length > EINSATZ_EINHEIT_VALIDATION.EINSATZORT_MAX_LENGTH) {
          return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.EINSATZORT_TOO_LONG);
        }
        this._einsatzort = trimmedEinsatzort.length > 0 ? trimmedEinsatzort : undefined;
      }
    }

    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }

  /**
   * Ändert den Status der Einheit.
   *
   * Idempotent: Gleicher Status erzeugt kein Event.
   * Emittiert EinheitStatusGeaendertEvent bei Statusänderung.
   * Emittiert zusätzlich EinheitAufgeloestEvent wenn neuer Status AUFGELOEST ist.
   *
   * @param newStatus - Neuer Status der Einheit
   * @param updatedBy - User-ID für Audit-Trail
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  changeStatus(newStatus: string, updatedBy: string): Result<void> {
    // Validation: newStatus
    if (!newStatus || !VALID_EINHEIT_STATUS.includes(newStatus as EinsatzEinheitStatus)) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'Ungültiger Status'));
    }

    // Validation: updatedBy
    const trimmedUpdatedBy = updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0 || !isCuid(trimmedUpdatedBy)) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    // Idempotenz: Gleicher Status → kein Event
    if (this._status === newStatus) {
      return Result.ok<void>(undefined);
    }

    const alterStatus = this._status;
    this._status = newStatus as EinsatzEinheitStatus;
    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    // Domain Event: Status geändert
    this.addDomainEvent(new EinheitStatusGeaendertEvent(this._einsatzId, this._id.value, this._name, alterStatus, newStatus, trimmedUpdatedBy));

    // Zusätzliches Event bei Auflösung
    if (newStatus === 'AUFGELOEST') {
      this.addDomainEvent(new EinheitAufgeloestEvent(this._einsatzId, this._id.value, this._name, trimmedUpdatedBy));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Setzt den Einheitenführer.
   *
   * @param fuehrerId - EinsatzPerson-ID des Einheitenführers (null = entfernen)
   * @param updatedBy - User-ID für Audit-Trail
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  setEinheitenfuehrer(fuehrerId: string | null, updatedBy: string): Result<void> {
    // Validation: updatedBy
    const trimmedUpdatedBy = updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0 || !isCuid(trimmedUpdatedBy)) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    // Validation: fuehrerId (wenn gesetzt, muss CUID2 sein)
    if (fuehrerId !== null) {
      const trimmedFuehrerId = fuehrerId?.trim() ?? '';
      if (trimmedFuehrerId.length === 0 || !isCuid(trimmedFuehrerId)) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'fuehrerId muss ein gültiger CUID2-Identifier sein'));
      }
      this._einheitenfuehrerId = trimmedFuehrerId;
    } else {
      this._einheitenfuehrerId = undefined;
    }

    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }

  /**
   * Verschiebt die Einheit zu einem anderen Eltern-Knoten.
   *
   * Zirkuläre Hierarchie-Prüfung muss im Application Layer erfolgen
   * (benötigt DB-Zugriff für Ancestor-Check).
   *
   * @param parentId - Neue übergeordnete Einheit-ID (null = Top-Level)
   * @param updatedBy - User-ID für Audit-Trail
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  moveToParent(parentId: string | null, updatedBy: string): Result<void> {
    // Validation: updatedBy
    const trimmedUpdatedBy = updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0 || !isCuid(trimmedUpdatedBy)) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    // Validation: parentId (wenn gesetzt, muss CUID2 sein)
    if (parentId !== null) {
      const trimmedParentId = parentId?.trim() ?? '';
      if (trimmedParentId.length === 0 || !isCuid(trimmedParentId)) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR, 'parentId muss ein gültiger CUID2-Identifier sein'));
      }

      // Self-Reference Check
      if (trimmedParentId === this._id.value) {
        return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.CIRCULAR_HIERARCHY, 'Eine Einheit kann nicht ihr eigener Vorfahre sein'));
      }

      this._parentId = trimmedParentId;
    } else {
      this._parentId = undefined;
    }

    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }
}
