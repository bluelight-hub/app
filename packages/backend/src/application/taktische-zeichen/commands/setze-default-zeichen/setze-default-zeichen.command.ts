import { Result } from '@domain/common/result';
import type { ZeichenDefinitionProps } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

/**
 * Typ der Ziel-Entität für das Default-Zeichen.
 */
export type DefaultZeichenEntityTyp = 'fahrzeugtyp' | 'einheitentyp';

/**
 * Command zum Setzen eines Default-Zeichens für einen Fahrzeug- oder Einheitentyp.
 */
export class SetzeDefaultZeichenCommand {
  private constructor(
    public readonly entityTyp: DefaultZeichenEntityTyp,
    public readonly referenzId: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps,
  ) {}

  /**
   * Factory mit Validierung.
   *
   * @param props.entityTyp - 'fahrzeugtyp' oder 'einheitentyp'
   * @param props.referenzId - fahrzeugtypId (FK) oder EinsatzEinheitTyp Enum-Wert
   * @param props.zeichenDefinition - Rohe Zeichendefinition (wird im Handler via VO validiert)
   */
  static create(props: { entityTyp: DefaultZeichenEntityTyp; referenzId: string; zeichenDefinition: ZeichenDefinitionProps }): Result<SetzeDefaultZeichenCommand> {
    if (!props.referenzId || props.referenzId.trim() === '') {
      return Result.fail('REFERENZ_ID_REQUIRED');
    }

    if (!props.zeichenDefinition?.grundzeichen) {
      return Result.fail('GRUNDZEICHEN_REQUIRED');
    }

    return Result.ok(new SetzeDefaultZeichenCommand(props.entityTyp, props.referenzId.trim(), props.zeichenDefinition));
  }
}
