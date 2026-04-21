import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * VAPID-Key-Paar aus dem Browser (PushSubscription.getKey()).
 *
 * Die Strings sind Base64Url-encodiert; ausführliche kryptografische
 * Validierung übernimmt `web-push` beim ersten Send. `@MaxLength` verhindert
 * DoS via aufgeblähter TEXT-Spalten-Writes.
 */
export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'P-256 Diffie-Hellman Public-Key des Browsers (Base64Url)' })
  @IsString()
  @IsNotEmpty({ message: 'keys.p256dh darf nicht leer sein' })
  @MaxLength(512, { message: 'keys.p256dh überschreitet die erlaubte Länge (max. 512 Zeichen)' })
  p256dh!: string;

  @ApiProperty({ description: 'Auth-Secret des Browsers für Message-Authentication (Base64Url)' })
  @IsString()
  @IsNotEmpty({ message: 'keys.auth darf nicht leer sein' })
  @MaxLength(512, { message: 'keys.auth überschreitet die erlaubte Länge (max. 512 Zeichen)' })
  auth!: string;
}
