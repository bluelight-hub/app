import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IpWhitelist as PrismaIpWhitelist } from '@prisma/generated/prisma/client';

export class IpWhitelist implements PrismaIpWhitelist {
  @ApiProperty({
    description: 'Eindeutige ID des Whitelist-Eintrags',
    example: 'clh1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'IP-Adresse oder Beginn eines IP-Bereichs',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'CIDR-Notation für IP-Bereiche',
    example: 24,
  })
  cidr: number | null;

  @ApiPropertyOptional({
    description: 'Beschreibung des Eintrags',
    example: 'Büro Hauptstandort',
  })
  description: string | null;

  @ApiProperty({
    description: 'Ob der Eintrag aktiv ist',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Ob der Eintrag temporär ist',
    example: false,
  })
  isTemporary: boolean;

  @ApiPropertyOptional({
    description: 'Ablaufdatum für temporäre Einträge',
    example: '2024-12-31T23:59:59Z',
  })
  expiresAt: Date | null;

  @ApiProperty({
    description: 'Benutzer-ID des Erstellers',
    example: 'user123',
  })
  createdBy: string;

  @ApiProperty({
    description: 'E-Mail des Erstellers',
    example: 'admin@example.com',
  })
  createdByEmail: string;

  @ApiPropertyOptional({
    description: 'Benutzer-ID des letzten Bearbeiters',
    example: 'user456',
  })
  updatedBy: string | null;

  @ApiPropertyOptional({
    description: 'E-Mail des letzten Bearbeiters',
    example: 'admin2@example.com',
  })
  updatedByEmail: string | null;

  @ApiProperty({
    description: 'Erstellungsdatum',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Datum der letzten Aktualisierung',
    example: '2024-01-02T00:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der letzten Nutzung',
    example: '2024-01-15T10:30:00Z',
  })
  lastUsedAt: Date | null;

  @ApiProperty({
    description: 'Anzahl der Nutzungen',
    example: 42,
  })
  useCount: number;

  @ApiProperty({
    description: 'Tags zur Gruppierung',
    example: ['office', 'main-location'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Erlaubte Endpunkte (leer = alle)',
    example: ['/api/einsatz', '/api/etb'],
    type: [String],
  })
  allowedEndpoints: string[];
}
