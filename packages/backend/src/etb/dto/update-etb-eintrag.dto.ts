import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { CreateEtbEintragDto } from './create-etb-eintrag.dto';

/**
 * DTO zum Aktualisieren eines bestehenden ETB-Eintrags.
 * Alle Felder aus CreateEtbEintragDto sind optional - nur die angegebenen Felder werden aktualisiert.
 * Zusätzlich kann ein Änderungsgrund für die Audit-Historie angegeben werden.
 */
export class UpdateEtbEintragDto extends PartialType(CreateEtbEintragDto) {
  /**
   * Grund für die Änderung (für Audit-Historie).
   * Wird in der Änderungshistorie gespeichert für Nachvollziehbarkeit.
   */
  @ApiPropertyOptional({
    description: 'Reason for the change (for audit trail)',
    example: 'Korrektur der Stockwerksangabe',
  })
  @IsOptional()
  @IsString({ message: 'changeReason muss eine Zeichenkette sein' })
  @MaxLength(500, { message: 'changeReason darf maximal 500 Zeichen lang sein' })
  changeReason?: string;
}
