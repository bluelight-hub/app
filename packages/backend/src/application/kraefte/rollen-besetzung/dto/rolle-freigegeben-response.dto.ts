import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für erfolgreiche Rollenfreigabe.
 *
 * **AC7 Compliance:** Nutzt @ApiWrappedResponse Pattern für konsistente API-Responses.
 * DELETE Endpoints geben HTTP 200 mit wrapped response zurück, nicht 204 No Content.
 */
export class RolleFreigegebenResponseDto {
  @ApiProperty({
    description: 'ID der freigegebenen RollenBesetzung',
    example: 'cm5h8k2x1000008l87v8g3c5a',
  })
  id!: string;

  @ApiProperty({
    description: 'Bestätigungsnachricht',
    example: 'Rolle erfolgreich freigegeben',
  })
  message!: string;
}
