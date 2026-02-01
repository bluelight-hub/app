import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { ErinnerungsvorlageTitel } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-titel';
import type { UserId } from '@domain/value-objects/user-id';
import { ErinnerungsvorlageErstelltEvent } from '@domain/erinnerungsvorlage/events/erinnerungsvorlage-erstellt.event';

/**
 * Props fuer die Erstellung einer neuen Erinnerungsvorlage.
 */
export interface CreateErinnerungsvorlageProps {
  titel: string;
  minuten: number;
  beschreibung?: string;
  createdBy: UserId;
}

/**
 * Props fuer die Rekonstruktion einer Erinnerungsvorlage aus der Datenbank.
 */
export interface ReconstructErinnerungsvorlageProps {
  id: ErinnerungsvorlageId;
  titel: ErinnerungsvorlageTitel;
  minuten: number;
  beschreibung: string | null;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: UserId | null;
}

/**
 * Erinnerungsvorlage Aggregate Root.
 * Kapselt Business Rules fuer Erinnerungsvorlagen (Konfiguration/Stammdaten).
 */
export class Erinnerungsvorlage extends AggregateRoot<ErinnerungsvorlageId> {
  public static readonly MAX_BESCHREIBUNG_LENGTH = 500;
  public static readonly MIN_MINUTEN = 1;

  private readonly _titel: ErinnerungsvorlageTitel;
  private readonly _minuten: number;
  private readonly _beschreibung: string | null;
  private readonly _createdBy: UserId;
  private readonly _isDeleted: boolean;
  private readonly _deletedAt: Date | null;
  private readonly _deletedBy: UserId | null;

  private constructor(
    id: ErinnerungsvorlageId,
    titel: ErinnerungsvorlageTitel,
    minuten: number,
    beschreibung: string | null,
    createdBy: UserId,
    createdAt?: Date,
    updatedAt?: Date,
    isDeleted = false,
    deletedAt: Date | null = null,
    deletedBy: UserId | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this._titel = titel;
    this._minuten = minuten;
    this._beschreibung = beschreibung;
    this._createdBy = createdBy;
    this._isDeleted = isDeleted;
    this._deletedAt = deletedAt;
    this._deletedBy = deletedBy;
  }

  // Getters
  get titel(): ErinnerungsvorlageTitel {
    return this._titel;
  }
  get minuten(): number {
    return this._minuten;
  }
  get beschreibung(): string | null {
    return this._beschreibung;
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

  /**
   * Factory Method: Neue Erinnerungsvorlage erstellen.
   */
  static create(props: CreateErinnerungsvorlageProps): Result<Erinnerungsvorlage> {
    // Validiere Titel
    const titelResult = ErinnerungsvorlageTitel.create(props.titel);
    if (titelResult.isFailure || !titelResult.value) {
      return Result.fail<Erinnerungsvorlage>(titelResult.error ?? 'VORLAGE_TITEL_INVALID');
    }

    // Validiere Minuten
    if (props.minuten == null || props.minuten < Erinnerungsvorlage.MIN_MINUTEN) {
      return Result.fail<Erinnerungsvorlage>('VORLAGE_MINUTEN_INVALID');
    }

    // Validiere Beschreibung
    let beschreibung: string | null = null;
    if (props.beschreibung != null && props.beschreibung.trim().length > 0) {
      const trimmedBeschreibung = props.beschreibung.trim();
      if (trimmedBeschreibung.length > Erinnerungsvorlage.MAX_BESCHREIBUNG_LENGTH) {
        return Result.fail<Erinnerungsvorlage>(`VORLAGE_BESCHREIBUNG_TOO_LONG: Beschreibung darf maximal ${Erinnerungsvorlage.MAX_BESCHREIBUNG_LENGTH} Zeichen haben`);
      }
      beschreibung = trimmedBeschreibung;
    }

    // Generiere ID
    const idResult = ErinnerungsvorlageId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Erinnerungsvorlage>(idResult.error ?? 'VORLAGE_ID_INVALID');
    }

    const vorlage = new Erinnerungsvorlage(idResult.value as ErinnerungsvorlageId, titelResult.value, props.minuten, beschreibung, props.createdBy);

    // Emit Domain Event
    vorlage.addDomainEvent(
      new ErinnerungsvorlageErstelltEvent(idResult.value as ErinnerungsvorlageId, titelResult.value.value, props.minuten, props.createdBy, (idResult.value as ErinnerungsvorlageId).toString()),
    );

    return Result.ok<Erinnerungsvorlage>(vorlage);
  }

  /**
   * Reconstruct: Erinnerungsvorlage aus der Datenbank rekonstruieren.
   */
  static reconstruct(props: ReconstructErinnerungsvorlageProps): Erinnerungsvorlage {
    return new Erinnerungsvorlage(props.id, props.titel, props.minuten, props.beschreibung, props.createdBy, props.createdAt, props.updatedAt, props.isDeleted, props.deletedAt, props.deletedBy);
  }
}
