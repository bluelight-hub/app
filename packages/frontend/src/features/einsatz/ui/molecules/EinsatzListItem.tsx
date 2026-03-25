import { EinsatzStatus, EinsatzStatusBadge } from '@/features/einsatz/ui/molecules/einsatz-status-badge.molecule';
import { useActiveEinsatz } from '@/features/einsatz';
import { formatNatoDateTime } from '@/shared/lib/dateFormatter';
import type { EinsatzListItemDto, EinsatzResponseDto } from '@/shared';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';
import { PiBookOpen, PiClock, PiMapPin } from 'react-icons/pi';

interface EinsatzListItemProps {
  einsatz: EinsatzResponseDto | EinsatzListItemDto;
}

export const EinsatzListItem = ({ einsatz }: EinsatzListItemProps) => {
  const { activeEinsatz } = useActiveEinsatz();
  const isCurrentlyActive = activeEinsatz?.id === einsatz.id;
  const einsatzortLabel = [einsatz.einsatzort?.strasse, einsatz.einsatzort?.ort].filter(Boolean).join(', ');

  // Extract counts if available (present in EinsatzListItemDto)
  const etbEintraegeCount = 'etbEintraegeCount' in einsatz ? einsatz.etbEintraegeCount : undefined;
  const poisCount = 'poisCount' in einsatz ? einsatz.poisCount : undefined;

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.18em] text-text-secondary uppercase">{einsatz.nummer}</span>
            {isCurrentlyActive && (
              <Badge size="sm" className="border border-status-success-border bg-status-success-surface text-status-success-text">
                Im Fokus
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <h3 className="line-clamp-2 text-title-sm font-semibold text-text-primary sm:line-clamp-1">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h3>
              {einsatzortLabel ? <p className="line-clamp-1 text-body-sm text-text-secondary">{einsatzortLabel}</p> : null}
            </div>
            <EinsatzStatusBadge status={einsatz.status || EinsatzStatus.ANGELEGT} size="sm" className="w-fit shrink-0" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MetadataPill icon={<PiClock className="h-3.5 w-3.5" />}>{formatNatoDateTime(einsatz.createdAt)}</MetadataPill>

          {etbEintraegeCount !== undefined && <MetadataPill icon={<PiBookOpen className="h-3.5 w-3.5" />}>ETB {etbEintraegeCount}</MetadataPill>}

          {poisCount !== undefined && <MetadataPill icon={<PiMapPin className="h-3.5 w-3.5" />}>POIs {poisCount}</MetadataPill>}
        </div>
      </div>
    </div>
  );
};

interface MetadataPillProps {
  children: React.ReactNode;
  icon: React.ReactNode;
}

function MetadataPill({ children, icon }: MetadataPillProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-pill border border-border-subtle bg-surface-raised px-2.5 py-1', 'text-[11px] font-medium text-text-secondary shadow-sm')}>
      <span className="text-text-muted">{icon}</span>
      <span>{children}</span>
    </span>
  );
}
