/**
 * Status-Filter für die Sicherungsposten-Liste (Story 4.1, AC7).
 *
 * Spiegelt das Shared-Zod-Schema `sicherungspostenStatusSchema` aus
 * `@bluelight-hub/shared/schemas`. Backend deklariert den Type lokal, weil
 * der Cross-Package-ESM-Import in `query`-Dateien aktuell vom Backend-TS-
 * Setup nicht aufgelöst wird (vgl. `application/admin/dto/complete-setup.dto.ts`).
 */
export type SicherungspostenQueryStatus = 'AKTIV' | 'AUFGELOEST';

/**
 * Query für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten?status=AKTIV|AUFGELOEST`
 * (Story 4.1, AC7).
 */
export class ListSicherungspostenQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly status: SicherungspostenQueryStatus,
  ) {}
}
