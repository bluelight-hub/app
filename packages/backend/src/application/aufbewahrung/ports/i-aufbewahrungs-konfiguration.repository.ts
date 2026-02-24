import type { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';

/**
 * Repository Port Interface fuer AufbewahrungsKonfiguration Persistence.
 *
 * Definiert die Abstraktion zwischen Application Layer und Infrastructure Layer.
 * Implementierung erfolgt im Infrastructure Layer via Prisma Repository Adapter.
 *
 * @remarks Story 5.5 AC1
 */
export interface IAufbewahrungsKonfigurationRepository {
  /**
   * Gibt die aktuelle Aufbewahrungskonfiguration zurueck.
   * Gibt null zurueck wenn keine konfiguriert (Default wird im Handler erstellt).
   */
  find(tx?: TransactionContext): Promise<Result<AufbewahrungsKonfiguration | null>>;

  /**
   * Speichert oder aktualisiert die Aufbewahrungskonfiguration (Upsert).
   */
  save(konfiguration: AufbewahrungsKonfiguration, tx?: TransactionContext): Promise<Result<void>>;
}
