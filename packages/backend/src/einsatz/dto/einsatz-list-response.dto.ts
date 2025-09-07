import { ApiProperty } from '@nestjs/swagger';
import { EinsatzResponseDto } from './einsatz-response.dto';

/**
 * Response-Wrapper für Einsatz-Listen
 */
export class EinsatzListResponseDto {
  @ApiProperty({
    description: 'Die Liste der Einsätze',
    type: EinsatzResponseDto,
    isArray: true,
  })
  data: EinsatzResponseDto[];

  @ApiProperty({
    description: 'Metainformationen zur Response',
    example: {
      timestamp: '2025-08-29T14:00:00.000Z',
      version: 'alpha',
      requestId: 'abc123',
    },
  })
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}
