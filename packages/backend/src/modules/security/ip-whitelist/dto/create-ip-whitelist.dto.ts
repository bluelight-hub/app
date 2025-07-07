import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDateString,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIpWhitelistDto {
  @ApiProperty({
    description: 'Die IP-Adresse oder der Beginn eines IP-Bereichs',
    example: '192.168.1.1',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/,
    {
      message: 'Ungültige IP-Adresse. IPv4 oder IPv6 Format erforderlich.',
    },
  )
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'CIDR-Notation für IP-Bereiche (z.B. 24 für /24)',
    example: 24,
    minimum: 0,
    maximum: 128,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(128)
  cidr?: number;

  @ApiPropertyOptional({
    description: 'Beschreibung der IP-Adresse oder des Bereichs',
    example: 'Büro Hauptstandort',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Ob der Eintrag aktiv ist',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Ob der Eintrag temporär ist',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @ApiPropertyOptional({
    description: 'Ablaufdatum für temporäre Einträge',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Tags zur Gruppierung (z.B. "office", "vpn", "partner")',
    example: ['office', 'main-location'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Spezifische Endpunkte, auf die diese IP zugreifen darf (leer = alle)',
    example: ['/api/einsatz', '/api/etb'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEndpoints?: string[];
}
