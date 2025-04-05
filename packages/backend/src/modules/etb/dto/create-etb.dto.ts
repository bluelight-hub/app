import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO für das Erstellen eines neuen Einsatztagebuch-Eintrags.
 */
export class CreateEtbDto {
    /**
     * Zeitpunkt des tatsächlichen Ereignisses
     */
    @ApiProperty({ description: 'Zeitpunkt des tatsächlichen Ereignisses' })
    @IsDateString()
    @IsNotEmpty()
    timestampEreignis: string;

    /**
     * Kategorie des Eintrags (z.B. "Meldung", "Befehl", "Patientenmaßnahme")
     */
    @ApiProperty({ description: 'Kategorie des Eintrags' })
    @IsString()
    @IsNotEmpty()
    kategorie: string;

    /**
     * Optionaler Titel für den Eintrag
     */
    @ApiPropertyOptional({ description: 'Optionaler Titel für den Eintrag' })
    @IsString()
    @IsOptional()
    titel?: string;

    /**
     * Detaillierte Beschreibung des Ereignisses
     */
    @ApiProperty({ description: 'Detaillierte Beschreibung des Ereignisses' })
    @IsString()
    @IsNotEmpty()
    beschreibung: string;

    /**
     * Referenz zur Einsatz-ID (optional)
     */
    @ApiPropertyOptional({ description: 'Referenz zur Einsatz-ID' })
    @IsUUID()
    @IsOptional()
    referenzEinsatzId?: string;

    /**
     * Referenz zur Patienten-ID (optional)
     */
    @ApiPropertyOptional({ description: 'Referenz zur Patienten-ID' })
    @IsUUID()
    @IsOptional()
    referenzPatientId?: string;

    /**
     * Referenz zur Einsatzmittel-ID (optional)
     */
    @ApiPropertyOptional({ description: 'Referenz zur Einsatzmittel-ID' })
    @IsUUID()
    @IsOptional()
    referenzEinsatzmittelId?: string;
} 