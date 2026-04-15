import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const FUNK_PRIORITAET_VALUES = ['routine', 'prioritaet', 'notfall'] as const;
export type FunkPrioritaetValue = (typeof FUNK_PRIORITAET_VALUES)[number];

/**
 * Discriminated-Union-DTOs für den {@link EintragKontextShape} eines ETB-Eintrags.
 *
 * - `standard`: Gewöhnlicher Eintrag (default)
 * - `funkspruch`: Eintrag entstand aus Funkspruch; referenziert einen Kanal
 *   und trägt die Priorität.
 */
export class StandardKontextDto {
  @ApiProperty({ enum: ['standard'], example: 'standard' })
  @IsIn(['standard'])
  type!: 'standard';
}

export class FunkKontextDto {
  @ApiProperty({ enum: ['funkspruch'], example: 'funkspruch' })
  @IsIn(['funkspruch'])
  type!: 'funkspruch';

  @ApiProperty({ example: 'clkanal...', description: 'Referenzierter Funkkanal' })
  @IsString()
  @IsNotEmpty()
  kanalId!: string;

  @ApiProperty({ enum: FUNK_PRIORITAET_VALUES, example: 'routine', description: 'Priorität des Funkspruchs' })
  @IsIn(FUNK_PRIORITAET_VALUES)
  funkPrioritaet!: FunkPrioritaetValue;
}

export type EintragKontextUnionDto = StandardKontextDto | FunkKontextDto;

/**
 * Wiederverwendbares Swagger-Schema für die EintragKontext-Union.
 */
export const EINTRAG_KONTEXT_SCHEMA = {
  description: 'Kontext des Eintrags (discriminated union: standard | funkspruch)',
  oneOf: [{ $ref: getSchemaPath(StandardKontextDto) }, { $ref: getSchemaPath(FunkKontextDto) }],
  discriminator: {
    propertyName: 'type',
    mapping: {
      standard: getSchemaPath(StandardKontextDto),
      funkspruch: getSchemaPath(FunkKontextDto),
    },
  },
};

export const ApiEintragKontextExtraModels = () => ApiExtraModels(StandardKontextDto, FunkKontextDto);

/**
 * Hilfs-Prop-Decorator, der Controller-Input-DTOs um das optionale Kontext-Feld
 * ergänzt. Spart Duplikation auf `CreateEtbEintragDto`, Filter-DTOs etc.
 */
export const ApiEintragKontextOptional = () =>
  ApiPropertyOptional({
    ...EINTRAG_KONTEXT_SCHEMA,
    nullable: true,
  });

export const ApiEintragKontextRequired = () =>
  ApiProperty({
    ...EINTRAG_KONTEXT_SCHEMA,
  });

/**
 * Placeholder-Decorator — `@IsOptional()` in Kombination mit der
 * Konsumenten-Ebene reicht aktuell. Falls wir perspektivisch strictere
 * Validierung brauchen, lässt sich hier ein `@IsObject()`/custom-Decorator
 * ergänzen, ohne Call-Sites anzupassen.
 */
export const IsEintragKontext = () => IsOptional();
