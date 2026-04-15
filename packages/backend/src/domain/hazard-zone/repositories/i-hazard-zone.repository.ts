import type { HazardZone } from '@domain/hazard-zone/entities/hazard-zone.entity';

/**
 * Repository Interface für HazardZones (Issue #627).
 */
export interface IHazardZoneRepository {
  /** Speichert oder aktualisiert eine Zone (upsert nach id). */
  save(zone: HazardZone, tx?: unknown): Promise<void>;

  /** Lädt alle Zonen eines Einsatzes. */
  findByEinsatzId(einsatzId: string, tx?: unknown): Promise<HazardZone[]>;

  /** Lädt eine Zone per id. */
  findById(id: string, tx?: unknown): Promise<HazardZone | null>;

  /** Löscht eine Zone per id. */
  deleteById(id: string, tx?: unknown): Promise<void>;
}
