import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO für das Überschreiben eines bestehenden Einsatztagebuch-Eintrags.
 * Enthält alle Felder, die beim Überschreiben eines Eintrags aktualisiert werden können.
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
     * Kategorie des Eintrags (z.B. "Meldung", "Befehl", "Patientenmaßnahme")
     */
    @ApiPropertyOptional({ description: 'Kategorie des Eintrags' })
    @IsString()
    @IsOptional()
    kategorie?: string;

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
} 