import type { UserRole } from '@/generated/prisma/client';

/**
 * Query zur fachlichen Autorisierung von Einsatz-Mutationen.
 *
 * Diese Query beantwortet die Frage, ob ein User einen Einsatz mutieren darf
 * (update/start/complete/archive).
 */
export class CanMutateEinsatzQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly userRole?: UserRole,
  ) {}
}
