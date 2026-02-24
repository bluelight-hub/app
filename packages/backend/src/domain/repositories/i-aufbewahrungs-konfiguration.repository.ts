import type { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import type { Result } from '@domain/common/result';

/**
 * Repository Port Interface für AufbewahrungsKonfiguration Persistence.
 *
 * Singleton-Pattern: Es gibt genau eine Konfiguration im System.
 * get() gibt Default-Werte zurück wenn noch keine Konfiguration existiert.
 *
 * @remarks Story 5.5 AC1
 */
export interface IAufbewahrungsKonfigurationRepository {
  /**
   * Gibt die aktuelle AufbewahrungsKonfiguration zurück.
   * Falls keine existiert, wird die Default-Konfiguration zurückgegeben.
   */
  get(): Promise<Result<AufbewahrungsKonfiguration>>;

  /**
   * Speichert die AufbewahrungsKonfiguration (Upsert-Semantik).
   * Es gibt immer nur eine Konfiguration (Singleton).
   */
  save(config: AufbewahrungsKonfiguration, updatedBy: string): Promise<Result<void>>;
}
