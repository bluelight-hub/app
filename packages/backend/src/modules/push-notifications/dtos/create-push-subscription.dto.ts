import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsObject, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { PushSubscriptionKeysDto } from './push-subscription-keys.dto';

/**
 * Request-Body für `POST /users/me/push-subscriptions` (Story 1.1).
 *
 * Struktur entspricht dem vom Browser gelieferten `PushSubscription.toJSON()`
 * (Endpoint-URL + VAPID-Keys). Der Browser erzeugt den Endpoint vom jeweiligen
 * Push-Service (FCM, Mozilla autopush, Edge Push) — daher HTTPS-only.
 * `@MaxLength` begrenzt DoS-Angriffe über TEXT-Spalten-Writes,
 * `@IsDefined`/`@IsObject` auf `keys` verhindert `TypeError` bei fehlendem Feld.
 */
export class CreatePushSubscriptionDto {
  @ApiProperty({
    description: 'HTTPS-Endpoint des Browser-Push-Services',
    example: 'https://fcm.googleapis.com/fcm/send/xyz...',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'endpoint muss eine HTTPS-URL sein' })
  @MaxLength(2048, { message: 'endpoint überschreitet die erlaubte Länge (max. 2048 Zeichen)' })
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsDefined({ message: 'keys ist erforderlich' })
  @IsObject({ message: 'keys muss ein Objekt sein' })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}
