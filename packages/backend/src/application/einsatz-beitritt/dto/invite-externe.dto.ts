import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * DTO für die Einladung eines EXTERNE-Users in einen Einsatz.
 *
 * Request Body: Enthält die User-ID des einzuladenden EXTERNE-Users.
 * Wird von der Führungskraft gesendet.
 */
export class InviteExterneDto {
  @ApiProperty({
    description: 'User-ID des einzuladenden EXTERNE-Users',
    example: 'user_abc123',
  })
  @IsString({ message: 'userId muss ein String sein' })
  userId!: string;
}
