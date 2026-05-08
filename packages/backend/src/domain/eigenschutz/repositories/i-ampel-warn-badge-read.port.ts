import type { Result } from '@domain/common/result';
import type { GefaehrdungWarnCandidate, PsaWarnCandidate } from '@domain/eigenschutz/services/ampel-warn-badge.service';

export interface AmpelWarnBadgeCandidates {
  gefaehrdungen: GefaehrdungWarnCandidate[];
  psa: PsaWarnCandidate[];
}

export interface IAmpelWarnBadgeReadPort {
  listCandidatesByEinsatz(einsatzId: string): Promise<Result<AmpelWarnBadgeCandidates>>;
}
