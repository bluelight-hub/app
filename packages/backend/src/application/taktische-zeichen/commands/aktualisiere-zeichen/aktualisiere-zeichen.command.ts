import { Result } from '@domain/common/result';
import type { ZeichenDefinitionProps } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

/**
 * Props für AktualisiereZeichenCommand.
 */
export interface AktualisiereZeichenCommandProps {
  einsatzId: string;
  zeichenId: string;
  zeichenDefinition?: ZeichenDefinitionProps;
  label?: string;
  notiz?: string;
  aktualisiertVon: string;
}

/**
 * Command zum Aktualisieren eines taktischen Zeichens (Definition, Label, Notiz).
 */
export class AktualisiereZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenId: string,
    public readonly aktualisiertVon: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps | undefined,
    public readonly label: string | undefined,
    public readonly notiz: string | undefined,
  ) {}

  static create(props: AktualisiereZeichenCommandProps): Result<AktualisiereZeichenCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<AktualisiereZeichenCommand>('EINSATZ_ID_REQUIRED');
    }

    const trimmedZeichenId = props.zeichenId?.trim() ?? '';
    if (trimmedZeichenId.length === 0) {
      return Result.fail<AktualisiereZeichenCommand>('ZEICHEN_ID_REQUIRED');
    }

    const trimmedAktualisiertVon = props.aktualisiertVon?.trim() ?? '';
    if (trimmedAktualisiertVon.length === 0) {
      return Result.fail<AktualisiereZeichenCommand>('AKTUALISIERT_VON_REQUIRED');
    }

    if (props.zeichenDefinition !== undefined && (!props.zeichenDefinition.grundzeichen || props.zeichenDefinition.grundzeichen.trim() === '')) {
      return Result.fail<AktualisiereZeichenCommand>('GRUNDZEICHEN_REQUIRED');
    }

    return Result.ok(new AktualisiereZeichenCommand(trimmedEinsatzId, trimmedZeichenId, trimmedAktualisiertVon, props.zeichenDefinition, props.label, props.notiz));
  }
}
