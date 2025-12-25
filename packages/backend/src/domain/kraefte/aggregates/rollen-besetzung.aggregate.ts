import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import type { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { RolleBesetzt } from '@domain/kraefte/events/rolle-besetzt.event';
import { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';

/**
 * Props für RollenBesetzung Factory Method.
 */
export interface RollenBesetzungCreateProps {
  /** Einsatz-ID zu dem die Besetzung gehört */
  einsatzId: EinsatzId;
  /** EinsatzPerson-ID der zuzuweisenden Person */
  einsatzPersonId: EinsatzPersonId;
  /** RollenDefinition-ID der zu besetzenden Rolle */
  rolleId: RolleId;
  /** Snapshot: Rollenname zum Zeitpunkt der Besetzung (für ETB) */
  rollenName: string;
  /** Snapshot: Vorname der Person zum Zeitpunkt der Besetzung (für ETB) */
  personVorname: string;
  /** Snapshot: Nachname der Person zum Zeitpunkt der Besetzung (für ETB) */
  personNachname: string;
  /** User-ID der die Besetzung durchführt */
  besetztVon: string;
}

/**
 * Props für RollenBesetzung Rekonstitution aus DB.
 */
export interface RollenBesetzungReconstitutionProps {
  /** Existierende ID aus DB */
  id: RollenBesetzungId;
  /** Einsatz-ID */
  einsatzId: EinsatzId;
  /** EinsatzPerson-ID */
  einsatzPersonId: EinsatzPersonId;
  /** RollenDefinition-ID */
  rolleId: RolleId;
  /** Snapshot: Rollenname (für ETB bei Freigabe) */
  rollenName: string;
  /** Snapshot: Vorname */
  personVorname: string;
  /** Snapshot: Nachname */
  personNachname: string;
  /** Audit: Wann erstellt */
  createdAt: Date;
  /** Audit: Von wem erstellt */
  createdBy: string;
  /** Audit: Wann zuletzt geändert */
  updatedAt: Date;
}

/**
 * RollenBesetzung Aggregate - Zuweisungsbeziehung zwischen Person und Führungsrolle.
 *
 * Repräsentiert die Besetzung einer Führungsrolle (LNA, OrgL, Leiter BHP, etc.)
 * durch eine qualifizierte EinsatzPerson im Kontext eines Einsatzes.
 *
 * **Business Rules:**
 * - AC1: Nur Personen mit allen Pflicht-Qualifikationen können zugewiesen werden
 * - AC2: Eine Rolle kann pro Einsatz nur EINMAL besetzt werden (UNIQUE Constraint)
 * - AC3: Rollennamen und Personennamen werden als Snapshots gespeichert (ETB-Historisierung)
 * - AC4: Bei Neu-Besetzung wird vorherige Besetzung automatisch freigegeben
 *
 * **Domain Events:**
 * - RolleBesetzt: Emittiert bei Erstellung
 * - RolleFreigegeben: Emittiert bei freigeben()
 *
 * @see IRollenBesetzungRepository für Persistenz
 * @see BesetzeRolleHandler für Application Layer Orchestration
 */
export class RollenBesetzung extends AggregateRoot<RollenBesetzungId> {
  private readonly _einsatzId: EinsatzId;
  private readonly _einsatzPersonId: EinsatzPersonId;
  private readonly _rolleId: RolleId;
  private readonly _rollenName: string;
  private readonly _personVorname: string;
  private readonly _personNachname: string;
  private readonly _createdBy: string;

  /**
   * Private Constructor - erzwingt Factory Methods für Instanziierung.
   */
  private constructor(
    id: RollenBesetzungId,
    einsatzId: EinsatzId,
    einsatzPersonId: EinsatzPersonId,
    rolleId: RolleId,
    rollenName: string,
    personVorname: string,
    personNachname: string,
    createdBy: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._einsatzPersonId = einsatzPersonId;
    this._rolleId = rolleId;
    this._rollenName = rollenName;
    this._personVorname = personVorname;
    this._personNachname = personNachname;
    this._createdBy = createdBy;
  }

  // ===== FACTORY METHODS =====

  /**
   * Erstellt eine neue RollenBesetzung und emittiert RolleBesetzt Event.
   *
   * **Voraussetzung:** Qualifikationsprüfung MUSS im Handler erfolgen (AC1).
   * Dieses Aggregate ist nur für die Zuweisungsbeziehung verantwortlich.
   *
   * @param props - CreateProps mit allen erforderlichen Daten
   * @returns Result<RollenBesetzung> - Success mit Aggregate oder Failure mit Error
   */
  public static create(props: RollenBesetzungCreateProps): Result<RollenBesetzung> {
    // Value Objects sind bereits validiert (vom Handler)
    const idResult = RollenBesetzungId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail('Fehler bei ID-Generierung');
    }

    const aggregate = new RollenBesetzung(idResult.value, props.einsatzId, props.einsatzPersonId, props.rolleId, props.rollenName, props.personVorname, props.personNachname, props.besetztVon);

    // Emit Domain Event
    aggregate.addDomainEvent(new RolleBesetzt(props.einsatzId.value, props.einsatzPersonId.value, props.rolleId.value, props.rollenName, props.personVorname, props.personNachname, props.besetztVon));

    return Result.ok(aggregate);
  }

  /**
   * Rekonstruiert RollenBesetzung aus Datenbank (keine Events emittiert).
   *
   * Verwendet für Repository.findById() und ähnliche Leseoperationen.
   * KEINE Domain Events, da es sich um eine Rekonstruktion bestehender Daten handelt.
   *
   * @param props - ReconstitutionProps mit allen DB-Feldern
   * @returns Result<RollenBesetzung> - Always Success (DB-Daten sind valide)
   */
  public static reconstitute(props: RollenBesetzungReconstitutionProps): Result<RollenBesetzung> {
    const aggregate = new RollenBesetzung(
      props.id,
      props.einsatzId,
      props.einsatzPersonId,
      props.rolleId,
      props.rollenName,
      props.personVorname,
      props.personNachname,
      props.createdBy,
      props.createdAt,
      props.updatedAt,
    );

    // KEINE Events bei Rekonstitution!
    return Result.ok(aggregate);
  }

  // ===== BUSINESS METHODS =====

  /**
   * Gibt die Rollenbesetzung frei und emittiert RolleFreigegeben Event.
   *
   * Verwendet für:
   * - Manuelle Freigabe durch User
   * - Automatische Freigabe bei Neu-Besetzung (AC4)
   *
   * @param freigegebenVon - User-ID der die Freigabe durchführt
   */
  public freigeben(freigegebenVon: string): void {
    this.addDomainEvent(new RolleFreigegeben(this._einsatzId.value, this._einsatzPersonId.value, this._rolleId.value, this._rollenName, this._personVorname, this._personNachname, freigegebenVon));
  }

  // ===== GETTERS =====

  get einsatzId(): EinsatzId {
    return this._einsatzId;
  }

  get einsatzPersonId(): EinsatzPersonId {
    return this._einsatzPersonId;
  }

  get rolleId(): RolleId {
    return this._rolleId;
  }

  get rollenName(): string {
    return this._rollenName;
  }

  get personVorname(): string {
    return this._personVorname;
  }

  get personNachname(): string {
    return this._personNachname;
  }

  get createdBy(): string {
    return this._createdBy;
  }
}
