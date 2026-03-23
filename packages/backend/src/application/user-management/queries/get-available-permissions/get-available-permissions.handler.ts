import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AvailablePermissionDto } from '@application/user-management/dto/available-permission.dto';
import { GetAvailablePermissionsQuery } from './get-available-permissions.query';

/**
 * Statische Definition aller verfuegbaren Permission-Domains.
 *
 * Diese Liste definiert welche Permissions im System vergeben werden koennen.
 */
const AVAILABLE_PERMISSIONS: AvailablePermissionDto[] = [
  {
    domain: 'nav',
    actions: ['ueberblick', 'etb', 'befehle', 'stammdaten', 'berechtigungen', 'integrationen'],
    description: 'Navigationsbereiche',
  },
  {
    domain: 'einsatz',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Einsatz-Verwaltung',
  },
  {
    domain: 'user',
    actions: ['create', 'read', 'update', 'delete', 'lock', 'unlock'],
    description: 'Benutzer-Verwaltung',
  },
  {
    domain: 'fahrzeug',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Fahrzeug-Verwaltung',
  },
  {
    domain: 'dienst',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Dienst-Verwaltung',
  },
  {
    domain: 'etb',
    actions: ['create', 'read', 'update', 'lock'],
    description: 'Einsatztagebuch',
  },
];

/**
 * Query Handler fuer GetAvailablePermissionsQuery.
 *
 * Gibt eine statische Liste aller definierbaren Permission-Patterns zurueck.
 */
@QueryHandler(GetAvailablePermissionsQuery)
@Injectable()
export class GetAvailablePermissionsQueryHandler implements IQueryHandler<GetAvailablePermissionsQuery, Result<AvailablePermissionDto[]>> {
  async execute(_query: GetAvailablePermissionsQuery): Promise<Result<AvailablePermissionDto[]>> {
    return Result.ok<AvailablePermissionDto[]>(AVAILABLE_PERMISSIONS);
  }
}
