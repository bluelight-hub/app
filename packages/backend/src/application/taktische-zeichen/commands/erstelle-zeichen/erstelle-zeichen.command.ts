import { Result } from '@domain/common/result';
import type { ZeichenDefinitionProps } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

/**
 * Props für ErstelleZeichenCommand.
 */
export interface ErstelleZeichenCommandProps {
  einsatzId: string;
  zeichenDefinition: ZeichenDefinitionProps;
  referenzTyp?: string;
  referenzId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog?: boolean;
  katalogEintragId?: string;
  erstelltVon: string;
}

/**
 * Command zum Erstellen eines neuen taktischen Zeichens.
 */
export class ErstelleZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps,
    public readonly erstelltVon: string,
    public readonly istAusKatalog: boolean,
    public readonly referenzTyp: string | undefined,
    public readonly referenzId: string | undefined,
    public readonly label: string | undefined,
    public readonly notiz: string | undefined,
    public readonly katalogEintragId: string | undefined,
  ) {}

  static create(props: ErstelleZeichenCommandProps): Result<ErstelleZeichenCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<ErstelleZeichenCommand>('EINSATZ_ID_REQUIRED');
    }

    const trimmedErstelltVon = props.erstelltVon?.trim() ?? '';
    if (trimmedErstelltVon.length === 0) {
      return Result.fail<ErstelleZeichenCommand>('ERSTELLT_VON_REQUIRED');
    }

    if (!props.zeichenDefinition?.grundzeichen || props.zeichenDefinition.grundzeichen.trim() === '') {
      return Result.fail<ErstelleZeichenCommand>('GRUNDZEICHEN_REQUIRED');
    }

    return Result.ok(
      new ErstelleZeichenCommand(
        trimmedEinsatzId,
        props.zeichenDefinition,
        trimmedErstelltVon,
        props.istAusKatalog ?? false,
        props.referenzTyp?.trim() || undefined,
        props.referenzId?.trim() || undefined,
        props.label?.trim() || undefined,
        props.notiz?.trim() || undefined,
        props.katalogEintragId?.trim() || undefined,
      ),
    );
  }
}
