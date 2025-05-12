import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EtbKategorie } from './etb-kategorie.enum';

/**
 * DTO für das Aktualisieren eines bestehenden Einsatztagebuch-Eintrags.
 * Alle Felder sind optional, da nur die zu aktualisierenden Felder angegeben werden müssen.
 */
export class UpdateEtbDto {
    /**
     * Zeitpunkt des tatsächlichen Ereignisses
     */
    @ApiPropertyOptional({ description: 'Zeitpunkt des tatsächlichen Ereignisses' })
    @IsDateString()
    @IsOptional()
    timestampEreignis?: string;

    /**
     * Kategorie des Eintrags
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
     * Optionaler Titel für den Eintrag
     */
    @ApiPropertyOptional({ description: 'Optionaler Titel für den Eintrag' })
    @IsString()
    @IsOptional()
    titel?: string;

    /**
     * Detaillierte Beschreibung des Ereignisses
     */
    @ApiPropertyOptional({ description: 'Detaillierte Beschreibung des Ereignisses' })
    @IsString()
    @IsOptional()
    beschreibung?: string;

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
} 