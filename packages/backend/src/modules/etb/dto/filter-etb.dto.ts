import { FilterPaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtbEntryStatus } from '@prisma/generated/prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EtbKategorie } from './etb-kategorie.enum';

/**
 * DTO für das Filtern von Einsatztagebuch-Einträgen.
 * Ermöglicht das Filtern nach verschiedenen Kriterien.
 */
export class FilterEtbDto extends FilterPaginationDto {
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
  @ApiPropertyOptional({
    description: 'Filtert nach Kategorie',
    enum: EtbKategorie,
    enumName: 'EtbKategorie',
  })
  @IsEnum(EtbKategorie)
  @IsOptional()
  kategorie?: EtbKategorie;

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
   * Filtert nach Empfänger (abgeschlossenVon)
   */
  @ApiPropertyOptional({ description: 'Filtert nach Empfänger (abgeschlossenVon)' })
  @IsString()
  @IsOptional()
  empfaenger?: string;

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
    type: Boolean,
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
   * Optionales Suchfeld für Volltextsuche (Inhalt, Autor, Empfänger)
   */
  @ApiPropertyOptional({
    description: 'Volltextsuche in Inhalt, Autor und Empfänger',
    example: 'Stromausfall',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
