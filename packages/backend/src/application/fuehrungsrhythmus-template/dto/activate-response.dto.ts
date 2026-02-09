import { ApiProperty } from '@nestjs/swagger';
import { ErinnerungResponseDto } from '@application/erinnerung/dto/erinnerung-response.dto';

/**
 * Response DTO für die Aktivierung eines Führungsrhythmus-Templates.
 */
export class ActivateFuehrungsrhythmusTemplateResponseDto {
  @ApiProperty({ description: 'ID des aktivierten Templates', example: 'clxxxx...' })
  templateId!: string;

  @ApiProperty({ description: 'Name des aktivierten Templates', example: 'Standard-Führungsrhythmus 30min' })
  templateName!: string;

  @ApiProperty({ type: [ErinnerungResponseDto], description: 'Liste der erstellten wiederkehrenden Erinnerungen' })
  erstellteErinnerungen!: ErinnerungResponseDto[];
}
