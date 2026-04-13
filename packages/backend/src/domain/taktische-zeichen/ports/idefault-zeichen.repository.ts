import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ZeichenDefinition } from '../value-objects/zeichen-definition.vo';

/**
 * Eintrag eines Default-Zeichens (Fahrzeugtyp oder Einheitentyp).
 * Wird als Rückgabe-Typ für Queries verwendet.
 */
export interface DefaultZeichenEntry {
  /** ID des Fahrzeugtyps (FK) oder CUID des EinheitentypZeichenDefault-Eintrags */
  referenzId: string;
  /** Fahrzeugtyp-Code oder EinsatzEinheitTyp Enum-Wert */
  typBezeichnung: string;
  /** Validierte Zeichen-Definition */
  zeichenDefinition: ZeichenDefinition;
}

/**
 * Repository Port Interface für Default-Zeichen-Konfiguration.
 *
 * Definiert die Abstraktion für das Lesen und Schreiben von
 * Standard-Zeichen-Zuordnungen pro Fahrzeug- und Einheitentyp.
 *
 * **Design Constraints:**
 * - KEINE Prisma Types in Signaturen
 * - Result<T> Pattern für explizite Fehlerbehandlung
 * - Alle Methoden async (I/O-Grenze)
 * - TransactionContext für atomare Schreiboperationen
 */
export interface IDefaultZeichenRepository {
  /**
   * Lädt alle Default-Zeichen für Fahrzeugtypen.
   * Sortiert nach Fahrzeugtyp-Code aufsteigend.
   */
  findAllFahrzeugtypen(): Promise<Result<DefaultZeichenEntry[]>>;

  /**
   * Lädt alle Default-Zeichen für Einheitentypen.
   * Sortiert nach Einheitentyp-Enum aufsteigend.
   */
  findAllEinheitentypen(): Promise<Result<DefaultZeichenEntry[]>>;

  /**
   * Setzt oder aktualisiert das Default-Zeichen für einen Fahrzeugtyp.
   * Upsert-Semantik: Erstellt den Eintrag wenn keiner existiert, aktualisiert sonst.
   *
   * @param fahrzeugtypId - ID des Fahrzeugtyps (FK)
   * @param definition - Validierte Zeichen-Definition
   * @param tx - Transaction Context für atomare Operationen
   */
  saveFahrzeugtypDefault(fahrzeugtypId: string, definition: ZeichenDefinition, tx?: TransactionContext): Promise<Result<DefaultZeichenEntry>>;

  /**
   * Setzt oder aktualisiert das Default-Zeichen für einen Einheitentyp.
   * Upsert-Semantik: Erstellt den Eintrag wenn keiner existiert, aktualisiert sonst.
   *
   * @param einheitentyp - EinsatzEinheitTyp Enum-Wert (z.B. 'TRUPP', 'STAFFEL')
   * @param definition - Validierte Zeichen-Definition
   * @param tx - Transaction Context für atomare Operationen
   */
  saveEinheitentypDefault(einheitentyp: string, definition: ZeichenDefinition, tx?: TransactionContext): Promise<Result<DefaultZeichenEntry>>;
}
