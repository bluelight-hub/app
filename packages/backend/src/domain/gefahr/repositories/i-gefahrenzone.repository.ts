import type { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import type { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';

/**
 * Ergebnis einer Zonen-Query mit angereichertem Matrix-Join.
 *
 * `warnstufe` wird aus der zugehörigen Matrix-Zelle gezogen und ist `null`, wenn
 * noch keine Bewertung existiert (Quick-Draw-Flow — Zone „unbewertet"). Das ist
 * bewusst denormalisiert für den initialen Map-Render — für Live-Sync liest das
 * Frontend die Warnstufe aus der Matrix-Query (siehe ADR-010).
 */
export interface GefahrenzoneWithWarnstufe {
  zone: Gefahrenzone;
  warnstufe: Warnstufe | null;
}

/**
 * Repository Interface für Gefahrenzonen.
 */
export interface IGefahrenzoneRepository {
  /** Speichert oder aktualisiert eine Zone (Upsert auf primärer ID). */
  save(zone: Gefahrenzone, tx?: unknown): Promise<void>;

  /** Lädt eine Zone anhand ihrer ID (inkl. Einsatz-Scope-Filter für Mandanten-Trennung). */
  findById(einsatzId: string, zoneId: string, tx?: unknown): Promise<Gefahrenzone | null>;

  /** Listet alle Zonen eines Einsatzes mit aktueller Matrix-Warnstufe. */
  findByEinsatzIdWithWarnstufe(einsatzId: string, tx?: unknown): Promise<GefahrenzoneWithWarnstufe[]>;

  /** Löscht eine Zone; erwartet, dass die Zone existiert. */
  delete(einsatzId: string, zoneId: string, tx?: unknown): Promise<void>;
}
