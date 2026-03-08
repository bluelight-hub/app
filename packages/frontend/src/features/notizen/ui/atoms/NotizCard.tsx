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
    // biome-ignore lint/a11y/useSemanticElements: Div mit komplexem Inhalt und interaktiven Kindelementen
    <div
      className={cn(
        'group cursor-pointer rounded-lg border-slate-300 border-l-4 bg-slate-50 p-4 transition-colors hover:bg-slate-100',
        'dark:border-slate-600 dark:bg-gray-800/50 dark:hover:bg-gray-800/80',
        className,
      )}
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
            <PiNotepad className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{searchQuery ? <HighlightText text={titel} query={searchQuery} /> : titel}</h3>
            <ItemTypeBadge type="notiz" />
            {istTeamsichtbar && (
              <div className="flex items-center gap-1 text-blue-600 text-xs dark:text-blue-400">
                <PiUsersThree className="h-3.5 w-3.5" />
                <span>Team</span>
              </div>
            )}
          </div>
          {inhalt && <p className="mt-1.5 line-clamp-3 text-gray-600 text-xs dark:text-gray-400">{searchQuery ? <HighlightText text={inhalt} query={searchQuery} /> : inhalt}</p>}
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
                className="shrink-0 rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
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
                className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-slate-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
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
                className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
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
        <time dateTime={createdAt} className="text-gray-400 text-xs dark:text-gray-500">
          {zeitAnzeige}
        </time>
        {bearbeitetAnzeige && (
          <span className="text-gray-400 text-xs dark:text-gray-500">
            {'· bearbeitet '}
            <time dateTime={updatedAt}>{bearbeitetAnzeige}</time>
          </span>
        )}
        {kategorieName && kategorieFarbe && <KategorieChip name={kategorieName} farbe={kategorieFarbe} />}
        {istTeamsichtbar && erstelltVonName && <span className="text-slate-500 text-xs dark:text-slate-400">von {erstelltVonName}</span>}
      </div>
    </div>
  );
}
