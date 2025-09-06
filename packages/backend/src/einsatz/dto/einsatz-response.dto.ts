import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Einsatz, EinsatzStatus, type Prisma } from '@prisma/client';
import { IsEnum } from 'class-validator';

export interface EinsatzCompleteness {
  score: number;
  isComplete: boolean;
  missingFields: MissingField[];
}

export interface MissingField {
  field: string;
  fieldPath: string;
  priority: 'critical' | 'important' | 'optional';
  message: string;
  suggestedAction?: string;
}

export interface NameComponents {
  alarmstichwort?: string;
  zeit?: string;
  datum: string;
}

export interface EinsatzLinks {
  self: string;
  update: string;
  completeness: string;
}

export class EinsatzResponseDto implements Einsatz {
  @ApiProperty({
    description: 'Eindeutige ID des Einsatzes',
    example: 'cm4xyzabc123456789',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Das Alarmstichwort des Einsatzes',
    example: 'Brand 3',
  })
  alarmstichwort: string | null;

  @ApiPropertyOptional({
    description: 'Der Einsatzort',
    example: 'Musterstraße 123, 12345 Musterstadt',
  })
  einsatzort: string | null;

  @ApiPropertyOptional({
    description: 'Beschreibung des Einsatzes',
    example: 'Rauchentwicklung im 2. OG, keine Personen in Gefahr',
  })
  beschreibung: string | null;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Alarmierung',
    example: '2025-01-27T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  alarmierungszeit: Date | null;

  @ApiPropertyOptional({
    description: 'Name des Einsatzleiters',
    example: 'Max Mustermann',
  })
  einsatzleiter: string | null;

  @ApiProperty({
    description: 'Status des Einsatzes',
    enum: EinsatzStatus,
    example: EinsatzStatus.ANGELEGT,
  })
  @IsEnum(EinsatzStatus)
  status: EinsatzStatus;

  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten als JSON',
    type: 'object',
    additionalProperties: true,
  })
  metadata: Prisma.JsonValue | null;

  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2025-01-27T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktualisierung',
    example: '2025-01-27T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User ID des Erstellers',
    example: 'user123',
  })
  createdBy: string;

  @ApiPropertyOptional({
    description: 'User ID des letzten Bearbeiters',
    example: 'user456',
  })
  updatedBy: string | null;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Archivierung (No-Delete Policy)',
    example: '2025-01-27T16:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  archivedAt: Date | null;

  @ApiPropertyOptional({
    description: 'User ID des Archivierers (No-Delete Policy)',
    example: 'user789',
  })
  archivedBy: string | null;

  @ApiProperty({
    description: 'Automatisch generierter Name des Einsatzes',
    example: 'Brand 3 - 27.01.2025 14:30',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Vollständigkeits-Information',
    type: 'object',
    additionalProperties: true,
  })
  completeness?: EinsatzCompleteness;

  @ApiPropertyOptional({
    description: 'Komponenten des generierten Namens',
    type: 'object',
    additionalProperties: true,
  })
  nameComponents?: NameComponents;
}
