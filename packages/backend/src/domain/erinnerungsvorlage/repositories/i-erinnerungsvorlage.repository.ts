import type { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import type { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';

/**
 * Repository Interface fuer Erinnerungsvorlagen.
 * Definiert den Vertrag fuer die Persistence-Schicht.
 */
export interface IErinnerungsvorlageRepository {
  /** Speichert eine neue Erinnerungsvorlage */
  save(vorlage: Erinnerungsvorlage): Promise<void>;

  /** Findet eine Erinnerungsvorlage per ID */
  findById(id: ErinnerungsvorlageId): Promise<Erinnerungsvorlage | null>;

  /** Gibt alle nicht-gelöschten Erinnerungsvorlagen zurück */
  findAll(): Promise<Erinnerungsvorlage[]>;

  /** Prueft ob eine Erinnerungsvorlage existiert */
  exists(id: ErinnerungsvorlageId): Promise<boolean>;
}
