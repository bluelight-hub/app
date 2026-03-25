import { formatLastUsed } from '@/features/admin/lib/format-last-used';
import { InactivityBadge } from '../atoms/InactivityBadge';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type { TokenListItemDto } from '@/shared';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { MouseEvent, ReactNode } from 'react';
import { PiArrowCounterClockwise, PiArrowsClockwise, PiCalendar, PiClock, PiKey, PiProhibit } from 'react-icons/pi';

type TokenDisplayStatus = 'active' | 'revoked' | 'expired' | 'rotated' | 'replacement';

interface TokenListItemProps {
  /** Token-Daten aus der API */
  token: TokenListItemDto;
  /** Optionaler Klick-Handler für die gesamte Zeile */
  onClick?: () => void;
  /** Callback wenn "Deaktivieren" geklickt wird */
  onRevokeClick?: () => void;
  /** Callback wenn "Reaktivieren" geklickt wird */
  onReactivateClick?: () => void;
  /** Callback wenn "Rotieren" geklickt wird */
  onRotateClick?: () => void;
  /** Deaktiviert die Action-Buttons während einer laufenden Operation */
  isActionLoading?: boolean;
  /** Alle Tokens für Nachfolger-/Vorgänger-Lookup */
  allTokens?: TokenListItemDto[];
}

/** Formatiert ein ISO-Datum in deutsches Format (dd.MM.yyyy HH:mm). */
function formatDate(isoDate: string | Date | object): string {
  const date = isoDate instanceof Date ? isoDate : parseISO(String(isoDate));
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
}

/** Formatiert den Token-Prefix als maskierten String. */
function formatMaskedPrefix(prefix: string): string {
  return `${prefix}...`;
}

/** Ermittelt den erweiterten Anzeige-Status des Tokens. */
function getDisplayStatus(token: TokenListItemDto): TokenDisplayStatus {
  if (token.rotatedStatus === 'replacement') {
    return 'replacement';
  }

  if (token.rotatedStatus === 'rotated') {
    return 'rotated';
  }

  return token.status as TokenDisplayStatus;
}

/** Ermittelt die Badge-Variante basierend auf dem erweiterten Token-Status. */
function getStatusBadgeVariant(status: TokenDisplayStatus): 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'active':
    case 'replacement':
      return 'success';
    case 'revoked':
      return 'error';
    case 'rotated':
      return 'info';
    default:
      return 'warning';
  }
}

/** Gibt den deutschen Label-Text für den erweiterten Status zurück. */
function getStatusLabel(status: TokenDisplayStatus): string {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'revoked':
      return 'Widerrufen';
    case 'expired':
      return 'Abgelaufen';
    case 'rotated':
      return 'Rotiert';
    case 'replacement':
      return 'Aktiv';
    default:
      return 'Unbekannt';
  }
}

/** TokenListItem Molecule. */
export function TokenListItem({ token, onClick, onRevokeClick, onReactivateClick, onRotateClick, isActionLoading, allTokens }: TokenListItemProps) {
  const isClickable = !!onClick;
  const displayStatus = getDisplayStatus(token);
  const statusVariant = getStatusBadgeVariant(displayStatus);
  const statusLabel = getStatusLabel(displayStatus);
  const isActive = token.status === 'active';
  const isRevoked = token.status === 'revoked';
  const isRotated = token.rotatedStatus === 'rotated';
  const isReplacement = token.rotatedStatus === 'replacement';
  const lastUsedInfo = formatLastUsed(token.lastUsedAt);

  const replacementToken = allTokens?.find((candidate) => candidate.rotatedFromId && String(candidate.rotatedFromId) === token.id) ?? undefined;
  const originalToken = allTokens?.find((candidate) => candidate.id === String(token.rotatedFromId)) ?? undefined;

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };

  const rotationTooltip = (() => {
    if (isRotated && replacementToken) {
      const rotatedAt = token.revokedAt ? format(parseISO(String(token.revokedAt)), 'dd.MM.yyyy', { locale: de }) : '';
      return `Rotiert${rotatedAt ? ` am ${rotatedAt}` : ''}. Neuer Token: ${replacementToken.name || replacementToken.prefix}...`;
    }

    if (isReplacement && originalToken) {
      return `Ersetzt Token: ${originalToken.name || originalToken.prefix}...`;
    }

    return undefined;
  })();

  const renderActionButtons = () => {
    const buttons: ReactNode[] = [];

    if (isActive && onRotateClick) {
      buttons.push(
        <Button
          key="rotate"
          intent="secondary"
          appearance="outline"
          size="sm"
          onClick={(event) => handleActionClick(event, onRotateClick)}
          disabled={isActionLoading}
          loading={isActionLoading}
          aria-label="Token rotieren"
        >
          <PiArrowsClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Rotieren
        </Button>,
      );
    }

    if (isActive && onRevokeClick) {
      buttons.push(
        <Button key="revoke" intent="danger" appearance="outline" size="sm" onClick={(event) => handleActionClick(event, onRevokeClick)} disabled={isActionLoading} loading={isActionLoading}>
          <PiProhibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Deaktivieren
        </Button>,
      );
    }

    if (isRevoked && !isRotated && onReactivateClick) {
      buttons.push(
        <Button key="reactivate" intent="primary" appearance="outline" size="sm" onClick={(event) => handleActionClick(event, onReactivateClick)} disabled={isActionLoading} loading={isActionLoading}>
          <PiArrowCounterClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Reaktivieren
        </Button>,
      );
    }

    if (buttons.length === 0) {
      return null;
    }

    return <div className="flex flex-wrap gap-2">{buttons}</div>;
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Interaktivität ist optional und role wird dynamisch gesetzt
    <div
      className={cn(
        'rounded-panel border border-border-subtle bg-surface-panel p-4 transition-colors',
        isClickable && 'cursor-pointer hover:border-border-strong hover:bg-surface-raised',
        isActionLoading && 'pointer-events-none opacity-60',
      )}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-text-primary">{token.name}</h3>
              {isActive && <InactivityBadge isInactive={lastUsedInfo.isInactive} tooltip={lastUsedInfo.tooltip} />}
            </div>
            <code className="font-mono text-xs text-text-muted">{formatMaskedPrefix(token.prefix)}</code>
          </div>
          <div title={rotationTooltip}>
            <Badge variant={statusVariant} size="sm" dot={isActive || isReplacement} dotColor={isActive || isReplacement ? 'green' : undefined}>
              {statusLabel}
            </Badge>
          </div>
        </div>

        {rotationTooltip && (
          <div className="flex items-center gap-1 text-xs text-action-primary">
            <PiArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
            {rotationTooltip}
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <PiCalendar className="h-3.5 w-3.5" aria-hidden="true" />
            Erstellt: {formatDate(token.createdAt)}
          </span>
          <span className="flex items-center gap-1" title={lastUsedInfo.tooltip}>
            <PiClock className="h-3.5 w-3.5" aria-hidden="true" />
            Zuletzt: {lastUsedInfo.text}
          </span>
          {token.revokedAt && !isRotated && (
            <span className="flex items-center gap-1 text-status-danger-text">
              <PiProhibit className="h-3.5 w-3.5" aria-hidden="true" />
              Deaktiviert: {formatDate(token.revokedAt)}
            </span>
          )}
          {isRotated && token.revokedAt && (
            <span className="flex items-center gap-1 text-action-primary">
              <PiArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
              Rotiert: {formatDate(token.revokedAt)}
            </span>
          )}
        </div>

        {renderActionButtons()}
      </div>

      <div className="hidden items-center gap-4 sm:flex">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control bg-surface-raised">
          <PiKey className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-text-primary">{token.name}</h3>
            {isActive && <InactivityBadge isInactive={lastUsedInfo.isInactive} tooltip={lastUsedInfo.tooltip} />}
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-text-muted">{formatMaskedPrefix(token.prefix)}</code>
            {rotationTooltip && (
              <span className="text-xs text-action-primary" title={rotationTooltip}>
                <PiArrowsClockwise className="inline h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        <div className="hidden flex-shrink-0 text-right md:block">
          <div className="text-xs text-text-muted">Erstellt</div>
          <div className="text-sm text-text-secondary">{formatDate(token.createdAt)}</div>
        </div>

        <div className="hidden flex-shrink-0 text-right lg:block">
          {isRotated && token.revokedAt ? (
            <>
              <div className="text-xs text-action-primary">Rotiert am</div>
              <div className="text-sm text-action-primary">{formatDate(token.revokedAt)}</div>
            </>
          ) : token.revokedAt ? (
            <>
              <div className="text-xs text-status-danger-text">Deaktiviert am</div>
              <div className="text-sm text-status-danger-text">{formatDate(token.revokedAt)}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-text-muted">Zuletzt verwendet</div>
              <div className="text-sm text-text-secondary" title={lastUsedInfo.tooltip}>
                {lastUsedInfo.text}
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0" title={rotationTooltip}>
          <Badge variant={statusVariant} size="md" dot={isActive || isReplacement} dotColor={isActive || isReplacement ? 'green' : undefined}>
            {statusLabel}
          </Badge>
        </div>

        <div className="flex-shrink-0">{renderActionButtons()}</div>
      </div>
    </div>
  );
}
