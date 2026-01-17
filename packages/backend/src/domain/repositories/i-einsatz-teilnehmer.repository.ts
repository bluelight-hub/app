import type { TransactionContext } from '@domain/common/transaction';

/**
 * EinsatzTeilnehmer DTO für Repository-Operationen.
 *
 * Repräsentiert einen User der einem Einsatz beigetreten ist mit seinem
 * gewählten Funkrufnamen. Diese Daten werden für ETB-Absender Auto-Fill verwendet.
 */
export interface EinsatzTeilnehmerDto {
  /** Eindeutige ID des Teilnehmer-Eintrags */
  id: string;
  /** Einsatz-ID */
  einsatzId: string;
  /** User-ID */
  userId: string;
  /** Gewählter Funkrufname für diesen Einsatz */
  funkrufname: string;
  /** Beitrittszeitpunkt */
  joinedAt: Date;
  /** Austrittszeitpunkt (null wenn noch aktiv) */
  leftAt: Date | null;
}

/**
 * Repository Interface für EinsatzTeilnehmer (Port nach Hexagonaler Architektur).
 *
 * Dieses Interface definiert den Vertrag für EinsatzTeilnehmer-Persistierung.
 * Es wird verwendet um:
 * - User einem Einsatz mit Funkrufname beizutreten
 * - Den Funkrufname eines Users für einen Einsatz abzufragen (ETB-Absender Auto-Fill)
 * - Alle aktiven Teilnehmer eines Einsatzes zu laden
 *
 * **Hexagonale Architektur:**
 * - PORT: Dieses Interface (Domain Layer)
 * - ADAPTER: PrismaEinsatzTeilnehmerRepository (Infrastructure Layer)
 */
export interface IEinsatzTeilnehmerRepository {
  /**
   * Findet den aktiven Teilnehmer-Eintrag für einen User in einem Einsatz.
   *
   * @param einsatzId - ID des Einsatzes
   * @param userId - ID des Users
   * @param tx - Optional: Transaction Context
   * @returns EinsatzTeilnehmerDto oder null wenn nicht gefunden/bereits verlassen
   */
  findByEinsatzAndUser(einsatzId: string, userId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null>;

  /**
   * Findet alle aktiven Teilnehmer eines Einsatzes.
   *
   * @param einsatzId - ID des Einsatzes
   * @param tx - Optional: Transaction Context
   * @returns Array von EinsatzTeilnehmerDto (nur aktive, leftAt === null)
   */
  findActiveByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto[]>;

  /**
   * Speichert einen neuen Teilnehmer-Eintrag (User tritt Einsatz bei).
   *
   * @param teilnehmer - Teilnehmer-Daten ohne ID (wird generiert)
   * @param tx - Optional: Transaction Context
   * @returns Erstellter EinsatzTeilnehmerDto mit generierter ID
   */
  create(
    teilnehmer: {
      einsatzId: string;
      userId: string;
      funkrufname: string;
    },
    tx?: TransactionContext,
  ): Promise<EinsatzTeilnehmerDto>;

  /**
   * Aktualisiert den Funkrufnamen eines aktiven Teilnehmers.
   *
   * @param einsatzId - ID des Einsatzes
   * @param userId - ID des Users
   * @param funkrufname - Neuer Funkrufname
   * @param tx - Optional: Transaction Context
   * @returns Aktualisierter EinsatzTeilnehmerDto oder null wenn nicht gefunden
   */
  updateFunkrufname(einsatzId: string, userId: string, funkrufname: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null>;

  /**
   * Markiert einen Teilnehmer als verlassen (Soft-Leave).
   *
   * @param einsatzId - ID des Einsatzes
   * @param userId - ID des Users
   * @param tx - Optional: Transaction Context
   * @returns true wenn erfolgreich, false wenn nicht gefunden
   */
  leave(einsatzId: string, userId: string, tx?: TransactionContext): Promise<boolean>;
}
