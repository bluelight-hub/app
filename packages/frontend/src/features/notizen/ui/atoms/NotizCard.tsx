import { PiBellRinging, PiNotepad, PiPencilSimple, PiTrash, PiUsersThree } from 'react-icons/pi';
import { KategorieChip } from '@/features/kategorien';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/shared/ui/cn';
import { ItemTypeBadge } from './ItemTypeBadge';
import { HighlightText } from '../utils/highlight-text';

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
 * Neutrales Styling mit border-l-4 border-slate-300.
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
  onEdit,
  onDelete,
  onConvertToErinnerung,
  searchQuery,
  className,
}: NotizCardProps) {
  const zeitAnzeige = formatDistanceToNow(new Date(createdAt), { locale: de, addSuffix: true });
  const wurdeBearbeitet = updatedAt !== createdAt;
  const bearbeitetAnzeige = wurdeBearbeitet ? formatDistanceToNow(new Date(updatedAt), { locale: de, addSuffix: true }) : null;

  return (
    <div className={cn('rounded-lg border-l-4 border-slate-300 bg-slate-50 p-4 transition-colors', 'dark:border-slate-600 dark:bg-gray-800/50', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PiNotepad className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{searchQuery ? <HighlightText text={titel} query={searchQuery} /> : titel}</h3>
            <ItemTypeBadge type="notiz" />
            {istTeamsichtbar && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <PiUsersThree className="h-3.5 w-3.5" />
                <span>Team</span>
              </div>
            )}
          </div>
          {inhalt && <p className="mt-1.5 line-clamp-3 text-gray-600 text-xs dark:text-gray-400">{searchQuery ? <HighlightText text={inhalt} query={searchQuery} /> : inhalt}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          {onConvertToErinnerung && (
            <button
              type="button"
              onClick={onConvertToErinnerung}
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
              onClick={onEdit}
              className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-slate-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Notiz bearbeiten"
            >
              <PiPencilSimple className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {isOwner && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              aria-label="Notiz löschen"
            >
              <PiTrash className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
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
        {istTeamsichtbar && erstelltVonName && <span className="text-xs text-slate-500 dark:text-slate-400">von {erstelltVonName}</span>}
      </div>
    </div>
  );
}
