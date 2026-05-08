import { Link } from '@tanstack/react-router';
import { PiClockCountdown, PiWarningOctagon } from 'react-icons/pi';
import type { AmpelWarnBadgeDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';

export interface AmpelWarnBadgeListProps {
  readonly einsatzId: string;
  readonly badges: readonly AmpelWarnBadgeDto[];
  readonly einheitName: string;
  readonly maxVisible?: number;
  readonly variant?: 'card' | 'panel' | 'compact';
  readonly className?: string;
}

export function AmpelWarnBadgeList({ einsatzId, badges, einheitName, maxVisible = 3, variant = 'card', className }: AmpelWarnBadgeListProps) {
  const normalized = badges.filter(isKnownBadge).sort(compareBadges);
  if (normalized.length === 0) return null;

  if (variant === 'compact') {
    return (
      <span
        data-testid="ampel-warn-compact"
        className={cn(
          'inline-flex min-w-0 shrink-0 items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text',
          className,
        )}
        aria-label={`${normalized.length} Warnung${normalized.length === 1 ? '' : 'en'} für ${einheitName}`}
      >
        <PiWarningOctagon aria-hidden className="size-3.5 shrink-0" />
        <span className="tabular-nums">{normalized.length}</span>
      </span>
    );
  }

  const visible = normalized.slice(0, maxVisible);
  const hiddenCount = Math.max(0, normalized.length - visible.length);

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-2', className)} aria-label={`Warnungen für ${einheitName}`} data-testid="ampel-warn-badge-list">
      {visible.map((badge) => (
        <WarnBadgeLink key={badge.id} einsatzId={einsatzId} badge={badge} compact={variant === 'card'} />
      ))}
      {hiddenCount > 0 ? (
        <span
          className="inline-flex min-h-8 items-center rounded-full border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-muted"
          aria-label={`${hiddenCount} weitere Warnung${hiddenCount === 1 ? '' : 'en'} für ${einheitName}`}
        >
          +{hiddenCount} weitere
        </span>
      ) : null}
    </div>
  );
}

export function formatOverdueDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return '00:00';
  const total = Math.floor(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function WarnBadgeLink({ einsatzId, badge, compact }: { readonly einsatzId: string; readonly badge: AmpelWarnBadgeDto; readonly compact: boolean }) {
  const Icon = badge.type === 'PSA_QUITTUNG_UEBERFAELLIG' ? PiClockCountdown : PiWarningOctagon;
  const label = badge.type === 'PSA_QUITTUNG_UEBERFAELLIG' ? `Quittung überfällig (${formatOverdueDuration(badge.ueberfaelligSeitMin)})` : 'Gefährdung ohne Schutzmaßnahme';

  const className = cn(
    'inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control border border-status-warning-border bg-status-warning-surface px-2.5 py-1.5 text-sm font-medium text-status-warning-text transition-colors hover:bg-status-warning-surface/80 focus-visible:shadow-focus-ring focus-visible:outline-none motion-reduce:transition-none',
    compact && 'px-2 text-xs',
  );

  if (badge.type === 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME' && badge.gefaehrdungsbeurteilungId) {
    return (
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id"
        params={{ einsatzId, id: badge.gefaehrdungsbeurteilungId }}
        search={badge.gefaehrdungItemId ? { focusItem: badge.gefaehrdungItemId } : undefined}
        className={className}
        aria-label={badge.gefaehrdungTitel ? `${label}: ${badge.gefaehrdungTitel}` : label}
      >
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    );
  }

  if (badge.type === 'PSA_QUITTUNG_UEBERFAELLIG' && badge.propagationGroupId) {
    return (
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile"
        params={{ einsatzId }}
        search={{ focusGroup: badge.propagationGroupId, einheitId: badge.einheitId }}
        className={className}
        aria-label={label}
      >
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    );
  }

  return (
    <span className={className} aria-label="Warnung">
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">Warnung</span>
    </span>
  );
}

function isKnownBadge(badge: AmpelWarnBadgeDto): boolean {
  return badge.type === 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME' || badge.type === 'PSA_QUITTUNG_UEBERFAELLIG';
}

function compareBadges(left: AmpelWarnBadgeDto, right: AmpelWarnBadgeDto): number {
  if (left.sortRank !== right.sortRank) return left.sortRank - right.sortRank;
  const recency = toTime(right.occurredAt) - toTime(left.occurredAt);
  if (recency !== 0) return recency;
  return left.id.localeCompare(right.id);
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}
