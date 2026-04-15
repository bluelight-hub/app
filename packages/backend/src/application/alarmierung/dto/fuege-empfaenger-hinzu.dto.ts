import { ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { AlarmierungEmpfaengerEinheitDto, AlarmierungEmpfaengerFahrzeugDto, AlarmierungEmpfaengerPersonDto } from './alarmierung-empfaenger.dto';

/**
 * Request-Body zum nachträglichen Hinzufügen eines einzelnen Empfängers.
 *
 * Strukturell identisch zu einem einzelnen Element der `empfaenger`-Liste in
 * {@link CreateAlarmierungDto} — wir verwenden dieselben Sub-DTO-Klassen
 * ({@link AlarmierungEmpfaengerFahrzeugDto}, …Person…, …Einheit…), damit
 * Diskriminator + OpenAPI-Schema konsistent zur Listen-Variante sind.
 *
 * **Validierung:** Die Sub-DTO-Klassen tragen keine `class-validator`-
 * Decorators (siehe Header-Kommentar in `alarmierung-empfaenger.dto.ts`).
 * Pflichtfelder + XOR + Diskriminator werden vom
 * `FuegeEmpfaengerHinzuCommand` und vom Aggregat validiert.
 *
 * **Controller-Verwendung:**
 * ```typescript
 * @Post(':alarmierungId/empfaenger')
 * @ApiBody({ schema: FUEGE_EMPFAENGER_HINZU_BODY_SCHEMA })
 * @ApiAlarmierungEmpfaengerExtraModels()
 * fuegeHinzu(@Body() body: FuegeEmpfaengerHinzuDto) { … }
 * ```
 */
export type FuegeEmpfaengerHinzuDto = AlarmierungEmpfaengerFahrzeugDto | AlarmierungEmpfaengerPersonDto | AlarmierungEmpfaengerEinheitDto;

/**
 * Swagger-Schema-Options für den FuegeEmpfaengerHinzu-Body. In Controllern
 * via `@ApiBody({ schema: FUEGE_EMPFAENGER_HINZU_BODY_SCHEMA })` referenzierbar.
 *
 * Der Single-Empfänger-Body ist eine Discriminator-Union — exakt dieselbe
 * Struktur wie die Listen-Elemente in {@link CreateAlarmierungDto}.
 */
export const FUEGE_EMPFAENGER_HINZU_BODY_SCHEMA = {
  description: 'Polymorpher Empfänger (Discriminator: kind)',
  oneOf: [{ $ref: getSchemaPath(AlarmierungEmpfaengerFahrzeugDto) }, { $ref: getSchemaPath(AlarmierungEmpfaengerPersonDto) }, { $ref: getSchemaPath(AlarmierungEmpfaengerEinheitDto) }],
  discriminator: {
    propertyName: 'kind',
    mapping: {
      fahrzeug: getSchemaPath(AlarmierungEmpfaengerFahrzeugDto),
      person: getSchemaPath(AlarmierungEmpfaengerPersonDto),
      einheit: getSchemaPath(AlarmierungEmpfaengerEinheitDto),
    },
  },
};

/**
 * Marker-Decorator für Controller, die den FuegeEmpfaengerHinzu-Body
 * verwenden. Registriert die Sub-DTOs für die OpenAPI-Generierung.
 *
 * Hinweis: Wenn der Controller bereits {@link ApiAlarmierungEmpfaengerExtraModels}
 * verwendet (z.B. weil derselbe Controller auch `CreateAlarmierungDto` annimmt),
 * ist diese zusätzliche Registrierung redundant und kann entfallen.
 */
export const ApiFuegeEmpfaengerHinzuExtraModels = () => ApiExtraModels(AlarmierungEmpfaengerFahrzeugDto, AlarmierungEmpfaengerPersonDto, AlarmierungEmpfaengerEinheitDto);
