import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * DTO für Rollenbesetzung (POST /einsaetze/:einsatzId/rollen-besetzung).
 *
 * **Story 5.1 - Rolle besetzen:**
 * - Weist einer qualifizierten EinsatzPerson eine Führungsrolle zu
 * - AC1: Qualifikationsprüfung erfolgt im Handler
 * - AC2: UNIQUE Constraint verhindert doppelte Besetzung
 * - AC4: Bei Neu-Besetzung wird vorherige Person automatisch freigegeben
 *
 * **Snapshot-Semantik (AC3):**
 * - Rollenname und Personenname werden bei Erstellung KOPIERT
 * - Für ETB-Einträge und historische Korrektheit
 */
export class BesetzeRolleDto {
  @ApiProperty({
    description: 'EinsatzPerson ID der zuzuweisenden Person (CUID2)',
    example: 'pf9902w6nvuidl428y92ssfc',
    format: 'cuid2',
  })
  @IsString({ message: 'einsatzPersonId muss ein String sein' })
  @IsNotEmpty({ message: 'einsatzPersonId ist erforderlich' })
  @IsCuid({ message: 'einsatzPersonId muss eine gültige CUID2 sein' })
  einsatzPersonId!: string;

  @ApiProperty({
    description: 'RollenDefinition ID der zu besetzenden Rolle (CUID2)',
    example: 'pf9902w6nvuidl428y92ssfc',
    format: 'cuid2',
  })
  @IsString({ message: 'rollenDefinitionId muss ein String sein' })
  @IsNotEmpty({ message: 'rollenDefinitionId ist erforderlich' })
  @IsCuid({ message: 'rollenDefinitionId muss eine gültige CUID2 sein' })
  rollenDefinitionId!: string;
}
