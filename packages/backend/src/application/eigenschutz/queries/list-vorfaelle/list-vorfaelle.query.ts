import type { VorfallListFilter } from '@domain/eigenschutz/repositories';

/**
 * Query für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.3, AC2). Liefert die kompakten Listen-Rows ohne `kontextSnapshot`.
 *
 * `EinsatzScopeGuard` ist die Membership-Defense — der Handler verlässt sich
 * darauf und führt keinen zusätzlichen `EinsatzTeilnehmer`-Lookup durch
 * (Pattern Story 4.1 `ListSicherungspostenHandler`, nicht Story 3.10).
 * Begründung: Permission `eigenschutz:vorfall:read` ist breit (alle Einsatz-
 * Rollen), Scope-Defense passiert bereits im Guard.
 */
export class ListVorfaelleQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly filter: VorfallListFilter,
    public readonly callerUserId: string,
  ) {}
}
