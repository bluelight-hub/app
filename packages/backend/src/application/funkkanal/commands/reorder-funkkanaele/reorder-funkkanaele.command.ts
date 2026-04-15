import { Result } from '@domain/common/result';

/**
 * Eintrag in der neuen Reihenfolge: Kanal-ID + Ziel-sortIndex.
 */
export interface ReorderFunkkanaeleEntryInput {
  readonly kanalId: string;
  readonly sortIndex: number;
}

export interface ReorderFunkkanaeleCommandProps {
  readonly einsatzId: string;
  readonly ordering: ReadonlyArray<ReorderFunkkanaeleEntryInput>;
  readonly userId: string;
}

/**
 * Command zum Neu-Anordnen aller Funkkanäle eines Einsatzes in einem Schritt.
 *
 * Der komplette neue Sort-Order wird als Liste übergeben. Ein
 * `FunkkanalReihenfolgeGeaendertEvent` wird pro Reorder-Vorgang emittiert
 * (cross-aggregate, aggregateId = einsatzId).
 */
export class ReorderFunkkanaeleCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly ordering: ReadonlyArray<ReorderFunkkanaeleEntryInput>,
    public readonly userId: string,
  ) {}

  static create(props: ReorderFunkkanaeleCommandProps): Result<ReorderFunkkanaeleCommand> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<ReorderFunkkanaeleCommand>('einsatzId ist erforderlich');
    }
    if (!props.ordering || props.ordering.length === 0) {
      return Result.fail<ReorderFunkkanaeleCommand>('ordering darf nicht leer sein');
    }

    const normalized: ReorderFunkkanaeleEntryInput[] = [];
    const seenIds = new Set<string>();
    const seenIndices = new Set<number>();
    for (const entry of props.ordering) {
      const kanalId = entry.kanalId?.trim();
      if (!kanalId) {
        return Result.fail<ReorderFunkkanaeleCommand>('ordering.kanalId ist erforderlich');
      }
      if (seenIds.has(kanalId)) {
        return Result.fail<ReorderFunkkanaeleCommand>(`ordering enthält Kanal ${kanalId} doppelt`);
      }
      if (!Number.isInteger(entry.sortIndex) || entry.sortIndex < 0) {
        return Result.fail<ReorderFunkkanaeleCommand>('ordering.sortIndex muss ein nicht-negativer Integer sein');
      }
      if (seenIndices.has(entry.sortIndex)) {
        return Result.fail<ReorderFunkkanaeleCommand>(`ordering enthält sortIndex ${entry.sortIndex} doppelt`);
      }
      seenIds.add(kanalId);
      seenIndices.add(entry.sortIndex);
      normalized.push({ kanalId, sortIndex: entry.sortIndex });
    }

    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<ReorderFunkkanaeleCommand>('userId ist erforderlich');
    }

    return Result.ok(new ReorderFunkkanaeleCommand(einsatzId, normalized, userId));
  }
}
