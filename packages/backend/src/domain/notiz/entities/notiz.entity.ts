import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import type { UserId } from '@domain/value-objects/user-id';
import { NotizErstelltEvent } from '@domain/notiz/events/notiz-erstellt.event';
import { NotizAktualisiertEvent } from '@domain/notiz/events/notiz-aktualisiert.event';
import { NotizGeloeschtEvent } from '@domain/notiz/events/notiz-geloescht.event';

/**
 * Props fuer die Erstellung einer neuen Notiz.
 */
export interface CreateNotizProps {
  einsatzId: string;
  titel: string;
  inhalt?: string;
  /** @deprecated Legacy-Feld, wird nicht mehr im UI genutzt. Nutze stattdessen kategorieId. */
  kategorie?: string;
  /** Story 8.2: Kategorie-Referenz */
  kategorieId?: string | null;
  istTeamsichtbar?: boolean;
  erstelltVon: UserId;
}

/**
 * Props fuer die Rekonstruktion einer Notiz aus der Datenbank.
 */
export interface ReconstructNotizProps {
  id: NotizId;
  einsatzId: string;
  titel: NotizTitel;
  inhalt: string | null;
  /** @deprecated Legacy-Feld, wird nicht mehr im UI genutzt */
  kategorie: string | null;
  /** Story 8.2: Kategorie-Referenz */
  kategorieId: string | null;
  istTeamsichtbar: boolean;
  erstelltVon: UserId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: UserId | null;
}

/**
 * Props fuer die Aktualisierung einer bestehenden Notiz (Story 7.3).
 */
export interface UpdateNotizProps {
  titel?: string;
  inhalt?: string | null;
  /** @deprecated Legacy-Feld, wird nicht mehr im UI genutzt. Nutze stattdessen kategorieId. */
  kategorie?: string | null;
  /** Story 8.2: Kategorie-Referenz */
  kategorieId?: string | null;
  istTeamsichtbar?: boolean;
  aktualisiertVon: string;
}

/**
 * Notiz Aggregate Root.
 * Kapselt Business Rules fuer Notizen im Einsatz-Kontext.
 * KEIN Timer, KEIN Status-Automat - reine Informationsspeicherung.
 */
export class Notiz extends AggregateRoot<NotizId> {
  public static readonly MAX_INHALT_LENGTH = 2000;
  public static readonly MAX_KATEGORIE_LENGTH = 50;

  private readonly _einsatzId: string;
  private _titel: NotizTitel;
  private _inhalt: string | null;
  /** @deprecated Legacy-Feld, wird nicht mehr im UI genutzt */
  private _kategorie: string | null;
  /** Story 8.2: Kategorie-Referenz */
  private _kategorieId: string | null;
  private readonly _erstelltVon: UserId;
  private _istTeamsichtbar: boolean;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: UserId | null;

  private constructor(
    id: NotizId,
    einsatzId: string,
    titel: NotizTitel,
    inhalt: string | null,
    kategorie: string | null,
    kategorieId: string | null,
    erstelltVon: UserId,
    istTeamsichtbar = false,
    createdAt?: Date,
    updatedAt?: Date,
    isDeleted = false,
    deletedAt: Date | null = null,
    deletedBy: UserId | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._titel = titel;
    this._inhalt = inhalt;
    this._kategorie = kategorie;
    this._kategorieId = kategorieId;
    this._erstelltVon = erstelltVon;
    this._istTeamsichtbar = istTeamsichtbar;
    this._isDeleted = isDeleted;
    this._deletedAt = deletedAt;
    this._deletedBy = deletedBy;
  }

  // Getters
  get einsatzId(): string {
    return this._einsatzId;
  }
  get titel(): NotizTitel {
    return this._titel;
  }
  get inhalt(): string | null {
    return this._inhalt;
  }
  /** @deprecated Legacy-Feld, wird nicht mehr im UI genutzt */
  get kategorie(): string | null {
    return this._kategorie;
  }
  /** Story 8.2: Kategorie-Referenz */
  get kategorieId(): string | null {
    return this._kategorieId;
  }
  get erstelltVon(): UserId {
    return this._erstelltVon;
  }
  get istTeamsichtbar(): boolean {
    return this._istTeamsichtbar;
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

  /**
   * Factory Method: Neue Notiz erstellen.
   */
  static create(props: CreateNotizProps): Result<Notiz> {
    // Validiere Titel
    const titelResult = NotizTitel.create(props.titel);
    if (titelResult.isFailure || !titelResult.value) {
      return Result.fail<Notiz>(titelResult.error ?? 'NOTIZ_TITEL_INVALID');
    }

    // Validiere Inhalt
    let inhalt: string | null = null;
    if (props.inhalt != null && props.inhalt.trim().length > 0) {
      const trimmedInhalt = props.inhalt.trim();
      if (trimmedInhalt.length > Notiz.MAX_INHALT_LENGTH) {
        return Result.fail<Notiz>(`NOTIZ_INHALT_TOO_LONG: Inhalt darf maximal ${Notiz.MAX_INHALT_LENGTH} Zeichen haben`);
      }
      inhalt = trimmedInhalt;
    }

    // Validiere Kategorie
    let kategorie: string | null = null;
    if (props.kategorie != null && props.kategorie.trim().length > 0) {
      const trimmedKategorie = props.kategorie.trim();
      if (trimmedKategorie.length > Notiz.MAX_KATEGORIE_LENGTH) {
        return Result.fail<Notiz>(`NOTIZ_KATEGORIE_TOO_LONG: Kategorie darf maximal ${Notiz.MAX_KATEGORIE_LENGTH} Zeichen haben`);
      }
      kategorie = trimmedKategorie;
    }

    // Generiere ID
    const idResult = NotizId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Notiz>(idResult.error ?? 'NOTIZ_ID_INVALID');
    }

    const notiz = new Notiz(idResult.value as NotizId, props.einsatzId, titelResult.value, inhalt, kategorie, props.kategorieId ?? null, props.erstelltVon, props.istTeamsichtbar ?? false);

    // Emit Domain Event
    notiz.addDomainEvent(
      new NotizErstelltEvent(idResult.value as NotizId, props.einsatzId, titelResult.value.value, props.erstelltVon, props.istTeamsichtbar ?? false, (idResult.value as NotizId).toString()),
    );

    return Result.ok<Notiz>(notiz);
  }

  /**
   * Reconstruct: Notiz aus der Datenbank rekonstruieren.
   */
  static reconstruct(props: ReconstructNotizProps): Notiz {
    return new Notiz(
      props.id,
      props.einsatzId,
      props.titel,
      props.inhalt,
      props.kategorie,
      props.kategorieId,
      props.erstelltVon,
      props.istTeamsichtbar,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
      props.deletedAt,
      props.deletedBy,
    );
  }

  /**
   * Aktualisiert die Notiz mit den gegebenen Properties (Story 7.3).
   * Business Rules:
   * - Geloeschte Notizen duerfen nicht bearbeitet werden
   * - Mindestens ein Feld muss geaendert werden
   * - Titel, Inhalt und Kategorie werden validiert
   */
  public update(props: UpdateNotizProps): Result<void> {
    // Business Rule: Geloeschte Notizen duerfen nicht bearbeitet werden
    if (this._isDeleted) {
      return Result.fail<void>('NOTIZ_ALREADY_DELETED');
    }

    // Mindestens ein Feld muss geaendert werden
    if (props.titel === undefined && props.inhalt === undefined && props.kategorie === undefined && props.kategorieId === undefined && props.istTeamsichtbar === undefined) {
      return Result.fail<void>('NOTIZ_NO_CHANGES');
    }

    // Validiere und update Titel
    if (props.titel !== undefined) {
      const titelResult = NotizTitel.create(props.titel);
      if (titelResult.isFailure || !titelResult.value) {
        return Result.fail<void>(titelResult.error ?? 'NOTIZ_TITEL_INVALID');
      }
      this._titel = titelResult.value;
    }

    // Validiere und update Inhalt (null = Inhalt entfernen)
    if (props.inhalt !== undefined) {
      if (props.inhalt !== null) {
        const trimmed = props.inhalt.trim();
        if (trimmed.length > Notiz.MAX_INHALT_LENGTH) {
          return Result.fail<void>(`NOTIZ_INHALT_TOO_LONG: Inhalt darf maximal ${Notiz.MAX_INHALT_LENGTH} Zeichen haben`);
        }
        this._inhalt = trimmed.length > 0 ? trimmed : null;
      } else {
        this._inhalt = null;
      }
    }

    // Validiere und update Kategorie (null = Kategorie entfernen)
    // @deprecated Legacy-Feld, wird nicht mehr im UI genutzt
    if (props.kategorie !== undefined) {
      if (props.kategorie !== null) {
        const trimmed = props.kategorie.trim();
        if (trimmed.length > Notiz.MAX_KATEGORIE_LENGTH) {
          return Result.fail<void>(`NOTIZ_KATEGORIE_TOO_LONG: Kategorie darf maximal ${Notiz.MAX_KATEGORIE_LENGTH} Zeichen haben`);
        }
        this._kategorie = trimmed.length > 0 ? trimmed : null;
      } else {
        this._kategorie = null;
      }
    }

    // Story 8.2: Update kategorieId (null = Kategorie entfernen)
    if (props.kategorieId !== undefined) {
      this._kategorieId = props.kategorieId;
    }

    // Update istTeamsichtbar (Boolean: expliziter Wert-Check)
    if (props.istTeamsichtbar !== undefined) {
      this._istTeamsichtbar = props.istTeamsichtbar;
    }

    this.updateTimestamp();

    // Emit Domain Event
    this.addDomainEvent(new NotizAktualisiertEvent(this.id, this._einsatzId, this._titel.value, this._inhalt, this._kategorie, this._istTeamsichtbar, props.aktualisiertVon, this.id.toString()));

    return Result.ok<void>(undefined);
  }

  /**
   * Soft-Delete: Markiert die Notiz als geloescht (Story 7.4).
   * Idempotenz: Bereits geloeschte Notizen geben Failure zurueck.
   */
  public delete(geloeschtVon: UserId): Result<void> {
    if (this._isDeleted) {
      return Result.fail<void>('NOTIZ_ALREADY_DELETED');
    }

    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedBy = geloeschtVon;

    // Kein updateTimestamp() — Soft-Delete hat separates deletedAt Feld (konsistent mit Erinnerung.delete())

    this.addDomainEvent(new NotizGeloeschtEvent(this.id, this._einsatzId, this._titel.value, geloeschtVon, this.id.toString()));

    return Result.ok<void>(undefined);
  }
}
