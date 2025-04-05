import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EtbEntryStatus } from '../entities/etb-entry.entity';

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
     * Filter nach Status
     * @deprecated Verwende stattdessen includeUeberschrieben
     */
    @ApiPropertyOptional({
        description: 'Filter nach Status (deprecated, verwende includeUeberschrieben)',
        enum: EtbEntryStatus,
    })
    @IsEnum(EtbEntryStatus)
    @IsOptional()
    status?: EtbEntryStatus;

    /**
     * Gibt an, ob überschriebene Einträge eingeschlossen werden sollen
     */
    @ApiPropertyOptional({
        description: 'Gibt an, ob überschriebene Einträge eingeschlossen werden sollen',
        default: false,
        type: Boolean
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true || value === '1' || value === 1) {
            return true;
        }
        return false;
    })
    includeUeberschrieben?: boolean = false;

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