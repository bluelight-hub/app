import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { UserId } from '@domain/value-objects/user-id';
import { createId } from '@paralleldrive/cuid2';

/**
 * Properties für die Befehl-Erstellung.
 * Kapselt alle erforderlichen und optionalen Felder für create() Factory.
 */
interface CreateBefehlProps {
  einsatzId: EinsatzId;
  auftrag: string;
  befehlsgeberId: UserId;
  erstellerId: UserId;
  empfaengerIds: UserId[];
  zeitvorgabe?: string;
  ereignis?: string;
  mittel?: string;
  ziel?: string;
  weg?: string;
  originalBefehlId?: BefehlId;
}

/**
 * Befehl Aggregate Root für Befehlsmanagement im Einsatz.
 * Repräsentiert die transaktionale Grenze für alle Befehl-bezogenen Operationen.
 *
 * **State Machine:**
 * ERTEILT → ZUGESTELLT → QUITTIERT
 *     ↓
 * KORRIGIERT
 *
 * **Business Rules:**
 * - Append-Only: Befehle können NIEMALS gelöscht werden (GoBD-Compliance)
 * - Befehlstyp wird computed aus vorhandenen EAMZW-Feldern (nicht persistiert)
 * - Status-Transitions nur vorwärts gemäß State Machine
 * - Alle Empfänger müssen zugestellt sein bevor ZUGESTELLT-Status erreicht wird
 * - Alle Empfänger müssen quittiert haben bevor QUITTIERT-Status erreicht wird
 */
export class Befehl extends AggregateRoot<BefehlId> {
  private _nummer: string;
  private _einsatzId: EinsatzId;
  private _auftrag: string;
  private _befehlsgeberId: UserId;
  private _erstellerId: UserId;
  private _status: BefehlStatus;
  private _erteiltAm: Date;
  private _empfaenger: BefehlEmpfaenger[];
  private _kommentare: BefehlKommentar[];
  private _zeitvorgabe?: string;
  private _ereignis?: string;
  private _mittel?: string;
  private _ziel?: string;
  private _weg?: string;
  private _originalBefehlId?: BefehlId;

  private constructor(
    id: BefehlId,
    nummer: string,
    einsatzId: EinsatzId,
    auftrag: string,
    befehlsgeberId: UserId,
    erstellerId: UserId,
    status: BefehlStatus,
    erteiltAm: Date,
    empfaenger: BefehlEmpfaenger[],
    kommentare: BefehlKommentar[],
    zeitvorgabe?: string,
    ereignis?: string,
    mittel?: string,
    ziel?: string,
    weg?: string,
    originalBefehlId?: BefehlId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._nummer = nummer;
    this._einsatzId = einsatzId;
    this._auftrag = auftrag;
    this._befehlsgeberId = befehlsgeberId;
    this._erstellerId = erstellerId;
    this._status = status;
    this._erteiltAm = erteiltAm;
    this._empfaenger = empfaenger;
    this._kommentare = kommentare;
    this._zeitvorgabe = zeitvorgabe;
    this._ereignis = ereignis;
    this._mittel = mittel;
    this._ziel = ziel;
    this._weg = weg;
    this._originalBefehlId = originalBefehlId;
  }

  get nummer(): string {
    return this._nummer;
  }

  get einsatzId(): EinsatzId {
    return this._einsatzId;
  }

  get auftrag(): string {
    return this._auftrag;
  }

  get befehlsgeberId(): UserId {
    return this._befehlsgeberId;
  }

  get erstellerId(): UserId {
    return this._erstellerId;
  }

  get status(): BefehlStatus {
    return this._status;
  }

  get erteiltAm(): Date {
    return this._erteiltAm;
  }

  /** Shallow copy der Empfänger-Liste (mutation-safe). */
  get empfaenger(): readonly BefehlEmpfaenger[] {
    return [...this._empfaenger];
  }

  /** Shallow copy der Kommentar-Liste (mutation-safe). */
  get kommentare(): readonly BefehlKommentar[] {
    return [...this._kommentare];
  }

  get zeitvorgabe(): string | undefined {
    return this._zeitvorgabe;
  }

  get ereignis(): string | undefined {
    return this._ereignis;
  }

  get mittel(): string | undefined {
    return this._mittel;
  }

  get ziel(): string | undefined {
    return this._ziel;
  }

  get weg(): string | undefined {
    return this._weg;
  }

  get originalBefehlId(): BefehlId | undefined {
    return this._originalBefehlId;
  }

  /**
   * Computed getter: Bestimmt den Befehlstyp basierend auf vorhandenen EAMZW-Feldern.
   * NICHT in DB persistiert.
   *
   * - KURZBEFEHL: Nur Auftrag (keine EAMZW-Felder)
   * - EAMZW: Alle vier Felder (Ereignis, Auftrag/Mittel, Ziel, Weg) gesetzt
   * - ERWEITERT: Teilweise EAMZW-Felder gesetzt
   */
  get befehlstyp(): 'KURZBEFEHL' | 'EAMZW' | 'ERWEITERT' {
    const hasEamzw = this._ereignis && this._mittel && this._ziel && this._weg;
    if (hasEamzw) return 'EAMZW';
    if (this._ereignis || this._mittel || this._ziel || this._weg) return 'ERWEITERT';
    return 'KURZBEFEHL';
  }

  /**
   * Factory Method zur Erstellung eines Befehls mit Business Validation.
   *
   * **Business Rules:**
   * - Auftrag ist required
   * - Mindestens ein Empfänger ist required
   * - Initialer Status ist ERTEILT
   * - Befehlsnummer wird auto-generiert (Format: B{YEAR}-{CUID-8})
   * - Bei Erfolg wird BefehlErstelltEvent emittiert
   */
  static create(props: CreateBefehlProps): Result<Befehl> {
    if (!props.auftrag || props.auftrag.trim().length === 0) {
      return Result.fail<Befehl>('Auftrag ist erforderlich');
    }

    if (!props.einsatzId) {
      return Result.fail<Befehl>('EinsatzId ist erforderlich');
    }

    if (!props.befehlsgeberId) {
      return Result.fail<Befehl>('BefehlsgeberId ist erforderlich');
    }

    if (!props.erstellerId) {
      return Result.fail<Befehl>('ErstellerId ist erforderlich');
    }

    if (!props.empfaengerIds || props.empfaengerIds.length === 0) {
      return Result.fail<Befehl>('Mindestens ein Empfänger ist erforderlich');
    }

    const idResult = BefehlId.create();
    if (idResult.isFailure) {
      return Result.fail<Befehl>(idResult.error ?? 'Failed to create BefehlId');
    }
    const id = idResult.value as BefehlId;

    const nummer = Befehl.generateNummer();
    const initialStatus = BefehlStatus.ERTEILT();
    const erteiltAm = new Date();
    const empfaenger = props.empfaengerIds.map((empfaengerId) => BefehlEmpfaenger.create(empfaengerId));

    const befehl = new Befehl(
      id,
      nummer,
      props.einsatzId,
      props.auftrag.trim(),
      props.befehlsgeberId,
      props.erstellerId,
      initialStatus,
      erteiltAm,
      empfaenger,
      [],
      props.zeitvorgabe?.trim(),
      props.ereignis?.trim(),
      props.mittel?.trim(),
      props.ziel?.trim(),
      props.weg?.trim(),
      props.originalBefehlId,
    );

    befehl.addDomainEvent(
      new BefehlErstelltEvent(
        id,
        props.einsatzId,
        props.auftrag.trim(),
        nummer,
        props.empfaengerIds.map((e) => e.value),
        id.value,
      ),
    );

    return Result.ok<Befehl>(befehl);
  }

  /**
   * Rekonstruiert ein Befehl Aggregate aus DB-Daten (KEINE Domain Events!).
   * Für Repository Mapper: toDomain() nutzt reconstitute() statt create().
   */
  static reconstitute(props: {
    id: BefehlId;
    nummer: string;
    einsatzId: EinsatzId;
    auftrag: string;
    befehlsgeberId: UserId;
    erstellerId: UserId;
    status: BefehlStatus;
    erteiltAm: Date;
    empfaenger: BefehlEmpfaenger[];
    kommentare: BefehlKommentar[];
    zeitvorgabe?: string;
    ereignis?: string;
    mittel?: string;
    ziel?: string;
    weg?: string;
    originalBefehlId?: BefehlId;
    createdAt?: Date;
    updatedAt?: Date;
  }): Befehl {
    return new Befehl(
      props.id,
      props.nummer,
      props.einsatzId,
      props.auftrag,
      props.befehlsgeberId,
      props.erstellerId,
      props.status,
      props.erteiltAm,
      props.empfaenger,
      props.kommentare,
      props.zeitvorgabe,
      props.ereignis,
      props.mittel,
      props.ziel,
      props.weg,
      props.originalBefehlId,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Auto-generiert Befehlsnummer im Format "B{YEAR}-{CUID-8}".
   * Analog zu EinsatzNummer "E{YEAR}-{CUID-8}".
   */
  private static generateNummer(): string {
    const year = new Date().getFullYear();
    const randomPart = createId().substring(0, 8);
    return `B${year}-${randomPart}`;
  }

  /**
   * Markiert einen Empfänger als zugestellt.
   * Wenn alle Empfänger zugestellt sind, wechselt der Befehl-Status zu ZUGESTELLT.
   */
  public markAlsZugestellt(empfaengerId: UserId): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht mehr zugestellt werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.empfaengerId.equals(empfaengerId));
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde bereits als zugestellt markiert');
    }

    empfaenger.markAlsZugestellt();

    this.addDomainEvent(new BefehlZugestelltEvent(this.id, empfaengerId.value, empfaenger.zugestelltAm!, this.id.value));

    // Prüfe ob alle Empfänger zugestellt → Status-Transition zu ZUGESTELLT
    const alleZugestellt = this._empfaenger.every((e) => e.zugestelltAm !== undefined);
    if (alleZugestellt && this._status.canTransitionTo(BefehlStatus.ZUGESTELLT())) {
      const oldStatus = this._status;
      this._status = BefehlStatus.ZUGESTELLT();
      this.addDomainEvent(new BefehlStatusGeaendertEvent(this.id, oldStatus, this._status, this.id.value));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Empfänger quittiert den Befehl mit einer QuittierungArt.
   * Wenn alle Empfänger quittiert haben, wechselt der Status zu QUITTIERT.
   */
  public quittieren(empfaengerId: UserId, quittierungArt: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN'): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht quittiert werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.empfaengerId.equals(empfaengerId));
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (!empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde noch nicht zugestellt');
    }

    if (empfaenger.quittiertAm) {
      return Result.fail<void>('Empfänger hat bereits quittiert');
    }

    const quittierungResult = empfaenger.quittieren(quittierungArt);
    if (quittierungResult.isFailure) {
      return Result.fail<void>(quittierungResult.error ?? 'Quittierung fehlgeschlagen');
    }

    // Prüfe ob alle Empfänger quittiert → Status-Transition zu QUITTIERT
    const alleQuittiert = this._empfaenger.every((e) => e.quittiertAm !== undefined);
    if (alleQuittiert && this._status.canTransitionTo(BefehlStatus.QUITTIERT())) {
      const oldStatus = this._status;
      this._status = BefehlStatus.QUITTIERT();
      this.addDomainEvent(new BefehlStatusGeaendertEvent(this.id, oldStatus, this._status, this.id.value));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Markiert den Befehl als korrigiert (durch einen Korrekturbefehl ersetzt).
   * Nur möglich wenn Status-Transition gemäß State Machine gültig ist.
   */
  public korrigieren(): Result<void> {
    if (!this._status.canTransitionTo(BefehlStatus.KORRIGIERT())) {
      return Result.fail<void>(`Ungültige Status-Transition: ${this._status.value} → KORRIGIERT`);
    }

    const oldStatus = this._status;
    this._status = BefehlStatus.KORRIGIERT();

    this.addDomainEvent(new BefehlStatusGeaendertEvent(this.id, oldStatus, this._status, this.id.value));

    return Result.ok<void>(undefined);
  }

  /**
   * Fügt einen Kommentar zum Befehl hinzu.
   * Unterstützt Thread-Antworten via parentId.
   */
  public addKommentar(authorId: UserId, text: string, isRueckfrage: boolean, parentId?: string): Result<void> {
    if (!text || text.trim().length === 0) {
      return Result.fail<void>('Kommentar-Text ist erforderlich');
    }

    const kommentar = BefehlKommentar.create(authorId, text.trim(), isRueckfrage, parentId);
    this._kommentare.push(kommentar);

    this.addDomainEvent(new BefehlKommentarHinzugefuegtEvent(this.id, kommentar.id, authorId, text.trim(), isRueckfrage, parentId, this.id.value));

    return Result.ok<void>(undefined);
  }

  /**
   * Append-Only Policy: Befehle können NIEMALS gelöscht werden.
   * GoBD-Compliance erfordert lückenlose Befehlshistorie.
   */
  public canBeDeleted(): boolean {
    return false;
  }
}
