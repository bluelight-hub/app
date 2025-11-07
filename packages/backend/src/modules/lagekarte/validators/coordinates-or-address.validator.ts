import { registerDecorator, type ValidationOptions, ValidatorConstraint, type ValidatorConstraintInterface, type ValidationArguments } from 'class-validator';

/**
 * Interface für Objekte mit Koordinaten, MGRS oder Adresse
 */
interface CoordinatesOrAddressObject {
  mgrs?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Custom Validator: Prüft ob entweder `mgrs` ODER `adresse` ODER (`latitude` + `longitude`) vorhanden sind
 *
 * **Warum notwendig:**
 * - POI-Erstellung erfordert Koordinaten in einem der drei Formate
 * - MGRS ist das primäre Format (militärischer Standard)
 * - Lat/Lng dient als Fallback für Systeme ohne MGRS-Support
 * - Adresse ermöglicht automatisches Geocoding
 * - Ohne diese Validierung würde die Service-Schicht erst zur Laufzeit fehlschlagen
 * - Verhindert DB-Constraint-Violations (latitude/longitude sind NOT NULL)
 *
 * **Prioritäten-Hierarchie:**
 * 1. MGRS (primär) → Lat/Lng wird automatisch berechnet
 * 2. Lat/Lng (Fallback) → Direkte Speicherung
 * 3. Adresse (Geocoding) → Lat/Lng wird aus Geocoding-Service ermittelt
 *
 * **Verwendung:**
 * ```typescript
 * @IsCoordinatesOrAddress({ message: 'Either mgrs, coordinates or address required' })
 * class CreatePoiDto { ... }
 * ```
 */
@ValidatorConstraint({ name: 'isCoordinatesOrAddress', async: false })
export class IsCoordinatesOrAddressConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as CoordinatesOrAddressObject;
    const hasMgrs = object.mgrs !== undefined && object.mgrs !== null && object.mgrs.trim() !== '';
    const hasAddress = object.adresse !== undefined && object.adresse !== null && object.adresse.trim() !== '';
    const hasCoordinates = object.latitude !== undefined && object.latitude !== null && object.longitude !== undefined && object.longitude !== null;

    // Mindestens eine der drei Optionen muss vorhanden sein
    return hasMgrs || hasAddress || hasCoordinates;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Entweder mgrs (MGRS-Koordinaten), oder latitude+longitude (manuelle Koordinaten), oder adresse (für Geocoding) muss angegeben sein';
  }
}

/**
 * Decorator: Validiert dass entweder `mgrs` ODER `adresse` ODER (`latitude` + `longitude`) gesetzt sind
 *
 * **MGRS-Priorität:**
 * - Wenn MGRS gesetzt ist, ist die Validierung erfüllt (Lat/Lng werden automatisch berechnet)
 * - Wenn nur Lat/Lng gesetzt sind, ist die Validierung erfüllt
 * - Wenn nur Adresse gesetzt ist, ist die Validierung erfüllt (Geocoding erfolgt in Service-Schicht)
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
