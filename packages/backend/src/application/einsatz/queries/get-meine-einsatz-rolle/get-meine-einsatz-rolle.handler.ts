import { Inject, Injectable } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import type { IEinsatzRollenReadRepository } from '@domain/repositories/i-einsatz-rollen-read.repository';
import { EINSATZ_ROLLEN_READ_REPOSITORY } from '@infrastructure/di-tokens';
import { MeineEinsatzRolleEnum } from '@/application/einsatz/dto/meine-einsatz-rolle.dto';
import type { MeineEinsatzRolleDto, BefehlPermissionsDto } from '@/application/einsatz/dto/meine-einsatz-rolle.dto';
import { GetMeineEinsatzRolleQuery } from './get-meine-einsatz-rolle.query';

/**
 * Permissions-Mapping pro EinsatzRolle.
 *
 * Story 4.3 AC1: Rollenabhaengige Berechtigungen.
 * Identisch zum Frontend-Mapping (use-befehl-permissions.ts).
 */
const ROLLE_PERMISSIONS: Record<string, BefehlPermissionsDto> = {
  BEFEHLSGEBER: {
    canCreate: true,
    canQuittieren: true,
    canKorrigieren: true,
    canManageStatus: true,
    canExport: true,
    canViewAll: true,
    isBeobachter: false,
    canEditEtb: true,
    canEditPinnwand: true,
    isSecondaryRole: false,
  },
  ERSTELLER: {
    canCreate: true,
    canQuittieren: false,
    canKorrigieren: false,
    canManageStatus: true,
    canExport: true,
    canViewAll: true,
    isBeobachter: false,
    canEditEtb: true,
    canEditPinnwand: true,
    isSecondaryRole: false,
  },
  EMPFAENGER: {
    canCreate: false,
    canQuittieren: true,
    canKorrigieren: false,
    canManageStatus: false,
    canExport: false,
    canViewAll: false,
    isBeobachter: false,
    canEditEtb: false,
    canEditPinnwand: false,
    isSecondaryRole: true,
  },
  BEOBACHTER: {
    canCreate: false,
    canQuittieren: false,
    canKorrigieren: false,
    canManageStatus: false,
    canExport: false,
    canViewAll: true,
    isBeobachter: true,
    canEditEtb: false,
    canEditPinnwand: false,
    isSecondaryRole: true,
  },
};

/** Volle Permissions fuer Admin/SuperAdmin. */
const ADMIN_PERMISSIONS: BefehlPermissionsDto = {
  canCreate: true,
  canQuittieren: true,
  canKorrigieren: true,
  canManageStatus: true,
  canExport: true,
  canViewAll: true,
  isBeobachter: false,
  canEditEtb: true,
  canEditPinnwand: true,
  isSecondaryRole: false,
};

/** Keine Permissions (kein Zugang). */
const NO_PERMISSIONS: BefehlPermissionsDto = {
  canCreate: false,
  canQuittieren: false,
  canKorrigieren: false,
  canManageStatus: false,
  canExport: false,
  canViewAll: false,
  isBeobachter: false,
  canEditEtb: false,
  canEditPinnwand: false,
  isSecondaryRole: false,
};

/**
 * Handler fuer GetMeineEinsatzRolleQuery.
 *
 * CQRS Query-Side: Read-Only, Repository Port (kein Prisma-Direktzugriff).
 *
 * Story 4.3 AC1: Liefert die eigene Rolle + abgeleitete Permissions.
 */
@QueryHandler(GetMeineEinsatzRolleQuery)
@Injectable()
export class GetMeineEinsatzRolleQueryHandler implements IQueryHandler<GetMeineEinsatzRolleQuery, Result<MeineEinsatzRolleDto>> {
  constructor(
    @Inject(EINSATZ_ROLLEN_READ_REPOSITORY)
    private readonly rollenRepository: IEinsatzRollenReadRepository,
  ) {}

  async execute(query: GetMeineEinsatzRolleQuery): Promise<Result<MeineEinsatzRolleDto>> {
    try {
      // Admin/SuperAdmin pruefen: erhalten immer volle Permissions.
      // Nutzt userRole aus JWT wenn verfuegbar (spart DB-Abfrage).
      if (query.userRole === 'ADMIN' || query.userRole === 'SUPER_ADMIN') {
        return Result.ok<MeineEinsatzRolleDto>({
          rolle: query.userRole as MeineEinsatzRolleEnum,
          permissions: ADMIN_PERMISSIONS,
        });
      }

      // Rollenzuweisung fuer diesen Einsatz laden
      const rolleResult = await this.rollenRepository.findMeineRolle(query.einsatzId, query.userId);

      if (rolleResult.isFailure) {
        return Result.fail<MeineEinsatzRolleDto>(rolleResult.error ?? 'Rollen-Abfrage fehlgeschlagen');
      }

      const rolle = rolleResult.value?.rolle ?? null;

      if (!rolle) {
        // Pruefen ob das Rollensystem fuer diesen Einsatz ueberhaupt aktiv ist.
        // Wenn KEINE Zuweisungen existieren → Rollen nicht konfiguriert → volle Permissions.
        // Wenn Zuweisungen existieren, aber nicht fuer diesen User → keine Permissions.
        const hasAnyResult = await this.rollenRepository.hasAnyRollen(query.einsatzId);
        const rollenConfigured = hasAnyResult.isSuccess && hasAnyResult.value === true;

        return Result.ok<MeineEinsatzRolleDto>({
          rolle: null,
          permissions: rollenConfigured ? NO_PERMISSIONS : ADMIN_PERMISSIONS,
        });
      }

      const permissions = ROLLE_PERMISSIONS[rolle] ?? NO_PERMISSIONS;

      return Result.ok<MeineEinsatzRolleDto>({
        rolle: rolle as MeineEinsatzRolleEnum,
        permissions,
      });
    } catch (error) {
      return Result.fail<MeineEinsatzRolleDto>(`Rollen-Abfrage fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
