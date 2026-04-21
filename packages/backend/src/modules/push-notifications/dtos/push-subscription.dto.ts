import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-DTO für `POST /users/me/push-subscriptions`.
 *
 * Enthält nur die öffentlich sichtbaren Felder — VAPID-Keys werden nie
 * zurückgegeben.
 */
export class PushSubscriptionDto {
  @ApiProperty({ description: 'Eindeutige ID der Subscription', example: 'clx...' })
  id!: string;

  @ApiProperty({ description: 'User-ID des Besitzers der Subscription' })
  userId!: string;

  @ApiProperty({ description: 'HTTPS-Endpoint des Browser-Push-Services' })
  endpoint!: string;

  @ApiProperty({ description: 'Zeitpunkt der Registrierung', type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ description: 'Zeitpunkt der letzten Aktualisierung (Re-Registrierung)', type: String, format: 'date-time' })
  updatedAt!: Date;
}
