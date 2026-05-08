import type { IconType } from 'react-icons';
import { PiCheckCircle, PiQuestion, PiWarningCircle, PiWarningOctagon } from 'react-icons/pi';
import { AmpelProjectionDtoStatusEnum } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';

type AmpelStatusInput = AmpelProjectionDtoStatusEnum | string | null | undefined;

export interface AmpelStatusMeta {
  readonly label: 'Rot' | 'Gelb' | 'Grün' | 'Unbekannt';
  readonly icon: IconType;
  readonly rootClassName: string;
  readonly iconClassName: string;
}

export interface StatusIndicatorProps {
  readonly status: AmpelStatusInput;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export interface AmpelStatusAriaParts {
  readonly status: AmpelStatusInput;
  readonly offeneVorfaelle?: number;
  readonly ungeloesteRueckmeldungen?: number;
  readonly ausstehendeQuittungen?: number;
}

export interface QuittungsSummaryProps {
  readonly ausstehendePsaQuittungen: number;
  readonly ausstehendeRegelQuittungen: number;
  readonly className?: string;
}

const STATUS_META: Record<AmpelProjectionDtoStatusEnum, AmpelStatusMeta> = {
  [AmpelProjectionDtoStatusEnum.Rot]: {
    label: 'Rot',
    icon: PiWarningOctagon,
    rootClassName: 'border-status-danger-border bg-status-danger-surface text-status-danger-text ring-1 ring-status-danger-border',
    iconClassName: 'text-status-danger-text',
  },
  [AmpelProjectionDtoStatusEnum.Gelb]: {
    label: 'Gelb',
    icon: PiWarningCircle,
    rootClassName: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    iconClassName: 'text-status-warning-text',
  },
  [AmpelProjectionDtoStatusEnum.Gruen]: {
    label: 'Grün',
    icon: PiCheckCircle,
    rootClassName: 'border-status-success-border bg-status-success-surface text-status-success-text',
    iconClassName: 'text-status-success-text',
  },
};

export function getAmpelStatusMeta(status: AmpelStatusInput): AmpelStatusMeta {
  if (status === AmpelProjectionDtoStatusEnum.Rot || status === AmpelProjectionDtoStatusEnum.Gelb || status === AmpelProjectionDtoStatusEnum.Gruen) {
    return STATUS_META[status];
  }

  return {
    label: 'Unbekannt',
    icon: PiQuestion,
    rootClassName: 'border-status-danger-border bg-status-danger-surface text-status-danger-text ring-1 ring-status-danger-border',
    iconClassName: 'text-status-danger-text',
  };
}

export function StatusIndicator({ status, ariaLabel, className }: StatusIndicatorProps) {
  const meta = getAmpelStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      aria-label={ariaLabel ?? `Status ${meta.label}`}
      className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold motion-reduce:transition-none', meta.rootClassName, className)}
    >
      <Icon data-testid="ampel-status-icon" aria-hidden="true" className={cn('h-4 w-4 shrink-0', meta.iconClassName)} />
      <span>{meta.label}</span>
    </span>
  );
}

export function buildAmpelStatusAriaLabel({ status, offeneVorfaelle = 0, ungeloesteRueckmeldungen = 0, ausstehendeQuittungen = 0 }: AmpelStatusAriaParts): string {
  const parts = [`Status ${getAmpelStatusMeta(status).label}`];
  const counters: string[] = [];

  if (offeneVorfaelle > 0) {
    counters.push(`${offeneVorfaelle} offene${offeneVorfaelle === 1 ? 'r' : ''} Vorf${offeneVorfaelle === 1 ? 'all' : 'älle'}`);
  }
  if (ungeloesteRueckmeldungen > 0) {
    counters.push(`${ungeloesteRueckmeldungen} ungelöste Rückmeldung${ungeloesteRueckmeldungen === 1 ? '' : 'en'}`);
  }
  if (ausstehendeQuittungen > 0) {
    counters.push(`${ausstehendeQuittungen} ausstehende Quittung${ausstehendeQuittungen === 1 ? '' : 'en'}`);
  }

  return counters.length > 0 ? `${parts[0]}: ${counters.join(', ')}` : parts[0];
}

export function QuittungsSummary({ ausstehendePsaQuittungen, ausstehendeRegelQuittungen, className }: QuittungsSummaryProps) {
  const psa = toNonNegativeInteger(ausstehendePsaQuittungen);
  const regeln = toNonNegativeInteger(ausstehendeRegelQuittungen);
  const total = psa + regeln;
  const label = total === 0 ? 'Quittiert' : `${total} ausstehend`;
  const ariaLabel = total === 0 ? 'Keine ausstehenden Quittungen' : `${total} ausstehende Quittungen: ${psa} PSA, ${regeln} Sicherheitsregel${regeln === 1 ? '' : 'n'}`;

  return (
    <span
      data-testid="ampel-quittungs-summary"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-sm font-medium',
        total === 0 ? 'border-status-success-border bg-status-success-surface text-status-success-text' : 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
        className,
      )}
    >
      {label}
    </span>
  );
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
