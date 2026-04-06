import type { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';

/**
 * Repository Interface für Gefahrenmatrix-Bewertungen.
 */
export interface IGefahrenmatrixRepository {
  /** Speichert oder aktualisiert eine Bewertung (upsert auf einsatzId+gefahrentyp+schutzobjekt) */
  save(bewertung: GefahrenmatrixBewertung, tx?: unknown): Promise<void>;

  /** Lädt alle Bewertungen eines Einsatzes */
  findByEinsatzId(einsatzId: string, tx?: unknown): Promise<GefahrenmatrixBewertung[]>;

  /** Löscht eine Bewertung (wenn Warnstufe auf KEINE zurückgesetzt wird) */
  deleteByKey(einsatzId: string, gefahrentyp: string, schutzobjekt: string, tx?: unknown): Promise<void>;
}
