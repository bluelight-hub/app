import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

/**
 * Polymorphe Empfänger-Referenz am API-Rand.
 *
 * Genau eine der drei IDs darf gesetzt sein — Discriminator ist `kind`.
 *
 * **Validierung:** Die Sub-DTO-Klassen tragen bewusst KEINE
 * `class-validator`-Decorators. Grund: `class-transformer` kann eine
 * diskriminierte Union ohne `@Type({ discriminator: …, subTypes: … })`
 * nicht in den richtigen Subtyp materialisieren — Sub-Decorators wären
 * also wirkungslos und vermitteln eine falsche Sicherheit. Stattdessen
 * validieren Command-/Aggregat-Layer (`ErstelleAlarmierungCommand`,
 * `validateEmpfaengerRef`, `AlarmierungAggregate.fuegeEmpfaengerHinzu`)
 * Pflichtfelder und XOR-Invariante autoritativ. Die DTO-Klassen
 * existieren ausschließlich, damit Swagger / OpenAPI-Generator
 * `oneOf` + `discriminator` korrekt aufbauen können.
 */
export const ALARMIERUNG_EMPFAENGER_KIND_VALUES = ['fahrzeug', 'person', 'einheit'] as const;
export type AlarmierungEmpfaengerKindValue = (typeof ALARMIERUNG_EMPFAENGER_KIND_VALUES)[number];

/**
 * Diskriminierte Union-Variante: Fahrzeug-Empfänger.
 *
 * Siehe Hinweis am Header-Kommentar dieses Moduls — keine
 * `class-validator`-Decorators, Validierung erfolgt in Command/Aggregat.
 */
export class AlarmierungEmpfaengerFahrzeugDto {
  @ApiProperty({ enum: ['fahrzeug'], example: 'fahrzeug' })
  kind!: 'fahrzeug';

  @ApiProperty({ description: 'ID eines Einsatz-Fahrzeugs (CUID2)', example: 'clx1234567890' })
  fahrzeugId!: string;

  @ApiPropertyOptional({ description: 'Optionaler Name-Snapshot. Wenn leer, ermittelt der Handler den Funkrufnamen.', nullable: true })
  nameSnapshot?: string;

  @ApiPropertyOptional({ description: 'Optionaler eigener Alarmiert-Zeitpunkt (Default: alarmierungszeit)', type: 'string', format: 'date-time', nullable: true })
  alarmiertAm?: Date | string;
}

/**
 * Diskriminierte Union-Variante: Personen-Empfänger.
 */
export class AlarmierungEmpfaengerPersonDto {
  @ApiProperty({ enum: ['person'], example: 'person' })
  kind!: 'person';

  @ApiProperty({ description: 'ID einer Einsatz-Person (CUID2)', example: 'clx1234567890' })
  personId!: string;

  @ApiPropertyOptional({ description: 'Optionaler Name-Snapshot. Wenn leer, ermittelt der Handler den Namen.', nullable: true })
  nameSnapshot?: string;

  @ApiPropertyOptional({ description: 'Optionaler eigener Alarmiert-Zeitpunkt', type: 'string', format: 'date-time', nullable: true })
  alarmiertAm?: Date | string;
}

/**
 * Diskriminierte Union-Variante: Einheiten-Empfänger.
 */
export class AlarmierungEmpfaengerEinheitDto {
  @ApiProperty({ enum: ['einheit'], example: 'einheit' })
  kind!: 'einheit';

  @ApiProperty({ description: 'ID einer Einsatz-Einheit', example: 'clx1234567890' })
  einheitId!: string;

  @ApiPropertyOptional({ description: 'Optionaler Name-Snapshot. Wenn leer, ermittelt der Handler den Namen.', nullable: true })
  nameSnapshot?: string;

  @ApiPropertyOptional({ description: 'Optionaler eigener Alarmiert-Zeitpunkt', type: 'string', format: 'date-time', nullable: true })
  alarmiertAm?: Date | string;
}

/**
 * Eingabe-Union: Alarmierungs-Empfänger am API-Rand.
 *
 * Das DTO ist polymorph (Discriminator `kind`); die XOR-Invariante über die
 * IDs wird durch die getrennten DTO-Klassen sichergestellt.
 */
export type AlarmierungEmpfaengerInputDto = AlarmierungEmpfaengerFahrzeugDto | AlarmierungEmpfaengerPersonDto | AlarmierungEmpfaengerEinheitDto;

/**
 * Swagger-Schema-Options für die Empfänger-Eingabe-Union. Wird in Controllern
 * via `@ApiProperty(ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA)` referenziert.
 */
export const ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA = {
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
 * Marker-Decorator zur Registrierung aller Empfänger-Varianten am Controller —
 * notwendig, damit der OpenAPI-Generator die Discriminator-Refs auflösen kann.
 */
export const ApiAlarmierungEmpfaengerExtraModels = () => ApiExtraModels(AlarmierungEmpfaengerFahrzeugDto, AlarmierungEmpfaengerPersonDto, AlarmierungEmpfaengerEinheitDto);

/**
 * Response-DTO eines Alarmierungs-Empfängers inkl. berechneter Reaktionszeit.
 */
export class AlarmierungEmpfaengerResponseDto {
  @ApiProperty({ example: 'clxyz...', description: 'ID des Empfänger-Eintrags' })
  id!: string;

  @ApiProperty({ enum: ALARMIERUNG_EMPFAENGER_KIND_VALUES, example: 'fahrzeug', description: 'Typ des Empfängers' })
  kind!: AlarmierungEmpfaengerKindValue;

  @ApiPropertyOptional({ description: 'ID des Fahrzeugs (nur bei kind=fahrzeug)', type: 'string', nullable: true })
  fahrzeugId?: string | null;

  @ApiPropertyOptional({ description: 'ID der Person (nur bei kind=person)', type: 'string', nullable: true })
  personId?: string | null;

  @ApiPropertyOptional({ description: 'ID der Einheit (nur bei kind=einheit)', type: 'string', nullable: true })
  einheitId?: string | null;

  @ApiProperty({ example: 'Florian Mainz 12-1', description: 'Name-Snapshot zum Zeitpunkt der Zuordnung' })
  nameSnapshot!: string;

  @ApiProperty({ type: 'string', format: 'date-time', description: 'Zeitpunkt der Alarmierung des Empfängers' })
  alarmiertAm!: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, description: 'Ausgerückt-Zeitpunkt (FMS 3 oder manuell)' })
  ausgeruecktAm?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, description: 'Vor-Ort-Zeitpunkt (FMS 4 oder manuell)' })
  vorOrtAm?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, description: 'Wieder-Frei-Zeitpunkt (FMS 1/2 oder manuell)' })
  wiederFreiAm?: Date | null;

  @ApiPropertyOptional({ description: 'Letzter empfangener FMS-Status', type: 'number', nullable: true, example: 4 })
  letzterFmsStatus?: number | null;

  @ApiPropertyOptional({
    description: 'Reaktionszeit in Sekunden (alarmiertAm → vorOrtAm). Null, solange vorOrtAm nicht gesetzt.',
    type: 'number',
    nullable: true,
    example: 245,
  })
  reaktionszeitSekunden?: number | null;
}
