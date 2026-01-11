import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

/**
 * DTO fuer den erstellten Admin-User in der Setup-Response.
 */
export class SetupUserDto {
  /**
   * Eindeutige User-ID (CUID).
   */
  @ApiProperty({
    description: 'Eindeutige User-ID',
    example: 'cm5abc123def456ghi789jkl0',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  /**
   * Nutzername des Admin-Users.
   */
  @ApiProperty({
    description: 'Nutzername des Admin-Users',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  /**
   * Rolle des Users (immer ADMIN beim Setup).
   */
  @ApiProperty({
    description: 'Rolle des Users',
    enum: ['ADMIN', 'SUPER_ADMIN', 'USER'],
    example: 'ADMIN',
  })
  @IsString()
  @IsNotEmpty()
  role!: string;
}

/**
 * DTO fuer den erstellten Access-Token in der Setup-Response.
 *
 * **Sicherheitshinweis:**
 * Das `token`-Feld enthaelt den Klartext-Token, der nur EINMALIG
 * in dieser Response zurueckgegeben wird. Der Token kann nicht
 * erneut abgerufen werden - nur der Hash wird in der DB gespeichert.
 */
export class SetupTokenDto {
  /**
   * Der generierte Access-Token im Klartext.
   *
   * **WICHTIG:** Dieser Token wird NUR EINMAL angezeigt!
   * Der User muss ihn sicher speichern.
   */
  @ApiProperty({
    description: 'Access-Token (nur einmal sichtbar!)',
    example: 'blh_ckpf2xrkc0001zyp8jq8qzx9f',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  /**
   * Name des Tokens (immer "Initial Setup Token").
   */
  @ApiProperty({
    description: 'Name des Tokens',
    example: 'Initial Setup Token',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Erstellungszeitpunkt des Tokens (ISO-8601).
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt (ISO-8601)',
    example: '2026-01-06T12:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  createdAt!: string;
}

/**
 * DTO fuer den erstellten Invite-Code in der Setup-Response.
 *
 * **Sicherheitshinweis:**
 * Der Invite-Code wird im Klartext zurueckgegeben.
 * Dieser Code sollte an die ersten Nutzer weitergegeben werden,
 * damit diese sich registrieren koennen.
 */
export class SetupInviteCodeDto {
  /**
   * Der generierte 8-stellige Invite-Code.
   */
  @ApiProperty({
    description: '8-stelliger Invite-Code',
    example: 'ABC12345',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  /**
   * Ablaufdatum des Codes (ISO-8601).
   */
  @ApiProperty({
    description: 'Ablaufdatum (ISO-8601)',
    example: '2026-01-17T12:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  expiresAt!: string;

  /**
   * Maximale Anzahl erlaubter Nutzungen.
   */
  @ApiProperty({
    description: 'Maximale Nutzungen',
    example: 10,
  })
  maxUses!: number;

  /**
   * Label zur Identifizierung.
   */
  @ApiProperty({
    description: 'Label',
    example: 'Initial Setup Invite',
  })
  @IsString()
  label!: string;
}

/**
 * Response DTO fuer den erfolgreichen Server-Setup.
 *
 * Enthaelt sowohl den erstellten Admin-User als auch den
 * generierten Access-Token und einen initialen Invite-Code.
 * Der Token-Wert wird NUR in dieser Response zurueckgegeben
 * und kann spaeter nicht erneut abgerufen werden.
 *
 * **Verwendung im Controller:**
 * ```typescript
 * @ApiWrappedCreatedResponse(SetupResponseDto, {
 *   description: 'Setup erfolgreich abgeschlossen'
 * })
 * async completeSetup(): Promise<WrappedResponse<SetupResponseDto>>
 * ```
 */
export class SetupResponseDto {
  /**
   * Informationen zum erstellten Admin-User.
   */
  @ApiProperty({
    description: 'Erstellter Admin-User',
    type: SetupUserDto,
  })
  @ValidateNested()
  @Type(() => SetupUserDto)
  user!: SetupUserDto;

  /**
   * Generierter Access-Token (einmalig sichtbar!).
   */
  @ApiProperty({
    description: 'Generierter Access-Token',
    type: SetupTokenDto,
  })
  @ValidateNested()
  @Type(() => SetupTokenDto)
  accessToken!: SetupTokenDto;

  /**
   * Initial erstellter Invite-Code fuer erste Nutzer-Registrierungen.
   */
  @ApiProperty({
    description: 'Initialer Invite-Code',
    type: SetupInviteCodeDto,
  })
  @ValidateNested()
  @Type(() => SetupInviteCodeDto)
  inviteCode!: SetupInviteCodeDto;
}
