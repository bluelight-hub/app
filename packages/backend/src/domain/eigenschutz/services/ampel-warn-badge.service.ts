export type AmpelWarnBadgeType = 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME' | 'PSA_QUITTUNG_UEBERFAELLIG';

export interface GefaehrdungWarnCandidate {
  einsatzId: string;
  einheitId: string;
  gefaehrdungsbeurteilungId: string;
  gefaehrdungItemId: string | null;
  gefaehrdungItemFallbackKey?: string | null;
  gefaehrdungTitel: string;
  risikoklasse: unknown;
  schutzmassnahmen?: unknown;
  aktualisiertAm?: Date;
}

export interface PsaWarnCandidate {
  einsatzId: string;
  einheitId: string;
  propagationGroupId: string;
  ueberfaelligSeitMin: number | null;
  occurredAt: Date;
}

export interface AmpelWarnBadge {
  id: string;
  einsatzId: string;
  einheitId: string;
  type: AmpelWarnBadgeType;
  label: string;
  sortRank: number;
  occurredAt: string;
  gefaehrdungsbeurteilungId?: string | null;
  gefaehrdungItemId?: string | null;
  gefaehrdungTitel?: string | null;
  propagationGroupId?: string | null;
  ueberfaelligSeitMin?: number | null;
}

export interface BuildAmpelWarnBadgesInput {
  gefaehrdungen: GefaehrdungWarnCandidate[];
  psa: PsaWarnCandidate[];
  now?: Date;
  maxTotal?: number;
  maxPerEinheit?: number;
}

const DEFAULT_MAX_TOTAL = 100;
const DEFAULT_MAX_PER_EINHEIT = 20;
const PSA_MIN_OVERDUE_MINUTES = 5;

/**
 * Pure Ableitungslogik für Ampel-Warnmarkierungen.
 *
 * Der Service bleibt bewusst ohne NestJS/Prisma-Abhängigkeiten, damit die
 * Predicate für Warn-Badges und AmpelProjection in Domain-Tests identisch
 * gepinnt werden kann.
 */
export class AmpelWarnBadgeService {
  isGefaehrdungOhneSchutzmassnahme(candidate: Pick<GefaehrdungWarnCandidate, 'risikoklasse' | 'schutzmassnahmen'>): boolean {
    const schutzmassnahmen = typeof candidate.schutzmassnahmen === 'string' ? candidate.schutzmassnahmen.trim() : '';
    return candidate.risikoklasse === 'ROT' && schutzmassnahmen.length === 0;
  }

  buildBadges(input: BuildAmpelWarnBadgesInput): AmpelWarnBadge[] {
    const now = input.now ?? new Date();
    const badges = [...this.buildGefaehrdungsBadges(input.gefaehrdungen), ...this.buildPsaBadges(input.psa, now)].sort((a, b) => this.compareBadges(a, b));
    return this.applyCaps(badges, input.maxTotal ?? DEFAULT_MAX_TOTAL, input.maxPerEinheit ?? DEFAULT_MAX_PER_EINHEIT);
  }

  private buildGefaehrdungsBadges(candidates: GefaehrdungWarnCandidate[]): AmpelWarnBadge[] {
    return candidates
      .filter((candidate) => this.isGefaehrdungOhneSchutzmassnahme(candidate))
      .map((candidate) => {
        const itemId = candidate.gefaehrdungItemId?.trim() || null;
        const itemKey = itemId ?? candidate.gefaehrdungItemFallbackKey?.trim() ?? 'unknown';
        const occurredAt = candidate.aktualisiertAm ?? new Date(0);
        return {
          id: `gefahr:${candidate.gefaehrdungsbeurteilungId}:${itemKey}`,
          einsatzId: candidate.einsatzId,
          einheitId: candidate.einheitId,
          type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME',
          label: 'Gefährdung ohne Schutzmaßnahme',
          sortRank: 10,
          occurredAt: occurredAt.toISOString(),
          gefaehrdungsbeurteilungId: candidate.gefaehrdungsbeurteilungId,
          gefaehrdungItemId: itemId,
          gefaehrdungTitel: candidate.gefaehrdungTitel,
        };
      });
  }

  private buildPsaBadges(candidates: PsaWarnCandidate[], now: Date): AmpelWarnBadge[] {
    return candidates
      .map((candidate) => ({ candidate, overdueMinutes: this.resolveOverdueMinutes(candidate, now) }))
      .filter(({ overdueMinutes }) => overdueMinutes >= PSA_MIN_OVERDUE_MINUTES)
      .map(({ candidate, overdueMinutes }) => ({
        id: `psa:${candidate.propagationGroupId}:${candidate.einheitId}`,
        einsatzId: candidate.einsatzId,
        einheitId: candidate.einheitId,
        type: 'PSA_QUITTUNG_UEBERFAELLIG',
        label: 'Quittung überfällig',
        sortRank: 20,
        occurredAt: candidate.occurredAt.toISOString(),
        propagationGroupId: candidate.propagationGroupId,
        ueberfaelligSeitMin: overdueMinutes,
      }));
  }

  private resolveOverdueMinutes(candidate: PsaWarnCandidate, now: Date): number {
    if (Number.isFinite(candidate.ueberfaelligSeitMin) && candidate.ueberfaelligSeitMin !== null && candidate.ueberfaelligSeitMin >= 0) {
      return Math.floor(candidate.ueberfaelligSeitMin);
    }
    const diffMs = now.getTime() - candidate.occurredAt.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
    return Math.floor(diffMs / 60_000);
  }

  private compareBadges(a: AmpelWarnBadge, b: AmpelWarnBadge): number {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    const recencyDiff = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
    if (recencyDiff !== 0) return recencyDiff;
    return a.id.localeCompare(b.id);
  }

  private applyCaps(badges: AmpelWarnBadge[], maxTotal: number, maxPerEinheit: number): AmpelWarnBadge[] {
    const byEinheit = new Map<string, AmpelWarnBadge[]>();
    for (const badge of badges) {
      const list = byEinheit.get(badge.einheitId) ?? [];
      list.push(badge);
      byEinheit.set(badge.einheitId, list);
    }
    return [...byEinheit.values()]
      .flatMap((badgesForEinheit) => this.capEinheitBadges(badgesForEinheit, maxPerEinheit))
      .sort((a, b) => this.compareBadges(a, b))
      .slice(0, maxTotal);
  }

  private capEinheitBadges(badges: AmpelWarnBadge[], maxPerEinheit: number): AmpelWarnBadge[] {
    if (badges.length <= maxPerEinheit) return badges;

    const selected = badges.slice(0, maxPerEinheit);
    const selectedTypes = new Set(selected.map((badge) => badge.type));
    const availableTypes = new Set(badges.map((badge) => badge.type));

    for (const type of availableTypes) {
      if (selectedTypes.has(type)) continue;
      const replacement = badges.find((badge) => badge.type === type);
      const replaceIndex = this.findReplaceableBadgeIndex(selected);
      if (!replacement || replaceIndex === -1) continue;
      selected[replaceIndex] = replacement;
      selectedTypes.add(type);
    }

    return selected.sort((a, b) => this.compareBadges(a, b));
  }

  private findReplaceableBadgeIndex(badges: AmpelWarnBadge[]): number {
    const counts = new Map<AmpelWarnBadgeType, number>();
    for (const badge of badges) {
      counts.set(badge.type, (counts.get(badge.type) ?? 0) + 1);
    }

    for (let index = badges.length - 1; index >= 0; index -= 1) {
      const badge = badges[index];
      if (badge && (counts.get(badge.type) ?? 0) > 1) return index;
    }
    return -1;
  }
}
