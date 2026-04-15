import { ApiProperty } from '@nestjs/swagger';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * DTO für WebSocket `join:einsatz` Event auf dem Einsatz-Events-Gateway.
 *
 * Validiert die `einsatzId` als CUID2, um Room-Traversal zu verhindern.
 */
export class JoinEinsatzDto {
  @ApiProperty({
    description: 'ID des Einsatzes, dessen Funkverkehr-Events abonniert werden',
    example: 'clh1ykg0k0000qwer1234abcd',
  })
  @IsCuid({ message: 'einsatzId muss eine gültige CUID2 sein' })
  einsatzId!: string;
}
