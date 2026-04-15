import { Result } from '@domain/common/result';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';

/**
 * Eingabeform der Kanal-Details am Command-API-Rand.
 *
 * Das Value Object wird im Handler erzeugt, damit das Command
 * serialisierbar (POJO) bleibt.
 */
export type CreateFunkkanalCommandDetails =
  | { type: 'tmo'; sprechgruppe: string; gssi?: string }
  | { type: 'dmo'; dmoKanal: string; repeater?: string }
  | { type: 'analog'; band: '4m' | '2m'; frequenz: string; kanalnummer?: string };

export interface CreateFunkkanalCommandProps {
  readonly einsatzId: string;
  readonly name: string;
  readonly details: CreateFunkkanalCommandDetails;
  readonly sortIndex?: number;
  readonly zweck?: string;
  readonly userId: string;
}

/**
 * Command zum Anlegen eines neuen Funkkanals für einen Einsatz.
 *
 * Validiert nur Trivial-Invarianten am API-Rand (Pflichtfelder, Trimming).
 * Fachliche Invarianten (Namens-Eindeutigkeit, Details-Validität) werden im
 * Handler bzw. Aggregat geprüft.
 */
export class CreateFunkkanalCommand {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_ZWECK_LENGTH = 500;

  private constructor(
    public readonly einsatzId: string,
    public readonly name: string,
    public readonly details: CreateFunkkanalCommandDetails,
    public readonly sortIndex: number | undefined,
    public readonly zweck: string | undefined,
    public readonly userId: string,
  ) {}

  static create(props: CreateFunkkanalCommandProps): Result<CreateFunkkanalCommand> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<CreateFunkkanalCommand>('einsatzId ist erforderlich');
    }
    const name = props.name?.trim();
    if (!name) {
      return Result.fail<CreateFunkkanalCommand>('Kanalname ist erforderlich');
    }
    if (name.length > CreateFunkkanalCommand.MAX_NAME_LENGTH) {
      return Result.fail<CreateFunkkanalCommand>('Kanalname darf maximal 100 Zeichen lang sein');
    }
    if (!props.details || typeof props.details !== 'object') {
      return Result.fail<CreateFunkkanalCommand>('details sind erforderlich');
    }
    if (props.sortIndex !== undefined && (!Number.isInteger(props.sortIndex) || props.sortIndex < 0)) {
      return Result.fail<CreateFunkkanalCommand>('sortIndex muss ein nicht-negativer Integer sein');
    }
    const zweck = props.zweck?.trim() || undefined;
    if (zweck && zweck.length > CreateFunkkanalCommand.MAX_ZWECK_LENGTH) {
      return Result.fail<CreateFunkkanalCommand>('zweck darf maximal 500 Zeichen lang sein');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<CreateFunkkanalCommand>('userId ist erforderlich');
    }

    return Result.ok(new CreateFunkkanalCommand(einsatzId, name, props.details, props.sortIndex, zweck, userId));
  }
}
