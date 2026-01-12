import { Badge } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';
import type { TokenListItemDto, TokenListItemDtoStatusEnum } from '@/shared';
import { PiKey, PiCalendar, PiClock } from 'react-icons/pi';

interface TokenListItemProps {
  /**
   * Token-Daten aus der API
   */
  token: TokenListItemDto;
  /**
   * Optionaler Klick-Handler fuer die gesamte Zeile
   */
  onClick?: () => void;
}

/**
 * Formatiert ein ISO-Datum in deutsches Format
 */
const formatDate = (isoDate: string): string => {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
};

/**
 * Formatiert den Token-Prefix als maskierten String
 * z.B. "blh_xxxx" wird zu "blh_xxxx..."
 */
const formatMaskedPrefix = (prefix: string): string => {
  return `${prefix}...`;
};

/**
 * Ermittelt die Badge-Variante basierend auf dem Token-Status
 */
const getStatusBadgeVariant = (status: TokenListItemDtoStatusEnum): 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'revoked':
      return 'error';
    case 'expired':
      return 'warning';
    default:
      return 'warning';
  }
};

/**
 * Gibt den deutschen Label-Text fuer den Status zurueck
 */
const getStatusLabel = (status: TokenListItemDtoStatusEnum): string => {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'revoked':
      return 'Widerrufen';
    case 'expired':
      return 'Abgelaufen';
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
 *   }}
 *   onClick={() => console.log('Token clicked')}
 * />
 * ```
 */
export function TokenListItem({ token, onClick }: TokenListItemProps) {
  const isClickable = !!onClick;
  const statusVariant = getStatusBadgeVariant(token.status);
  const statusLabel = getStatusLabel(token.status);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Interaktivitaet ist optional und role wird dynamisch gesetzt
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 transition-colors',
        'dark:border-gray-700 dark:bg-gray-800',
        isClickable && 'cursor-pointer hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-750',
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
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-gray-900 text-sm dark:text-white">{token.name}</h3>
            <code className="font-mono text-gray-500 text-xs dark:text-gray-400">{formatMaskedPrefix(token.prefix)}</code>
          </div>
          <Badge variant={statusVariant} size="sm" dot={token.status === 'active'} dotColor={token.status === 'active' ? 'green' : undefined}>
            {statusLabel}
          </Badge>
        </div>

        {/* Meta-Informationen */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-xs dark:text-gray-400">
          <span className="flex items-center gap-1">
            <PiCalendar className="h-3.5 w-3.5" aria-hidden="true" />
            Erstellt: {formatDate(token.createdAt)}
          </span>
          {token.lastUsedAt && (
            <span className="flex items-center gap-1">
              <PiClock className="h-3.5 w-3.5" aria-hidden="true" />
              Zuletzt: {formatDate(token.lastUsedAt as unknown as string)}
            </span>
          )}
        </div>
      </div>

      {/* Desktop Layout (>= sm) */}
      <div className="hidden items-center gap-4 sm:flex">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </div>

        {/* Name & Prefix */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-gray-900 dark:text-white">{token.name}</h3>
          <code className="font-mono text-gray-500 text-sm dark:text-gray-400">{formatMaskedPrefix(token.prefix)}</code>
        </div>

        {/* Erstellungsdatum */}
        <div className="hidden flex-shrink-0 text-right md:block">
          <div className="text-gray-500 text-xs dark:text-gray-400">Erstellt</div>
          <div className="text-gray-700 text-sm dark:text-gray-300">{formatDate(token.createdAt)}</div>
        </div>

        {/* Letzte Verwendung */}
        <div className="hidden flex-shrink-0 text-right lg:block">
          <div className="text-gray-500 text-xs dark:text-gray-400">Zuletzt verwendet</div>
          <div className="text-gray-700 text-sm dark:text-gray-300">{token.lastUsedAt ? formatDate(token.lastUsedAt as unknown as string) : 'Nie'}</div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <Badge variant={statusVariant} size="md" dot={token.status === 'active'} dotColor={token.status === 'active' ? 'green' : undefined}>
            {statusLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
