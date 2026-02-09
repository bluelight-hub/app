import type { Notiz } from '@domain/notiz/entities/notiz.entity';
import type { NotizId } from '@domain/notiz/value-objects/notiz-id';

/**
 * Repository Interface fuer Notizen.
 * Definiert den Vertrag fuer die Persistence-Schicht.
 */
export interface INotizRepository {
  /** Speichert eine neue Notiz */
  save(notiz: Notiz, tx?: unknown): Promise<void>;

  /** Findet eine Notiz per ID */
  findById(id: NotizId, tx?: unknown): Promise<Notiz | null>;

  /** Gibt alle sichtbaren Notizen eines Einsatzes zurueck (eigene + team-sichtbare anderer) */
  findByEinsatzId(einsatzId: string, userId: string, tx?: unknown): Promise<Notiz[]>;
}
