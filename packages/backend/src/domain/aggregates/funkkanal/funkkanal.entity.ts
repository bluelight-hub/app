import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';

/**
 * Lifecycle-Status eines Funkkanals.
 * - `aktiv`       — Kanal wird genutzt, erscheint im Funkplan
 * - `inaktiv`     — temporär deaktiviert, bleibt aber im Plan sichtbar (Badge)
 * - `archiviert`  — historisch, standardmäßig ausgeblendet (Filter-Option)
 */
export type FunkkanalStatus = 'aktiv' | 'inaktiv' | 'archiviert';

export const FUNKKANAL_STATUS_VALUES: readonly FunkkanalStatus[] = ['aktiv', 'inaktiv', 'archiviert'];

/**
 * Root-Entity des Funkkanal-Aggregats.
 *
 * Trägt Stammdaten (Name, Details, Zweck, Status, Sortierung) und wird vom
 * Aggregat `FunkkanalAggregate` verwaltet. Zuordnungen sind Child-Entities
 * (FunkkanalZuordnung), nicht Teil dieser Klasse.
 */
export class Funkkanal {
  constructor(
    public readonly id: FunkkanalId,
    public readonly einsatzId: EinsatzId,
    public name: string,
    public details: KanalDetailsShape,
    public status: FunkkanalStatus,
    public zweck: string | undefined,
    public sortIndex: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy?: string,
    public updatedBy?: string,
  ) {}
}
