import { createId } from '@paralleldrive/cuid2';
import type { UserId } from '@domain/value-objects/user-id';

/**
 * BefehlKommentar Child Entity.
 *
 * Repräsentiert einen Kommentar zu einem Befehl, mit Thread-Support
 * via parentId für verschachtelte Antworten.
 *
 * WICHTIG: Kein eigenes Repository — wird über Befehl Aggregate persistiert.
 */
export class BefehlKommentar {
  private readonly _id: string;
  private readonly _authorId: UserId;
  private readonly _text: string;
  private readonly _isRueckfrage: boolean;
  private readonly _parentId: string | undefined;
  private readonly _createdAt: Date;

  protected constructor(id: string, authorId: UserId, text: string, isRueckfrage: boolean, parentId?: string, createdAt?: Date) {
    this._id = id;
    this._authorId = authorId;
    this._text = text;
    this._isRueckfrage = isRueckfrage;
    this._parentId = parentId;
    this._createdAt = createdAt ?? new Date();
  }

  /**
   * Erstellt einen neuen BefehlKommentar.
   */
  public static create(authorId: UserId, text: string, isRueckfrage: boolean, parentId?: string): BefehlKommentar {
    const id = createId();
    return new BefehlKommentar(id, authorId, text, isRueckfrage, parentId);
  }

  /**
   * Rekonstruiert einen BefehlKommentar aus DB-Daten.
   */
  public static reconstitute(id: string, authorId: UserId, text: string, isRueckfrage: boolean, parentId?: string, createdAt?: Date): BefehlKommentar {
    return new BefehlKommentar(id, authorId, text, isRueckfrage, parentId, createdAt);
  }

  get id(): string {
    return this._id;
  }

  get authorId(): UserId {
    return this._authorId;
  }

  get text(): string {
    return this._text;
  }

  get isRueckfrage(): boolean {
    return this._isRueckfrage;
  }

  get parentId(): string | undefined {
    return this._parentId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * ID-based Equality Check.
   */
  public equals(other?: BefehlKommentar): boolean {
    if (other == null) return false;
    if (other === this) return true;
    return this._id === other._id;
  }
}
