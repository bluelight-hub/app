import type { BeteiligterProps } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import type { WoProps } from '@domain/eigenschutz/value-objects/wo.vo';

/**
 * Command für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.1, AC5).
 *
 * Trennung `vorfallZeit` vs. `wann` im Modell für Phase-2-Backdating; im
 * 5.1-Drawer sind beide identisch (UI sendet ein Feld). 5-Min-Future-Slack
 * gegen Wallclock-Drift wird im Aggregate enforced.
 */
export class ReportVorfallCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly einheitId: string,
    public readonly was: string,
    public readonly wann: Date,
    public readonly vorfallZeit: Date,
    public readonly wo: WoProps | null,
    public readonly beteiligte: BeteiligterProps[],
    public readonly massnahmen: string,
    public readonly unfallkasseRelevant: boolean,
    public readonly erfasstVonUserId: string,
  ) {}
}
