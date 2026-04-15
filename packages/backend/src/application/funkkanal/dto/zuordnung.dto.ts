import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { HasExactlyOneKraftReference } from './validators/exactly-one-kraft.validator';

export const FUNKKANAL_ROLLE_VALUES = ['primaer', 'sekundaer', 'zuhoeren'] as const;
export type FunkkanalRolleValue = (typeof FUNKKANAL_ROLLE_VALUES)[number];

/**
 * Request-DTO zum Zuordnen einer Kraft (Fahrzeug/Person/Einheit) zu einem Funkkanal.
 *
 * XOR-Invariante: genau EINE der drei IDs muss gesetzt sein. Siehe
 * {@link HasExactlyOneKraftReference} für die Validator-Logik.
 */
export class CreateZuordnungDto {
  @ApiPropertyOptional({ description: 'ID eines Einsatz-Fahrzeugs', example: 'clx1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fahrzeugId?: string;

  @ApiPropertyOptional({ description: 'ID einer Einsatz-Person', example: 'clx1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  personId?: string;

  @ApiPropertyOptional({ description: 'ID einer Einsatz-Einheit', example: 'clx1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  einheitId?: string;

  @ApiProperty({
    enum: FUNKKANAL_ROLLE_VALUES,
    default: 'primaer',
    example: 'primaer',
    description: 'Rolle der Kraft auf dem Kanal',
  })
  @IsEnum(FUNKKANAL_ROLLE_VALUES)
  rolle!: FunkkanalRolleValue;

  /**
   * Marker-Feld für die XOR-Validation; wird nicht persistiert.
   * Die eigentlichen IDs sind obige Felder.
   */
  @HasExactlyOneKraftReference()
  private readonly _kraftRef?: never;
}

export class UpdateZuordnungRolleDto {
  @ApiProperty({ enum: FUNKKANAL_ROLLE_VALUES, example: 'sekundaer', description: 'Neue Rolle' })
  @IsEnum(FUNKKANAL_ROLLE_VALUES)
  rolle!: FunkkanalRolleValue;
}

export class ZuordnungResponseDto {
  @ApiProperty({ example: 'clxyz...', description: 'ID der Zuordnung' })
  id!: string;

  @ApiProperty({ example: 'clkanal...', description: 'ID des Funkkanals' })
  kanalId!: string;

  @ApiProperty({ enum: ['fahrzeug', 'person', 'einheit'], example: 'fahrzeug', description: 'Typ der zugeordneten Kraft' })
  kraftKind!: 'fahrzeug' | 'person' | 'einheit';

  @ApiPropertyOptional({ description: 'ID des Fahrzeugs (nur bei kind=fahrzeug)', nullable: true })
  fahrzeugId?: string | null;

  @ApiPropertyOptional({ description: 'ID der Person (nur bei kind=person)', nullable: true })
  personId?: string | null;

  @ApiPropertyOptional({ description: 'ID der Einheit (nur bei kind=einheit)', nullable: true })
  einheitId?: string | null;

  @ApiProperty({ example: 'Florian Mainz 12-1', description: 'Rufname zum Zeitpunkt der Zuordnung (Snapshot)' })
  rufnameSnapshot!: string;

  @ApiProperty({ enum: FUNKKANAL_ROLLE_VALUES, example: 'primaer' })
  rolle!: FunkkanalRolleValue;

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-04-14T12:00:00.000Z' })
  createdAt!: Date;
}
