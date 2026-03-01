import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type { TokenListItemDto } from '@/shared';
import { PiKey, PiCalendar, PiClock, PiProhibit, PiArrowCounterClockwise, PiArrowsClockwise } from 'react-icons/pi';
import { formatLastUsed } from '@/features/admin/lib/format-last-used';
import { InactivityBadge } from '../atoms/InactivityBadge';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Erweiterter Token-Status fuer UI-Anzeige.
 *
 * Kombiniert Backend-Status mit Rotations-Status fuer praezise Badge-Darstellung.
 */
type TokenDisplayStatus = 'active' | 'revoked' | 'expired' | 'rotated' | 'replacement';

interface TokenListItemProps {
  /**
   * Token-Daten aus der API
   */
  token: TokenListItemDto;
  /**
   * Optionaler Klick-Handler fuer die gesamte Zeile
   */
  onClick?: () => void;
  /**
   * Callback wenn "Deaktivieren" geklickt wird
   */
  onRevokeClick?: () => void;
  /**
   * Callback wenn "Reaktivieren" geklickt wird
   */
  onReactivateClick?: () => void;
  /**
   * Callback wenn "Rotieren" geklickt wird
   */
  onRotateClick?: () => void;
  /**
   * Deaktiviert die Action-Buttons waehrend einer laufenden Operation
   */
  isActionLoading?: boolean;
  /**
   * Alle Tokens fuer Nachfolger/Vorgaenger-Lookup
   */
  allTokens?: TokenListItemDto[];
}

/**
 * Formatiert ein ISO-Datum in deutsches Format (dd.MM.yyyy HH:mm).
 *
 * Akzeptiert string, Date oder object (wegen OpenAPI-Generator Typisierung).
 * Das Backend liefert ISO-8601 Strings, aber der Generator typisiert nullable
 * Felder manchmal als `object | null`.
 *
 * Nutzt date-fns fuer konsistente Formatierung im Projekt.
 */
const formatDate = (isoDate: string | Date | object): string => {
  const date = isoDate instanceof Date ? isoDate : parseISO(String(isoDate));
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
};

/**
 * Formatiert den Token-Prefix als maskierten String
 * z.B. "blh_xxxx" wird zu "blh_xxxx..."
 */
const formatMaskedPrefix = (prefix: string): string => {
  return `${prefix}...`;
};

/**
 * Ermittelt den erweiterten Anzeige-Status des Tokens.
 *
 * Beruecksichtigt Rotations-Status vor Backend-Status, da ein rotierter
 * Token technisch "revoked" ist, aber semantisch anders dargestellt wird.
 */
const getDisplayStatus = (token: TokenListItemDto): TokenDisplayStatus => {
  // Rotations-Status hat Vorrang
  if (token.rotatedStatus === 'replacement') {
    return 'replacement';
  }
  if (token.rotatedStatus === 'rotated') {
    return 'rotated';
  }
  // Fallback auf Backend-Status
  return token.status as TokenDisplayStatus;
};

/**
 * Ermittelt die Badge-Variante basierend auf dem erweiterten Token-Status
 */
const getStatusBadgeVariant = (status: TokenDisplayStatus): 'success' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'active':
    case 'replacement':
      return 'success';
    case 'revoked':
      return 'error';
    case 'rotated':
      return 'info';
    case 'expired':
      return 'warning';
    default:
      return 'warning';
  }
};

/**
 * Gibt den deutschen Label-Text fuer den erweiterten Status zurueck
 */
const getStatusLabel = (status: TokenDisplayStatus): string => {
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
};

/**
 * TokenListItem Molecule
 *
 * Zeigt ein einzelnes Access-Token in einer Listen-Ansicht.
 * Beinhaltet:
 * - Token-Name
 * - Maskierter Prefix (blh_xxxx...)
 * - Erstellungsdatum
 * - Status-Badge (aktiv/widerrufen/abgelaufen)
 * - Optional: Letzte Verwendung
 *
 * Responsive Layout mit Mobile- und Desktop-Ansicht.
 * Dark Mode Support durch Tailwind dark: Prefix.
 *
 * @example
 * ```tsx
 * <TokenListItem
 *   token={{
 *     id: '123',
 *     name: 'Produktiv-App',
 *     prefix: 'blh_abc123',
 *     status: 'active',
 *     createdAt: '2025-01-10T10:00:00Z',
 *     lastUsedAt: null,
 *     expiresAt: null,
 *     revokedAt: null,
 *   }}
 *   onClick={() => console.log('Token clicked')}
 *   onRevokeClick={() => handleRevoke('123')}
 *   onReactivateClick={() => handleReactivate('123')}
 * />
 * ```
 */
export function TokenListItem({ token, onClick, onRevokeClick, onReactivateClick, onRotateClick, isActionLoading, allTokens }: TokenListItemProps) {
  const isClickable = !!onClick;
  const displayStatus = getDisplayStatus(token);
  const statusVariant = getStatusBadgeVariant(displayStatus);
  const statusLabel = getStatusLabel(displayStatus);
  const isActive = token.status === 'active';
  const isRevoked = token.status === 'revoked';
  const isRotated = token.rotatedStatus === 'rotated';
  const isReplacement = token.rotatedStatus === 'replacement';

  // Formatiere lastUsedAt mit relativer Zeit und Inaktivitaets-Status
  const lastUsedInfo = formatLastUsed(token.lastUsedAt);

  /**
   * Findet das Replacement-Token fuer einen rotierten Token.
   */
  const findReplacementToken = (): TokenListItemDto | undefined => {
    if (!allTokens || !isRotated) return undefined;
    return allTokens.find((t) => t.rotatedFromId && String(t.rotatedFromId) === token.id);
  };

  /**
   * Findet das urspruengliche Token fuer ein Replacement-Token.
   */
  const findOriginalToken = (): TokenListItemDto | undefined => {
    if (!allTokens || !isReplacement || !token.rotatedFromId) return undefined;
    return allTokens.find((t) => t.id === String(token.rotatedFromId));
  };

  const replacementToken = findReplacementToken();
  const originalToken = findOriginalToken();

  /**
   * Handler fuer Action-Button Klicks.
   * Stoppt Event-Propagation um Klick auf Parent zu verhindern.
   */
  const handleActionClick = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  /**
   * Generiert Tooltip-Text fuer rotierte/Replacement-Tokens.
   * Enthaelt Zeitangabe und Token-Namen fuer bessere Nachvollziehbarkeit.
   */
  const getRotationTooltip = (): string | undefined => {
    if (isRotated && replacementToken) {
      const rotatedAt = token.revokedAt ? format(parseISO(String(token.revokedAt)), 'dd.MM.yyyy', { locale: de }) : '';
      return `Rotiert${rotatedAt ? ` am ${rotatedAt}` : ''}. Neuer Token: ${replacementToken.name || replacementToken.prefix}...`;
    }
    if (isReplacement && originalToken) {
      return `Ersetzt Token: ${originalToken.name || originalToken.prefix}...`;
    }
    return undefined;
  };

  const rotationTooltip = getRotationTooltip();

  /**
   * Rendert die Action-Buttons basierend auf Token-Status.
   */
  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    // Rotieren-Button: Nur fuer aktive Tokens
    if (isActive && onRotateClick) {
      buttons.push(
        <Button
          key="rotate"
          intent="secondary"
          appearance="outline"
          size="sm"
          onClick={(e) => handleActionClick(e, onRotateClick)}
          disabled={isActionLoading}
          loading={isActionLoading}
          aria-label="Token rotieren"
        >
          <PiArrowsClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Rotieren
        </Button>,
      );
    }

    // Deaktivieren-Button: Nur fuer aktive Tokens
    if (isActive && onRevokeClick) {
      buttons.push(
        <Button key="revoke" intent="danger" appearance="outline" size="sm" onClick={(e) => handleActionClick(e, onRevokeClick)} disabled={isActionLoading} loading={isActionLoading}>
          <PiProhibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Deaktivieren
        </Button>,
      );
    }

    // Reaktivieren-Button: Nur fuer manuell widerrufene Tokens (NICHT rotierte!)
    if (isRevoked && !isRotated && onReactivateClick) {
      buttons.push(
        <Button key="reactivate" intent="primary" appearance="outline" size="sm" onClick={(e) => handleActionClick(e, onReactivateClick)} disabled={isActionLoading} loading={isActionLoading}>
          <PiArrowCounterClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Reaktivieren
        </Button>,
      );
    }

    if (buttons.length === 0) return null;

    return <div className="flex flex-wrap gap-2">{buttons}</div>;
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 transition-colors',
        'dark:border-gray-700 dark:bg-gray-800',
        isClickable && 'cursor-pointer hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-750',
        isActionLoading && 'pointer-events-none opacity-60',
      )}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Mobile Layout (< sm) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Header: Name + Status + Inaktiv-Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-gray-900 text-sm dark:text-white">{token.name}</h3>
              {isActive && <InactivityBadge isInactive={lastUsedInfo.isInactive} tooltip={lastUsedInfo.tooltip} />}
            </div>
            <code className="font-mono text-gray-500 text-xs dark:text-gray-400">{formatMaskedPrefix(token.prefix)}</code>
          </div>
          <div title={rotationTooltip}>
            <Badge variant={statusVariant} size="sm" dot={isActive || isReplacement} dotColor={isActive || isReplacement ? 'green' : undefined}>
              {statusLabel}
            </Badge>
          </div>
        </div>

        {/* Rotations-Info (Mobile) */}
        {rotationTooltip && (
          <div className="flex items-center gap-1 text-blue-600 text-xs dark:text-blue-400">
            <PiArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
            {rotationTooltip}
          </div>
        )}

        {/* Meta-Informationen */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-xs dark:text-gray-400">
          <span className="flex items-center gap-1">
            <PiCalendar className="h-3.5 w-3.5" aria-hidden="true" />
            Erstellt: {formatDate(token.createdAt)}
          </span>
          <span className="flex items-center gap-1" title={lastUsedInfo.tooltip}>
            <PiClock className="h-3.5 w-3.5" aria-hidden="true" />
            Zuletzt: {lastUsedInfo.text}
          </span>
          {token.revokedAt && !isRotated && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <PiProhibit className="h-3.5 w-3.5" aria-hidden="true" />
              Deaktiviert: {formatDate(token.revokedAt)}
            </span>
          )}
          {isRotated && token.revokedAt && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <PiArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
              Rotiert: {formatDate(token.revokedAt)}
            </span>
          )}
        </div>

        {/* Action Buttons (Mobile) */}
        {renderActionButtons()}
      </div>

      {/* Desktop Layout (>= sm) */}
      <div className="hidden items-center gap-4 sm:flex">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </div>

        {/* Name & Prefix */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-gray-900 dark:text-white">{token.name}</h3>
            {isActive && <InactivityBadge isInactive={lastUsedInfo.isInactive} tooltip={lastUsedInfo.tooltip} />}
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-gray-500 text-sm dark:text-gray-400">{formatMaskedPrefix(token.prefix)}</code>
            {rotationTooltip && (
              <span className="text-blue-600 text-xs dark:text-blue-400" title={rotationTooltip}>
                <PiArrowsClockwise className="inline h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        {/* Erstellungsdatum */}
        <div className="hidden flex-shrink-0 text-right md:block">
          <div className="text-gray-500 text-xs dark:text-gray-400">Erstellt</div>
          <div className="text-gray-700 text-sm dark:text-gray-300">{formatDate(token.createdAt)}</div>
        </div>

        {/* Letzte Verwendung / Deaktivierungsdatum / Rotationsdatum */}
        <div className="hidden flex-shrink-0 text-right lg:block">
          {isRotated && token.revokedAt ? (
            <>
              <div className="text-blue-500 text-xs dark:text-blue-400">Rotiert am</div>
              <div className="text-blue-700 text-sm dark:text-blue-300">{formatDate(token.revokedAt)}</div>
            </>
          ) : token.revokedAt ? (
            <>
              <div className="text-red-500 text-xs dark:text-red-400">Deaktiviert am</div>
              <div className="text-red-700 text-sm dark:text-red-300">{formatDate(token.revokedAt)}</div>
            </>
          ) : (
            <>
              <div className="text-gray-500 text-xs dark:text-gray-400">Zuletzt verwendet</div>
              <div className="text-gray-700 text-sm dark:text-gray-300" title={lastUsedInfo.tooltip}>
                {lastUsedInfo.text}
              </div>
            </>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0" title={rotationTooltip}>
          <Badge variant={statusVariant} size="md" dot={isActive || isReplacement} dotColor={isActive || isReplacement ? 'green' : undefined}>
            {statusLabel}
          </Badge>
        </div>

        {/* Action Buttons (Desktop) */}
        <div className="flex-shrink-0">{renderActionButtons()}</div>
      </div>
    </div>
  );
}
