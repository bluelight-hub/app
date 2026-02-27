import { AggregateRoot } from '@domain/common/aggregate-root';
import { anonymisiereString } from '@domain/common/anonymisierung';
import { Result } from '@domain/common/result';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Properties für die Befehl-Erstellung.
 * Kapselt alle erforderlichen und optionalen Felder für create() Factory.
 */
interface CreateBefehlProps {
  einsatzId: EinsatzId;
  auftrag: string;
  befehlsgeber: string;
  befehlsgeberId?: UserId;
  erstellerId: UserId;
  nummer: string;
  empfaenger: { name: string; empfaengerId?: UserId }[];
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
  private _befehlsgeberName: string;
  private _befehlsgeberId: UserId | undefined;
  private _erstellerId: UserId | undefined;
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
  private _isDeleted: boolean;
  private _deletedAt?: Date;
  private _deletedBy?: string;
  private _anonymisiertAm?: Date;

  private constructor(
    id: BefehlId,
    nummer: string,
    einsatzId: EinsatzId,
    auftrag: string,
    befehlsgeberName: string,
    befehlsgeberId: UserId | undefined,
    erstellerId: UserId | undefined,
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
    isDeleted = false,
    deletedAt?: Date,
    deletedBy?: string,
    anonymisiertAm?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._nummer = nummer;
    this._einsatzId = einsatzId;
    this._auftrag = auftrag;
    this._befehlsgeberName = befehlsgeberName;
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
    this._isDeleted = isDeleted;
    this._deletedAt = deletedAt;
    this._deletedBy = deletedBy;
    this._anonymisiertAm = anonymisiertAm;
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

  get befehlsgeberName(): string {
    return this._befehlsgeberName;
  }

  get befehlsgeberId(): UserId | undefined {
    return this._befehlsgeberId;
  }

  get erstellerId(): UserId | undefined {
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

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  get deletedBy(): string | undefined {
    return this._deletedBy;
  }

  get anonymisiertAm(): Date | undefined {
    return this._anonymisiertAm;
  }

  /** Prüft ob der Befehl bereits anonymisiert wurde. */
  get istAnonymisiert(): boolean {
    return this._anonymisiertAm !== undefined;
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
   * - Befehlsnummer wird von außen übergeben (Format: B-{SEQ}, z.B. B-001)
   * - Bei Erfolg wird BefehlErstelltEvent emittiert
   */
  static create(props: CreateBefehlProps): Result<Befehl> {
    if (!props.auftrag || props.auftrag.trim().length === 0) {
      return Result.fail<Befehl>('Auftrag ist erforderlich');
    }

    if (!props.einsatzId) {
      return Result.fail<Befehl>('EinsatzId ist erforderlich');
    }

    if (!props.befehlsgeber || props.befehlsgeber.trim().length === 0) {
      return Result.fail<Befehl>('Befehlsgeber ist erforderlich');
    }

    if (!props.erstellerId) {
      return Result.fail<Befehl>('ErstellerId ist erforderlich');
    }

    if (!props.empfaenger || props.empfaenger.length === 0) {
      return Result.fail<Befehl>('Mindestens ein Empfänger ist erforderlich');
    }

    const idResult = BefehlId.create();
    if (idResult.isFailure) {
      return Result.fail<Befehl>(idResult.error ?? 'Failed to create BefehlId');
    }
    const id = idResult.value as BefehlId;

    if (!props.nummer || props.nummer.trim().length === 0) {
      return Result.fail<Befehl>('Nummer ist erforderlich');
    }

    const initialStatus = BefehlStatus.ERTEILT();
    const erteiltAm = new Date();
    const empfaenger = props.empfaenger.map((e) => BefehlEmpfaenger.create(e.name, e.empfaengerId));

    const befehl = new Befehl(
      id,
      props.nummer,
      props.einsatzId,
      props.auftrag.trim(),
      props.befehlsgeber.trim(),
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
        props.nummer,
        props.empfaenger.map((e) => e.name),
        id.value,
        empfaenger.flatMap((empfaengerEintrag) => (empfaengerEintrag.empfaengerId ? [empfaengerEintrag.empfaengerId.value] : [])),
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
    befehlsgeberName: string;
    befehlsgeberId: UserId | undefined;
    erstellerId: UserId | undefined;
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
    isDeleted?: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    anonymisiertAm?: Date;
  }): Befehl {
    return new Befehl(
      props.id,
      props.nummer,
      props.einsatzId,
      props.auftrag,
      props.befehlsgeberName,
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
      props.isDeleted,
      props.deletedAt,
      props.deletedBy,
      props.anonymisiertAm,
    );
  }

  /**
   * Berechnet den Befehl-Status neu basierend auf ALLEN Empfaengern.
   *
   * Regel:
   * - KORRIGIERT wird nie überschrieben
   * - Alle Empfaenger quittiert → QUITTIERT
   * - Alle Empfaenger zugestellt → ZUGESTELLT
   * - Sonst → ERTEILT
   */
  private recomputeStatus(): void {
    if (this._status.value === 'KORRIGIERT') return;

    const alle = this._empfaenger;
    if (alle.length === 0) return;

    let neuerStatus: BefehlStatus;

    const alleQuittiert = alle.every((e) => e.quittiertAm !== undefined);
    const alleZugestellt = alle.every((e) => e.zugestelltAm !== undefined);

    if (alleQuittiert) {
      neuerStatus = BefehlStatus.QUITTIERT();
    } else if (alleZugestellt) {
      neuerStatus = BefehlStatus.ZUGESTELLT();
    } else {
      neuerStatus = BefehlStatus.ERTEILT();
    }

    if (neuerStatus.value !== this._status.value && this._status.canTransitionTo(neuerStatus)) {
      const oldStatus = this._status;
      this._status = neuerStatus;
      this.addDomainEvent(
        new BefehlStatusGeaendertEvent(
          this.id,
          oldStatus,
          this._status,
          this._einsatzId,
          this._nummer,
          this.id.value,
          this._erstellerId,
          this._befehlsgeberId,
          this._empfaenger.flatMap((empfaengerEintrag) => (empfaengerEintrag.empfaengerId ? [empfaengerEintrag.empfaengerId.value] : [])),
        ),
      );
    }
  }

  /**
   * Markiert einen Empfänger als zugestellt.
   * Wenn alle Empfänger zugestellt sind, wechselt der Befehl-Status zu ZUGESTELLT.
   */
  public markAlsZugestellt(empfaengerId: UserId): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht mehr zugestellt werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.empfaengerId?.equals(empfaengerId));
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde bereits als zugestellt markiert');
    }

    empfaenger.markAlsZugestellt();
    const zugestelltAm = empfaenger.zugestelltAm;
    if (!zugestelltAm) {
      return Result.fail<void>('Empfänger-Zustellzeit konnte nicht gesetzt werden');
    }

    this.addDomainEvent(new BefehlZugestelltEvent(this.id, empfaengerId.value, zugestelltAm, this._einsatzId, empfaenger.name, this._nummer, this.id.value));

    this.recomputeStatus();

    return Result.ok<void>(undefined);
  }

  /**
   * Empfänger quittiert den Befehl mit einer QuittierungArt.
   * Wenn alle Empfänger quittiert haben, wechselt der Status zu QUITTIERT.
   */
  public quittieren(empfaengerId: UserId, quittierungArt: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN', kommentar?: string): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht quittiert werden');
    }

    if (this._status.value === 'QUITTIERT') {
      return Result.fail<void>('Ein bereits vollständig quittierter Befehl kann nicht erneut quittiert werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.empfaengerId?.equals(empfaengerId));
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (!empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde noch nicht zugestellt');
    }

    if (empfaenger.quittiertAm) {
      return Result.fail<void>('Empfänger hat bereits quittiert');
    }

    const quittierungResult = empfaenger.quittieren(quittierungArt, undefined, kommentar);
    if (quittierungResult.isFailure) {
      return Result.fail<void>(quittierungResult.error ?? 'Quittierung fehlgeschlagen');
    }
    const quittiertAm = empfaenger.quittiertAm;
    if (!quittiertAm) {
      return Result.fail<void>('Empfänger-Quittierungszeit konnte nicht gesetzt werden');
    }

    // Story 2.1 AC2: BefehlQuittiertEvent emittieren nach erfolgreicher Quittierung
    this.addDomainEvent(
      new BefehlQuittiertEvent(
        this.id,
        this._einsatzId,
        empfaengerId,
        quittierungArt,
        this._nummer,
        quittiertAm,
        empfaenger.quittierungKommentar,
        this._erstellerId,
        this._befehlsgeberId,
        this.id.value,
      ),
    );

    this.recomputeStatus();

    return Result.ok<void>(undefined);
  }

  /**
   * Markiert einen Empfänger manuell als zugestellt (per Entity-ID, nicht UserId).
   * Für Funk-Empfänger oder stellvertretende Zustellung.
   */
  public manuellZustellen(empfaengerEntityId: string): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht mehr zugestellt werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.id === empfaengerEntityId);
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde bereits als zugestellt markiert');
    }

    empfaenger.markAlsZugestellt();
    const zugestelltAm = empfaenger.zugestelltAm;
    if (!zugestelltAm) {
      return Result.fail<void>('Empfänger-Zustellzeit konnte nicht gesetzt werden');
    }

    this.addDomainEvent(new BefehlZugestelltEvent(this.id, empfaenger.empfaengerId?.value ?? empfaengerEntityId, zugestelltAm, this._einsatzId, empfaenger.name, this._nummer, this.id.value));

    this.recomputeStatus();

    return Result.ok<void>(undefined);
  }

  /**
   * Quittiert einen Empfänger stellvertretend (per Entity-ID, nicht UserId).
   * Für Funk-Empfänger oder wenn Ersteller/Befehlsgeber für den Empfänger quittiert.
   */
  public stellvertretendQuittieren(empfaengerEntityId: string, art: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN', kommentar?: string): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht quittiert werden');
    }

    if (this._status.value === 'QUITTIERT') {
      return Result.fail<void>('Ein bereits vollständig quittierter Befehl kann nicht erneut quittiert werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.id === empfaengerEntityId);
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (!empfaenger.zugestelltAm) {
      return Result.fail<void>('Empfänger wurde noch nicht zugestellt');
    }

    if (empfaenger.quittiertAm) {
      return Result.fail<void>('Empfänger hat bereits quittiert');
    }

    const quittierungResult = empfaenger.quittieren(art, undefined, kommentar);
    if (quittierungResult.isFailure) {
      return Result.fail<void>(quittierungResult.error ?? 'Quittierung fehlgeschlagen');
    }
    const quittiertAm = empfaenger.quittiertAm;
    if (!quittiertAm) {
      return Result.fail<void>('Empfänger-Quittierungszeit konnte nicht gesetzt werden');
    }

    let eventEmpfaengerId = empfaenger.empfaengerId;
    if (!eventEmpfaengerId) {
      const userIdResult = UserId.create(empfaengerEntityId);
      if (userIdResult.isFailure || !userIdResult.value) {
        return Result.fail<void>(userIdResult.error ?? 'Empfänger-ID konnte nicht in UserId umgewandelt werden');
      }
      eventEmpfaengerId = userIdResult.value as UserId;
    }

    this.addDomainEvent(
      new BefehlQuittiertEvent(this.id, this._einsatzId, eventEmpfaengerId, art, this._nummer, quittiertAm, empfaenger.quittierungKommentar, this._erstellerId, this._befehlsgeberId, this.id.value),
    );

    this.recomputeStatus();

    return Result.ok<void>(undefined);
  }

  /**
   * Setzt den Status eines Empfängers zurück (per Entity-ID).
   * Ziel kann ERTEILT oder ZUGESTELLT sein.
   */
  public empfaengerStatusZuruecksetzen(empfaengerEntityId: string, zielStatus: 'ERTEILT' | 'ZUGESTELLT'): Result<void> {
    if (this._status.value === 'KORRIGIERT') {
      return Result.fail<void>('Ein korrigierter Befehl kann nicht zurückgesetzt werden');
    }

    const empfaenger = this._empfaenger.find((e) => e.id === empfaengerEntityId);
    if (!empfaenger) {
      return Result.fail<void>('Empfänger nicht gefunden');
    }

    if (zielStatus === 'ERTEILT') {
      if (!empfaenger.zugestelltAm) {
        return Result.fail<void>('Empfänger ist bereits im Status ERTEILT');
      }
      empfaenger.zuruecksetzenAufErteilt();
    } else if (zielStatus === 'ZUGESTELLT') {
      if (!empfaenger.quittiertAm) {
        return Result.fail<void>('Empfänger ist bereits im Status ZUGESTELLT oder niedriger');
      }
      empfaenger.zuruecksetzenAufZugestellt();
    }

    this.recomputeStatus();

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

    this.addDomainEvent(
      new BefehlStatusGeaendertEvent(
        this.id,
        oldStatus,
        this._status,
        this._einsatzId,
        this._nummer,
        this.id.value,
        this._erstellerId,
        this._befehlsgeberId,
        this._empfaenger.flatMap((empfaengerEintrag) => (empfaengerEintrag.empfaengerId ? [empfaengerEintrag.empfaengerId.value] : [])),
      ),
    );

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

    if (parentId) {
      const parentExists = this._kommentare.some((k) => k.id === parentId);
      if (!parentExists) {
        return Result.fail<void>('Parent-Kommentar nicht gefunden');
      }
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

  /**
   * DSGVO-konforme irreversible Anonymisierung personenbezogener Daten.
   *
   * Anonymisiert:
   * - BefehlsgeberName → "[ANON-{hash6}]"
   * - BefehlsgeberId → undefined
   * - ErstellerId → undefined (Review-Fix H4)
   * - Empfaenger-Namen → "[ANON-{hash6}]"
   * - Kommentar-Author-IDs → undefined (Review-Fix C1)
   *
   * Erhalten bleibt:
   * - Befehlsnummer, Auftrag, Status, Zeitstempel
   * - Einsatz-Referenz, Sachinhalt (EAMZW-Felder)
   *
   * @param salt Per-Einsatz Salt fuer echte Anonymisierung (nicht gespeichert, Review-Fix C2)
   * @remarks Story 5.5 AC2 — IRREVERSIBEL mit Salt
   */
  public anonymisiere(salt: string): Result<{ empfaengerCount: number; kommentarCount: number }> {
    if (this._anonymisiertAm) {
      return Result.fail('Befehl wurde bereits anonymisiert');
    }

    if (this._isDeleted) {
      return Result.fail('Gelöschte Befehle können nicht anonymisiert werden');
    }

    // Anonymisiere Befehlsgeber (Name + IDs)
    this._befehlsgeberName = anonymisiereString(this._befehlsgeberName, salt);
    this._befehlsgeberId = undefined;
    this._erstellerId = undefined;

    // Anonymisiere Empfaenger-Namen
    let empfaengerCount = 0;
    for (const e of this._empfaenger) {
      e.anonymisiere(salt);
      empfaengerCount++;
    }

    // Anonymisiere Kommentar-Authors (Review-Fix C1)
    for (const k of this._kommentare) {
      k.anonymisiere(salt);
    }
    const kommentarCount = this._kommentare.length;

    this._anonymisiertAm = new Date();

    return Result.ok({ empfaengerCount, kommentarCount });
  }

  /**
   * Markiert den Befehl als soft-deleted nach Ablauf der Freigabeperiode.
   *
   * Voraussetzung: Befehl muss bereits anonymisiert sein.
   * Daten sind über die API nicht mehr abrufbar, Audit-Trail bleibt erhalten.
   *
   * @remarks Story 5.5 AC3
   */
  public markiereAlsGeloescht(deletedBy: string): Result<void> {
    if (!this._anonymisiertAm) {
      return Result.fail<void>('Nur anonymisierte Befehle können gelöscht werden');
    }

    if (this._isDeleted) {
      return Result.fail<void>('Befehl ist bereits gelöscht');
    }

    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedBy = deletedBy;

    return Result.ok<void>(undefined);
  }

  /**
   * Generiert einen irreversiblen 6-Zeichen-Hash aus einem Namen mit Salt.
   * Delegiert an shared Utility (Review-Fix M3).
   */
  static anonymisiereString(name: string, salt: string): string {
    return anonymisiereString(name, salt);
  }
}
