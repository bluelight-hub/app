import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { GefaehrdungItem } from '../value-objects/gefaehrdung-item.vo';

/**
 * Read-Model der Vorlagen — der Query-Handler liefert genau dieses Shape an
 * die Application-DTO-Factory.
 */
export interface GefaehrdungsbeurteilungVorlageReadModel {
  id: string;
  slug: string;
  name: string;
  szenario: string;
  items: GefaehrdungItem[];
  version: number;
  aktiv: boolean;
  erstelltAm: Date;
}

/**
 * Port für die Vorlagen-Tabelle. Vorlagen sind Read-Only für das Modul;
 * geseedet von `prisma/seed.ts`. Es gibt daher keine Save-Methode.
 */
export interface IGefaehrdungsbeurteilungVorlageRepository {
  /**
   * Liefert alle aktiven Vorlagen, geordnet nach `name`. Wird von der
   * `GET …/gefaehrdungsbeurteilungs-vorlagen`-Query genutzt.
   */
  findAktive(tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungVorlageReadModel[]>>;

  /**
   * Lädt eine Vorlage per ID; liefert `Result.ok(null)`, wenn keine existiert.
   * Wird im Create-Handler für den Deep-Copy der `items` aufgerufen.
   */
  findById(id: string, tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungVorlageReadModel | null>>;
}
