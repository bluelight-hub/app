import type { EintragId } from '@domain/value-objects/eintrag-id';
import { EtbKategorie } from '@domain/value-objects/etb-kategorie';
import type { EtbSequenceNumber } from '@domain/value-objects/etb-sequence-number';
import type { UserId } from '@domain/value-objects/user-id';

/**
 * Entity für ETB-Eintraege, verwaltet durch EinsatztagebuchAggregate.
 *
 * Diese Klasse repräsentiert einen einzelnen Eintrag im Einsatztagebuch.
 * WICHTIG: EtbEintrag ist KEINE Aggregate Root, sondern eine Entity die
 * ausschließlich über das parent EinsatztagebuchAggregate manipuliert wird.
 *
 * **Immutabilität (Issue #554):**
 * ETB-Eintraege sind nach Erstellung unveränderlich. Korrekturen erfolgen
 * über neue Korrektur-Eintraege mit Referenz auf den Original-Eintrag.
 * Die Methoden update() und markAsDeleted() wurden entfernt.
 *
 * **Korrektur-Pattern:**
 * - `korrigiertEintragId`: Dieser Eintrag korrigiert den referenzierten Original-Eintrag
 * - `korrigiertDurchId`: Dieser Eintrag wurde durch den referenzierten Korrektur-Eintrag ersetzt
 * - Analog zum Befehl-Pattern mit `originalBefehlId`
 *
 * **Legacy Soft-Delete:**
 * Das isDeleted Flag bleibt für Altdaten erhalten, wird aber nicht mehr gesetzt.
 */
export class EtbEintrag {
  private readonly _id: EintragId;
  private readonly _sequenceNumber: EtbSequenceNumber;
  private readonly _text: string;
  private readonly _createdBy: UserId;
  private readonly _createdAt: Date;
  private _updatedAt?: Date;
  private _isDeleted: boolean;
  private readonly _kategorie: EtbKategorie;
  private _absender?: string;
  private _empfaenger?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _korrigiertEintragId?: EintragId;
  private _korrigiertDurchId?: EintragId;

  public constructor(
    id: EintragId,
    sequenceNumber: EtbSequenceNumber,
    text: string,
    createdBy: UserId,
    createdAt?: Date,
    kategorie?: EtbKategorie,
    absender?: string,
    empfaenger?: string,
    metadata?: Record<string, unknown>,
    korrigiertEintragId?: EintragId,
    korrigiertDurchId?: EintragId,
    isDeleted?: boolean,
    updatedAt?: Date,
  ) {
    this._id = id;
    this._sequenceNumber = sequenceNumber;
    this._text = text;
    this._createdBy = createdBy;
    this._createdAt = createdAt ?? new Date();
    this._isDeleted = isDeleted ?? false;
    this._kategorie = kategorie ?? EtbKategorie.LAGE();
    this._absender = absender;
    this._empfaenger = empfaenger;
    this._metadata = metadata;
    this._korrigiertEintragId = korrigiertEintragId;
    this._korrigiertDurchId = korrigiertDurchId;
    this._updatedAt = updatedAt;
  }

  get id(): EintragId {
    return this._id;
  }

  get sequenceNumber(): EtbSequenceNumber {
    return this._sequenceNumber;
  }

  get text(): string {
    return this._text;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  get kategorie(): EtbKategorie {
    return this._kategorie;
  }

  get absender(): string | undefined {
    return this._absender;
  }

  get empfaenger(): string | undefined {
    return this._empfaenger;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  /** ID des Original-Eintrags den dieser Korrektur-Eintrag korrigiert */
  get korrigiertEintragId(): EintragId | undefined {
    return this._korrigiertEintragId;
  }

  /** ID des Korrektur-Eintrags der diesen Eintrag ersetzt */
  get korrigiertDurchId(): EintragId | undefined {
    return this._korrigiertDurchId;
  }

  /** true wenn dieser Eintrag ein Korrektur-Eintrag ist */
  get isKorrektur(): boolean {
    return !!this._korrigiertEintragId;
  }

  /** true wenn dieser Eintrag durch einen Korrektur-Eintrag ersetzt wurde */
  get isKorrigiert(): boolean {
    return !!this._korrigiertDurchId;
  }

  /**
   * Soft-Delete: Markiert diesen Eintrag als gelöscht (Streichung im ETB).
   * Der Eintrag bleibt im Audit-Trail erhalten.
   */
  public markAsDeleted(): void {
    this._isDeleted = true;
    this._updatedAt = new Date();
  }

  /**
   * Markiert diesen Eintrag als korrigiert durch einen Korrektur-Eintrag.
   * Wird vom EinsatztagebuchAggregate bei addKorrekturEintrag() aufgerufen.
   */
  public markAsKorrigiert(korrekturEintragId: EintragId): void {
    this._korrigiertDurchId = korrekturEintragId;
    this._updatedAt = new Date();
  }

  public equals(other?: EtbEintrag): boolean {
    if (other == null) return false;
    if (other === this) return true;
    return this._id.equals(other._id);
  }
}
