import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ZeichenDefinitionRequestDto } from './zeichen-definition.dto';

/**
 * Request DTO zum Setzen eines Default-Zeichens (Fahrzeugtyp oder Einheitentyp).
 */
export class SetzeDefaultZeichenDto {
  @ApiProperty({ type: ZeichenDefinitionRequestDto, description: 'Zeichendefinition für das Standard-Zeichen' })
  @ValidateNested()
  @Type(() => ZeichenDefinitionRequestDto)
  zeichenDefinition!: ZeichenDefinitionRequestDto;
}
