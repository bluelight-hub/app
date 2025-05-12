import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { EtbKategorie } from './etb-kategorie.enum';

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
     * Kategorie des Eintrags
     */
    @ApiProperty({
        description: 'Kategorie des Eintrags',
        enum: EtbKategorie,
        enumName: 'EtbKategorie'
    })
    @IsEnum(EtbKategorie)
    @IsNotEmpty()
    kategorie: EtbKategorie;

    /**
     * Inhalt des Eintrags
     */
    @ApiProperty({ description: 'Inhalt des Eintrags' })
    @IsString()
    @IsNotEmpty()
    inhalt: string;

    /**
     * Absender des Eintrags (OPTA-Nummer)
     */
    @ApiPropertyOptional({ description: 'Absender des Eintrags (OPTA-Nummer)' })
    @IsString()
    @IsOptional()
    sender?: string;

    /**
     * Empfänger des Eintrags (OPTA-Nummer)
     */
    @ApiPropertyOptional({ description: 'Empfänger des Eintrags (OPTA-Nummer)' })
    @IsString()
    @IsOptional()
    receiver?: string;

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