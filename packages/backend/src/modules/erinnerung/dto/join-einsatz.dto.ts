import { ApiProperty } from '@nestjs/swagger';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * DTO fuer WebSocket join:einsatz Event.
 *
 * **Security:** Validiert einsatzId vor Room-Join um Room Traversal zu verhindern.
 * MUSS CUID2 Format sein (verhindert Path Traversal via Room-Namen).
 */
export class JoinEinsatzDto {
  @ApiProperty({
    description: 'ID des Einsatzes dessen Erinnerungen abonniert werden',
    example: 'clh1ykg0k0000qwer1234abcd',
  })
  @IsCuid({ message: 'einsatzId muss eine gültige CUID2 sein' })
  einsatzId!: string;
}
