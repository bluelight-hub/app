import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * DTO für Statusänderung einer taktischen Einheit.
 *
 * **Gültige Status:**
 * - AUFGESTELLT: Einheit wurde aufgestellt, noch nicht einsatzbereit
 * - EINSATZBEREIT: Einheit ist einsatzbereit
 * - IM_EINSATZ: Einheit befindet sich im aktiven Einsatz
 * - IN_RESERVE: Einheit ist in Reserve gehalten
 * - AUFGELOEST: Einheit wurde aufgelöst
 */
export class ChangeEinsatzEinheitStatusDto {
  @ApiProperty({
    description: 'Neuer Status der Einheit',
    enum: ['AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST'],
    example: 'IM_EINSATZ',
  })
  @IsEnum(['AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST'], {
    message: 'status muss einer der folgenden Werte sein: AUFGESTELLT, EINSATZBEREIT, IM_EINSATZ, IN_RESERVE, AUFGELOEST',
  })
  status!: string;
}
