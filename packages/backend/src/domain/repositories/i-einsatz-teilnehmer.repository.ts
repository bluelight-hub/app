import type { TransactionContext } from '@domain/common/transaction';

/**
 * EinsatzTeilnehmer DTO für Repository-Operationen.
 *
 * Repräsentiert einen User der einem Einsatz beigetreten ist und mit einer
 * EinsatzPerson verknüpft wurde. Person-Daten werden für ETB-Absender Auto-Fill verwendet.
 */
export interface EinsatzTeilnehmerDto {
  /** Eindeutige ID des Teilnehmer-Eintrags */
  id: string;
  /** Einsatz-ID */
  einsatzId: string;
  /** User-ID */
  userId: string;
  /** Verknüpfte EinsatzPerson-ID */
  einsatzPersonId: string;
  /** Vorname der verknüpften Person */
  personVorname: string;
  /** Nachname der verknüpften Person */
  personNachname: string;
  /** Funkrufname der verknüpften Person (optional) */
  personFunkrufname: string | null;
  /** Funktion der verknüpften Person */
  personFunktion: string;
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
 * - User einem Einsatz mit einer EinsatzPerson zu verknüpfen
 * - Die Person-Daten eines Users für einen Einsatz abzufragen (ETB-Absender Auto-Fill)
 * - Alle aktiven Teilnehmer eines Einsatzes zu laden
 *
 * **Hexagonale Architektur:**
 * - PORT: Dieses Interface (Domain Layer)
 * - ADAPTER: PrismaEinsatzTeilnehmerRepository (Infrastructure Layer)
 */
export interface IEinsatzTeilnehmerRepository {
  /**
   * Findet den aktiven Teilnehmer-Eintrag für einen User in einem Einsatz.
   */
  findByEinsatzAndUser(einsatzId: string, userId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null>;

  /**
   * Findet alle aktiven Teilnehmer eines Einsatzes.
   */
  findActiveByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto[]>;

  /**
   * Prüft ob eine EinsatzPerson bereits von einem Bearbeiter verknüpft ist.
   */
  isPersonAlreadyLinked(einsatzId: string, einsatzPersonId: string, excludeUserId?: string, tx?: TransactionContext): Promise<boolean>;

  /**
   * Speichert einen neuen Teilnehmer-Eintrag (User tritt Einsatz bei).
   */
  create(
    teilnehmer: {
      einsatzId: string;
      userId: string;
      einsatzPersonId: string;
    },
    tx?: TransactionContext,
  ): Promise<EinsatzTeilnehmerDto>;

  /**
   * Aktualisiert die verknüpfte EinsatzPerson eines aktiven Teilnehmers.
   */
  updateEinsatzPerson(einsatzId: string, userId: string, einsatzPersonId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null>;

  /**
   * Markiert einen Teilnehmer als verlassen (Soft-Leave).
   */
  leave(einsatzId: string, userId: string, tx?: TransactionContext): Promise<boolean>;
}
