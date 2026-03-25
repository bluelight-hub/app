import { PiBellRinging, PiNotepad, PiPencilSimple, PiTrash, PiUsersThree } from 'react-icons/pi';
import { KategorieChip } from '@/features/kategorien';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/shared/ui/cn';
import { ItemTypeBadge } from './ItemTypeBadge';
import { HighlightText } from '@/features/notizen';

interface NotizCardProps {
  id: string;
  titel: string;
  inhalt: string | null;
  /** @deprecated Verwende kategorieName und kategorieFarbe */
  kategorie?: string | null;
  kategorieName?: string | null;
  kategorieFarbe?: string | null;
  erstelltVon: string;
  createdAt: string;
  updatedAt: string;
  istTeamsichtbar?: boolean;
  erstelltVonName?: string | null;
  isOwner?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConvertToErinnerung?: () => void;
  searchQuery?: string;
  className?: string;
}

/**
 * Atom: Einzelne Notiz-Karte (Story 7.1, 7.3).
 *
 * Zeigt Titel, Erstellungszeit und optionalen Kategorie-Badge an.
 * Aktionen (Bearbeiten, Loeschen, Erinnerung) werden nur bei Hover angezeigt.
 * Klick auf die Karte oeffnet die Lese-Ansicht.
 */
export function NotizCard({
  titel,
  inhalt,
  kategorieName,
  kategorieFarbe,
  createdAt,
  updatedAt,
  istTeamsichtbar = false,
  erstelltVonName,
  isOwner = true,
  onClick,
  onEdit,
  onDelete,
  onConvertToErinnerung,
  searchQuery,
  className,
}: NotizCardProps) {
  const zeitAnzeige = formatDistanceToNow(new Date(createdAt), { locale: de, addSuffix: true });
  const wurdeBearbeitet = updatedAt !== createdAt;
  const bearbeitetAnzeige = wurdeBearbeitet ? formatDistanceToNow(new Date(updatedAt), { locale: de, addSuffix: true }) : null;

  const hasActions = onConvertToErinnerung || (isOwner && onEdit) || (isOwner && onDelete);

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Div mit komplexem Inhalt und interaktiven Kindelementen
    <div
      className={cn('group cursor-pointer rounded-lg border-l-4 border-border-subtle bg-surface-raised p-4 transition-colors hover:bg-surface-raised', className)}
      onClick={onClick}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PiNotepad className="h-4 w-4 shrink-0 text-text-muted" />
            <h3 className="truncate text-sm font-semibold text-text-primary">{searchQuery ? <HighlightText text={titel} query={searchQuery} /> : titel}</h3>
            <ItemTypeBadge type="notiz" />
            {istTeamsichtbar && (
              <div className="flex items-center gap-1 text-xs text-action-primary">
                <PiUsersThree className="h-3.5 w-3.5" />
                <span>Team</span>
              </div>
            )}
          </div>
          {inhalt && <p className="mt-1.5 line-clamp-3 text-xs text-text-muted">{searchQuery ? <HighlightText text={inhalt} query={searchQuery} /> : inhalt}</p>}
        </div>

        {/* Hover-Aktionen: nur bei Hover sichtbar */}
        {hasActions && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onConvertToErinnerung && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToErinnerung();
                }}
                className="shrink-0 rounded-control p-1.5 text-status-warning-text transition-colors hover:bg-status-warning-surface hover:text-status-warning-text"
                aria-label="Zu Erinnerung umwandeln"
                title="Zu Erinnerung machen"
              >
                <PiBellRinging className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {isOwner && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-secondary"
                aria-label="Notiz bearbeiten"
                title="Bearbeiten"
              >
                <PiPencilSimple className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {isOwner && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="shrink-0 rounded-control p-1.5 text-text-muted transition-colors hover:bg-status-danger-surface hover:text-status-danger-text"
                aria-label="Notiz löschen"
                title="Löschen"
              >
                <PiTrash className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <time dateTime={createdAt} className="text-xs text-text-muted">
          {zeitAnzeige}
        </time>
        {bearbeitetAnzeige && (
          <span className="text-xs text-text-muted">
            {'· bearbeitet '}
            <time dateTime={updatedAt}>{bearbeitetAnzeige}</time>
          </span>
        )}
        {kategorieName && kategorieFarbe && <KategorieChip name={kategorieName} farbe={kategorieFarbe} />}
        {istTeamsichtbar && erstelltVonName && <span className="text-xs text-text-muted">von {erstelltVonName}</span>}
      </div>
    </div>
  );
}
