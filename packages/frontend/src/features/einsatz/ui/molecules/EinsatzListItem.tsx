import { EinsatzStatus, EinsatzStatusBadge } from '@/features/einsatz/ui/molecules/einsatz-status-badge.molecule';
import { useActiveEinsatz } from '@/features/einsatz';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDisplayDateTime } from '@/shared/lib/dateFormatter';
import type { EinsatzListItemDto, EinsatzResponseDto } from '@/shared';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { PiArrowRight, PiBookOpen, PiClock, PiMapPin, PiRadio } from 'react-icons/pi';

interface EinsatzListItemProps {
  einsatz: EinsatzResponseDto | EinsatzListItemDto;
}

function getAlarmstichwortLabel(einsatz: EinsatzResponseDto | EinsatzListItemDto): string {
  return typeof einsatz.alarmstichwort === 'string' && einsatz.alarmstichwort.trim().length > 0 ? einsatz.alarmstichwort : 'Kein Alarmstichwort';
}

function getLocationLabel(einsatz: EinsatzResponseDto | EinsatzListItemDto): string {
  const einsatzort = einsatz.einsatzort;

  if (einsatzort && typeof einsatzort === 'object' && 'ort' in einsatzort && typeof einsatzort.ort === 'string' && einsatzort.ort.trim().length > 0) {
    return einsatzort.ort;
  }

  return 'Ort wird nachgereicht';
}

export const EinsatzListItem = ({ einsatz }: EinsatzListItemProps) => {
  const { activeEinsatz } = useActiveEinsatz();
  const isCurrentlyActive = activeEinsatz?.id === einsatz.id;

  const etbEintraegeCount = 'etbEintraegeCount' in einsatz ? einsatz.etbEintraegeCount : undefined;
  const poisCount = 'poisCount' in einsatz ? einsatz.poisCount : undefined;
  const hasEtbCount = typeof etbEintraegeCount === 'number' && etbEintraegeCount > 0;
  const hasPoiCount = typeof poisCount === 'number' && poisCount > 0;
  const createdAt = typeof einsatz.createdAt === 'string' ? parseISO(einsatz.createdAt) : einsatz.createdAt;
  const hasValidCreatedAt = isValid(createdAt);
  const relativeTimestamp = hasValidCreatedAt ? formatDistanceToNow(createdAt, { addSuffix: true, locale: de }) : 'Zeitpunkt unbekannt';
  const absoluteTimestamp = formatDisplayDateTime(einsatz.createdAt) || 'Zeitpunkt unbekannt';
  const locationLabel = getLocationLabel(einsatz);
  const alarmstichwortLabel = getAlarmstichwortLabel(einsatz);
  const actionLabel = isCurrentlyActive ? 'Weiterarbeiten' : 'Öffnen';

  return (
    <Link aria-label={`Einsatz ${einsatz.nummer} öffnen`} params={{ einsatzId: einsatz.id }} to="/app/einsatz/$einsatzId" className="group block focus-visible:outline-none">
      <article
        className={cn(
          'relative isolate grid gap-4 overflow-hidden px-5 py-5 transition-[background-color,color,box-shadow] duration-150',
          'focus-within:bg-slate-50/85 hover:bg-slate-50/85 sm:px-6 lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.4fr)_auto] lg:items-center dark:hover:bg-slate-900/55 dark:focus-within:bg-slate-900/55',
          'before:absolute before:top-4 before:bottom-4 before:left-0 before:w-1 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity',
          isCurrentlyActive && 'bg-accent/80 ring-1 ring-primary/20 ring-inset before:opacity-100 dark:bg-accent/55 dark:ring-primary/25',
        )}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">{einsatz.nummer}</span>
            {isCurrentlyActive ? (
              <Badge variant="outline" className="gap-1 border-primary/25 bg-background/85 text-primary shadow-xs dark:bg-background/60">
                <PiRadio className="size-3.5" />
                Aktiver Kontext
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base text-foreground transition-colors group-hover:text-primary">{alarmstichwortLabel}</h3>
            <EinsatzStatusBadge status={einsatz.status || EinsatzStatus.ANGELEGT} size="sm" />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2">
              <PiMapPin className="size-4" />
              <span className="font-medium text-foreground">{locationLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <PiClock className="size-4" />
              <span>
                {relativeTimestamp}
                <span className="mx-2 text-border">•</span>
                {absoluteTimestamp}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {hasEtbCount ? (
            <Badge variant="outline" className="gap-1 bg-background/75 dark:bg-background/20">
              <PiBookOpen className="size-3.5" />
              {etbEintraegeCount} ETB
            </Badge>
          ) : null}
          {hasPoiCount ? (
            <Badge variant="outline" className="gap-1 bg-background/75 dark:bg-background/20">
              <PiMapPin className="size-3.5" />
              {poisCount} POI
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-sm lg:min-w-[10rem] lg:justify-end">
          <span className={cn('text-muted-foreground', isCurrentlyActive && 'font-medium text-foreground/80')}>{isCurrentlyActive ? 'Aktiver Arbeitsbereich' : 'Direkter Einstieg'}</span>
          <span className="ml-4 inline-flex items-center gap-2 font-semibold text-foreground transition-colors group-hover:text-primary">
            {actionLabel}
            <PiArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
};
