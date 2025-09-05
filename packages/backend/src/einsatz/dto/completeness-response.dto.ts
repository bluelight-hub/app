import { ApiProperty } from '@nestjs/swagger';

class CompletenessFieldInfo {
  @ApiProperty({
    description: 'Der Name des Feldes',
    example: 'ansprechpartner',
  })
  field: string;

  @ApiProperty({
    description: 'Der vollständige Pfad zum Feld',
    example: 'einsatz.ansprechpartner',
  })
  fieldPath: string;

  @ApiProperty({
    description: 'Die Priorität des fehlenden Feldes',
    enum: ['critical', 'important', 'optional'],
    example: 'critical',
  })
  priority: 'critical' | 'important' | 'optional';

  @ApiProperty({
    description: 'Beschreibung des fehlenden Feldes',
    example: 'Kein Ansprechpartner definiert',
  })
  message: string;

  @ApiProperty({
    description: 'Empfohlene Aktion zur Behebung',
    example: 'Fügen Sie einen Ansprechpartner mit Name und Kontaktdaten hinzu',
  })
  suggestedAction: string;
}

export class CompletenessResponseDto {
  @ApiProperty({
    description: 'Vollständigkeits-Score in Prozent',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  score: number;

  @ApiProperty({
    description: 'Gibt an, ob der Einsatz vollständig ist',
    example: false,
  })
  isComplete: boolean;

  @ApiProperty({
    description: 'Liste der fehlenden oder unvollständigen Felder',
    type: [CompletenessFieldInfo],
    isArray: true,
  })
  missingFields: CompletenessFieldInfo[];
}
