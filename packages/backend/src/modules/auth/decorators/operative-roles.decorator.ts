import { SetMetadata } from '@nestjs/common';
import type { OperativeRole } from '@/generated/prisma/client';

export const OPERATIVE_ROLES_KEY = 'operativeRoles';

/**
 * Decorator zum Festlegen erforderlicher operativer Rollen für Endpunkte.
 *
 * @example
 * ```typescript
 * @RequiresOperativeRole('FUEHRUNGSKRAFT')
 * @UseGuards(JwtAuthGuard, OperativeRoleGuard)
 * async archiveEinsatz() { ... }
 * ```
 */
export const RequiresOperativeRole = (...roles: OperativeRole[]) => SetMetadata(OPERATIVE_ROLES_KEY, roles);
