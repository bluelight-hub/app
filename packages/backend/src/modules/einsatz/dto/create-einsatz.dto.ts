import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO zum Anlegen eines neuen Einsatzes.
 */
export class CreateEinsatzDto {
    /**
     * Name des Einsatzes
     */
    @ApiProperty({ description: 'Name des Einsatzes', example: 'Einsatz Alpha' })
    @IsString()
    @IsNotEmpty()
    name!: string;
}
