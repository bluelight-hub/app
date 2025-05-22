import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Einsatz {
    @ApiProperty({
        description: 'Eindeutige ID des Einsatzes',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Name des Einsatzes',
        example: 'Brandeinsatz Hauptstraße'
    })
    name: string;

    @ApiPropertyOptional({
        description: 'Optionale Beschreibung des Einsatzes',
        example: 'Großbrand in Mehrfamilienhaus'
    })
    beschreibung?: string;

    @ApiProperty({
        description: 'Erstelldatum des Einsatzes',
        example: '2025-05-19T14:30:00Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Letzte Aktualisierung des Einsatzes',
        example: '2025-05-19T15:45:00Z'
    })
    updatedAt: Date;
}
