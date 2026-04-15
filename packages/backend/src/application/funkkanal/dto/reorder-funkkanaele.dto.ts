import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export class ReorderFunkkanalEntryDto {
  @ApiProperty({ example: 'clxyz123', description: 'Funkkanal-ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 0, description: 'Neuer sortIndex (nicht-negativer Integer)', minimum: 0 })
  @IsInt()
  @Min(0)
  sortIndex!: number;
}

/**
 * Bulk-Reorder: Übergibt die komplette neue Sort-Reihenfolge aller Kanäle
 * des Einsatzes. Emittiert genau ein `FunkkanalReihenfolgeGeaendertEvent`.
 */
export class ReorderFunkkanaeleDto {
  @ApiProperty({ type: () => [ReorderFunkkanalEntryDto], description: 'Neue Sort-Reihenfolge; alle nicht-archivierten Kanäle müssen enthalten sein' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderFunkkanalEntryDto)
  ordering!: ReorderFunkkanalEntryDto[];
}
