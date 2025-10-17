import { registerDecorator, type ValidationOptions, ValidatorConstraint, type ValidatorConstraintInterface, type ValidationArguments } from 'class-validator';

/**
 * Interface für Objekte mit Koordinaten oder Adresse
 */
interface CoordinatesOrAddressObject {
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Custom Validator: Prüft ob entweder `adresse` ODER (`latitude` + `longitude`) vorhanden sind
 *
 * **Warum notwendig:**
 * - Geocoding erfordert entweder eine Adresse ODER manuelle Koordinaten
 * - Ohne diese Validierung würde die Service-Schicht erst zur Laufzeit fehlschlagen
 * - Verhindert DB-Constraint-Violations (latitude/longitude sind NOT NULL)
 *
 * **Verwendung:**
 * ```typescript
 * @IsCoordinatesOrAddress({ message: 'Either address or coordinates required' })
 * class CreatePoiDto { ... }
 * ```
 */
@ValidatorConstraint({ name: 'isCoordinatesOrAddress', async: false })
export class IsCoordinatesOrAddressConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as CoordinatesOrAddressObject;
    const hasAddress = object.adresse !== undefined && object.adresse !== null && object.adresse.trim() !== '';
    const hasCoordinates = object.latitude !== undefined && object.latitude !== null && object.longitude !== undefined && object.longitude !== null;

    // Mindestens eine Option muss vorhanden sein
    return hasAddress || hasCoordinates;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Either adresse (for geocoding) or latitude+longitude (manual coordinates) must be provided';
  }
}

/**
 * Decorator: Validiert dass entweder `adresse` ODER (`latitude` + `longitude`) gesetzt sind
 *
 * @param validationOptions - Optional: Custom Validierungsoptionen
 */
export function IsCoordinatesOrAddress(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCoordinatesOrAddressConstraint,
    });
  };
}
