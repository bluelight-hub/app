import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO für das Filtern von Einsatztagebuch-Einträgen.
 * Ermöglicht das Filtern nach verschiedenen Kriterien.
 */
export class FilterEtbDto {
    /**
     * Filtert nach Einsatz-ID
     */
    @ApiPropertyOptional({ description: 'Filtert nach Einsatz-ID' })
    @IsUUID()
    @IsOptional()
    referenzEinsatzId?: string;

    /**
     * Filtert nach Patienten-ID
     */
    @ApiPropertyOptional({ description: 'Filtert nach Patienten-ID' })
    @IsUUID()
    @IsOptional()
    referenzPatientId?: string;

    /**
     * Filtert nach Einsatzmittel-ID
     */
    @ApiPropertyOptional({ description: 'Filtert nach Einsatzmittel-ID' })
    @IsUUID()
    @IsOptional()
    referenzEinsatzmittelId?: string;

    /**
     * Filtert nach Kategorie
     */
    @ApiPropertyOptional({ description: 'Filtert nach Kategorie' })
    @IsString()
    @IsOptional()
    kategorie?: string;

    /**
     * Filtert nach Einträgen ab diesem Zeitpunkt
     */
    @ApiPropertyOptional({ description: 'Filtert nach Einträgen ab diesem Zeitpunkt' })
    @IsDateString()
    @IsOptional()
    vonZeitstempel?: string;

    /**
     * Filtert nach Einträgen bis zu diesem Zeitpunkt
     */
    @ApiPropertyOptional({ description: 'Filtert nach Einträgen bis zu diesem Zeitpunkt' })
    @IsDateString()
    @IsOptional()
    bisZeitstempel?: string;

    /**
     * Filtert nach Autor-ID
     */
    @ApiPropertyOptional({ description: 'Filtert nach Autor-ID' })
    @IsString()
    @IsOptional()
    autorId?: string;

    /**
     * Seite für Paginierung (1-basiert)
     */
    @ApiPropertyOptional({ description: 'Seite für Paginierung', default: 1 })
    @IsOptional()
    page?: number = 1;

    /**
     * Anzahl der Einträge pro Seite
     */
    @ApiPropertyOptional({ description: 'Anzahl der Einträge pro Seite', default: 10 })
    @IsOptional()
    limit?: number = 10;
} 