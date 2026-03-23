import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum fuer alle moeglichen Rollen-Werte im MeineEinsatzRolle-Response.
 *
 * Story 4.3 AC1: Umfasst sowohl Einsatz-Rollen (BEFEHLSGEBER, ERSTELLER, EMPFAENGER, BEOBACHTER)
 * als auch System-Rollen (ADMIN, SUPER_ADMIN), die volle Permissions erhalten.
 */
export enum MeineEinsatzRolleEnum {
  BEFEHLSGEBER = 'BEFEHLSGEBER',
  ERSTELLER = 'ERSTELLER',
  EMPFAENGER = 'EMPFAENGER',
  BEOBACHTER = 'BEOBACHTER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Response DTO fuer die eigene Rolle + Permissions im Einsatz.
 *
 * Story 4.3 AC1: GET /api/v-alpha/einsaetze/:id/meine-rolle
 */
export class BefehlPermissionsDto {
  @ApiProperty({ description: 'Darf Befehle erstellen' })
  canCreate!: boolean;

  @ApiProperty({ description: 'Darf Befehle quittieren' })
  canQuittieren!: boolean;

  @ApiProperty({ description: 'Darf Befehle korrigieren' })
  canKorrigieren!: boolean;

  @ApiProperty({ description: 'Darf Empfaenger-Status verwalten' })
  canManageStatus!: boolean;

  @ApiProperty({ description: 'Darf Befehle exportieren' })
  canExport!: boolean;

  @ApiProperty({ description: 'Darf alle Befehle einsehen' })
  canViewAll!: boolean;

  @ApiProperty({ description: 'Ist nur Beobachter (read-only)' })
  isBeobachter!: boolean;
}

export class MeineEinsatzRolleDto {
  @ApiProperty({
    description: 'Zugewiesene Rolle im Einsatz (null wenn keine)',
    enum: MeineEinsatzRolleEnum,
    nullable: true,
    example: 'BEFEHLSGEBER',
  })
  rolle!: MeineEinsatzRolleEnum | null;

  @ApiProperty({
    description: 'Abgeleitete Berechtigungen basierend auf der Rolle',
    type: BefehlPermissionsDto,
  })
  permissions!: BefehlPermissionsDto;
}
