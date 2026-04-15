import { registerDecorator, type ValidationArguments, type ValidationOptions, ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';

interface KraftRefObject {
  fahrzeugId?: string | null;
  personId?: string | null;
  einheitId?: string | null;
}

/**
 * Prüft, dass genau EINE der drei Kraft-IDs (`fahrzeugId`, `personId`, `einheitId`)
 * gesetzt ist — spiegelt den DB-Check-Constraint `funkkanal_zuordnung_genau_eine_kraft`.
 */
@ValidatorConstraint({ name: 'hasExactlyOneKraftReference', async: false })
export class HasExactlyOneKraftReferenceConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as KraftRefObject;
    const count = [obj.fahrzeugId, obj.personId, obj.einheitId].filter((id) => typeof id === 'string' && id.trim().length > 0).length;
    return count === 1;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Genau eine der Kraft-IDs (fahrzeugId, personId, einheitId) muss gesetzt sein';
  }
}

/**
 * Decorator für XOR-Validierung der Kraft-Referenzen am Zuordnungs-DTO.
 */
export function HasExactlyOneKraftReference(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasExactlyOneKraftReferenceConstraint,
    });
  };
}
