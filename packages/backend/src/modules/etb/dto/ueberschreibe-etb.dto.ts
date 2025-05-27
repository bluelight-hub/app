import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { EtbKategorie } from './etb-kategorie.enum';

/**
 * DTO für das Überschreiben eines bestehenden Einsatztagebuch-Eintrags.
 * Wird verwendet, wenn ein Eintrag durch eine neuere Version ersetzt werden soll,
 * wobei der Originalinhalt erhalten bleibt und als "überschrieben" markiert wird.
 */
export class UeberschreibeEtbDto {
    /**
     * Zeitpunkt des tatsächlichen Ereignisses
     */
    @ApiPropertyOptional({ description: 'Zeitpunkt des tatsächlichen Ereignisses' })
    @IsDateString()
    @IsOptional()
    timestampEreignis?: string;

    /**
     * Kategorie des neuen Eintrags
     */
    @ApiPropertyOptional({
        description: 'Kategorie des Eintrags',
        enum: EtbKategorie,
        enumName: 'EtbKategorie'
    })
    @IsEnum(EtbKategorie)
    @IsOptional()
    kategorie?: EtbKategorie;

    /**
     * Inhalt des neuen Eintrags
     */
    @ApiProperty({ description: 'Inhalt des Eintrags' })
    @IsString()
    @IsNotEmpty()
    inhalt: string;

    /**
     * Grund für die Überschreibung
     */
    @ApiPropertyOptional({ description: 'Grund für die Überschreibung' })
    @IsString()
    @IsOptional()
    ueberschreibungsgrund?: string;

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