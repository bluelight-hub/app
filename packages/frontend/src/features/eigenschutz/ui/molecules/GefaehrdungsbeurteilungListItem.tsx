/**
 * GefaehrdungsbeurteilungListItem — kompakte Listenkarte für die
 * Gefährdungsbeurteilungs-Übersicht.
 */

import { calculateRisikoklasse } from '@bluelight-hub/shared';
import type { Gefaehrdungsbeurteilung, GefaehrdungItem, Risikoklasse } from '@bluelight-hub/shared/schemas';
import { cn } from '@/shared/ui/cn';
import { PiCaretRight, PiListChecks } from 'react-icons/pi';

export interface GefaehrdungsbeurteilungListItemProps {
  readonly beurteilung: Gefaehrdungsbeurteilung;
  readonly einheitName: string;
  readonly onClick: () => void;
}

const RISIKOKLASSE_BADGE_STYLES: Record<Risikoklasse, string> = {
  GRUEN: 'bg-green-100 text-green-900',
  GELB: 'bg-yellow-100 text-yellow-900',
  ORANGE: 'bg-orange-200 text-orange-900',
  ROT: 'bg-red-200 text-red-900',
};

const RISIKOKLASSE_LABELS: Record<Risikoklasse, string> = {
  GRUEN: 'Grün',
  GELB: 'Gelb',
  ORANGE: 'Orange',
  ROT: 'Rot',
};

const RISIKOKLASSE_RANK: Record<Risikoklasse, number> = {
  GRUEN: 1,
  GELB: 2,
  ORANGE: 3,
  ROT: 4,
};

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function resolveRisikoklasse(item: GefaehrdungItem): Risikoklasse | null {
  if (item.risikoklasse) return item.risikoklasse;
  if (!item.eintritt || !item.schaden) return null;
  return calculateRisikoklasse(item.eintritt, item.schaden);
}

function getHighestRisikoklasse(items: readonly GefaehrdungItem[]): Risikoklasse | null {
  let highest: Risikoklasse | null = null;
  for (const item of items) {
    const next = resolveRisikoklasse(item);
    if (!next) continue;
    if (!highest || RISIKOKLASSE_RANK[next] > RISIKOKLASSE_RANK[highest]) {
      highest = next;
    }
  }
  return highest;
}

export function GefaehrdungsbeurteilungListItem({ beurteilung, einheitName, onClick }: GefaehrdungsbeurteilungListItemProps) {
  const itemCount = beurteilung.items.length;
  const highestRisikoklasse = getHighestRisikoklasse(beurteilung.items);
  const itemCountLabel = itemCount === 1 ? '1 Gefährdung' : `${itemCount} Gefährdungen`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-panel border border-border-subtle bg-surface-panel p-4 text-left transition-colors hover:border-action-primary hover:bg-action-secondary focus:outline-none focus-visible:shadow-focus-ring"
      data-testid={`gefaehrdungen-list-item-${beurteilung.id}`}
    >
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-secondary text-action-primary">
        <PiListChecks className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">{einheitName}</span>
          <span className="inline-flex items-center rounded-control bg-action-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">Version {beurteilung.version}</span>
          {highestRisikoklasse ? (
            <span className={cn('inline-flex items-center rounded-control px-2 py-0.5 text-xs font-semibold', RISIKOKLASSE_BADGE_STYLES[highestRisikoklasse])}>
              {RISIKOKLASSE_LABELS[highestRisikoklasse]}
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{itemCountLabel}</span>
          <span>Aktualisiert {formatDateTime(beurteilung.aktualisiertAm)}</span>
        </span>
      </span>
      <PiCaretRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}
