import type { TransactionContext } from '@domain/common';
import type { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import type { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import type { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';

/**
 * Repository Interface fuer Fuehrungsrhythmus-Templates.
 * Definiert den Vertrag fuer die Persistence-Schicht.
 */
export interface IFuehrungsrhythmusTemplateRepository {
  /** Speichert ein neues oder aktualisiertes Fuehrungsrhythmus-Template */
  save(template: FuehrungsrhythmusTemplate, tx?: TransactionContext): Promise<void>;

  /** Findet ein Fuehrungsrhythmus-Template per ID */
  findById(id: FuehrungsrhythmusTemplateId, tx?: TransactionContext): Promise<FuehrungsrhythmusTemplate | null>;

  /** Gibt alle nicht-geloeschten Fuehrungsrhythmus-Templates zurueck */
  findAll(filter?: { scope?: FuehrungsrhythmusTemplateScope; einsatzId?: EinsatzId; includeGlobal?: boolean }): Promise<FuehrungsrhythmusTemplate[]>;

  /** Prueft ob ein Fuehrungsrhythmus-Template existiert */
  exists(id: FuehrungsrhythmusTemplateId): Promise<boolean>;
}
