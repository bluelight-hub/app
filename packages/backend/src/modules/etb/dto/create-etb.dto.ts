import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { nanoid } from 'nanoid';
import { IsNanoId } from '../../../common/decorators';
import { EtbKategorie } from './etb-kategorie.enum';

/**
 * DTO für das Erstellen eines neuen Einsatztagebuch-Eintrags.
 */
export class CreateEtbDto {
    /**
     * Zeitpunkt des tatsächlichen Ereignisses
     */
    @ApiProperty({ description: 'Zeitpunkt des tatsächlichen Ereignisses', example: '2025-05-17T10:00:00Z' })
    @IsDateString()
    @IsNotEmpty()
    timestampEreignis: string;

    /**
     * Kategorie des Eintrags
     */
    @ApiProperty({
        description: 'Kategorie des Eintrags',
        enum: EtbKategorie,
        enumName: 'EtbKategorie',
        example: EtbKategorie.MELDUNG
    })
    @IsEnum(EtbKategorie)
    @IsNotEmpty()
    kategorie: EtbKategorie;

    /**
     * Inhalt des Eintrags
     */
    @ApiProperty({ description: 'Inhalt des Eintrags', example: 'Meldung über einen Patienten' })
    @IsString()
    @IsNotEmpty()
    inhalt: string;

    /**
     * Absender des Eintrags (OPTA-Nummer)
     */
    @ApiPropertyOptional({ description: 'Absender des Eintrags (OPTA-Nummer)', example: '40-83-3' })
    @IsString()
    @IsOptional()
    sender?: string;

    /**
     * Empfänger des Eintrags (OPTA-Nummer)
     */
    @ApiPropertyOptional({ description: 'Empfänger des Eintrags (OPTA-Nummer)', example: '40-83-4' })
    @IsString()
    @IsOptional()
    receiver?: string;

    /**
     * Referenz zur Patienten-ID (optional)
     */
    @ApiPropertyOptional({ description: 'Referenz zur Patienten-ID', example: nanoid() })
    @IsNanoId()
    @IsOptional()
    referenzPatientId?: string;

    /**
     * Referenz zur Einsatzmittel-ID (optional)
     */
    @ApiPropertyOptional({ description: 'Referenz zur Einsatzmittel-ID', example: nanoid() })
    @IsNanoId()
    @IsOptional()
    referenzEinsatzmittelId?: string;
} 