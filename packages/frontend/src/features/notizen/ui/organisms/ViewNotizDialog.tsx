/**
 * Notiz-Detailansicht Dialog.
 *
 * Zeigt eine Notiz in einer schoenen Lese-Ansicht.
 * Oeffnet sich bei Klick auf eine NotizCard.
 */

import type { NotizResponseDto } from '@bluelight-hub/shared/client';

import { KategorieChip } from '@/features/kategorien';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { PiBellRinging, PiNotepad, PiPencilSimple, PiTrash, PiUsersThree } from 'react-icons/pi';

interface ViewNotizDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notiz: NotizResponseDto | null;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onConvertToErinnerung?: () => void;
}

/**
 * Lese-Ansicht fuer eine einzelne Notiz.
 */
export function ViewNotizDialog({ isOpen, onClose, notiz, isOwner = false, onEdit, onDelete, onConvertToErinnerung }: ViewNotizDialogProps) {
  if (!notiz) return null;

  const createdDate = new Date(notiz.createdAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const wurdeBearbeitet = notiz.updatedAt !== notiz.createdAt;
  const updatedDate = wurdeBearbeitet
    ? new Date(notiz.updatedAt).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header mit Titel und Metadaten */}
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
          <PiNotepad className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="!text-xl">{notiz.titel}</Dialog.Title>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-gray-500 text-xs dark:text-gray-400">
            <span>Erstellt {createdDate}</span>
            {updatedDate && <span>· Bearbeitet {updatedDate}</span>}
            {notiz.erstelltVonName && <span>· von {notiz.erstelltVonName}</span>}
          </div>
        </div>
      </div>

      <Dialog.Body>
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {typeof notiz.kategorieName === 'string' && typeof notiz.kategorieFarbe === 'string' && <KategorieChip name={notiz.kategorieName} farbe={notiz.kategorieFarbe} />}
            {notiz.istTeamsichtbar && (
              <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                <PiUsersThree className="h-3.5 w-3.5" />
                Team-sichtbar
              </div>
            )}
          </div>

          {/* Inhalt */}
          {notiz.inhalt ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed dark:text-gray-300">{notiz.inhalt}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 border-dashed bg-gray-50/50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/30">
              <p className="text-gray-400 text-sm italic dark:text-gray-500">Kein Inhalt vorhanden</p>
            </div>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        {/* Aktionen links - Parent handhabt das Schliessen */}
        <div className="mr-auto flex items-center gap-2">
          {onConvertToErinnerung && (
            <Button intent="warning" appearance="ghost" size="sm" onClick={onConvertToErinnerung}>
              <PiBellRinging className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Erinnerung
            </Button>
          )}
          {isOwner && onEdit && (
            <Button intent="secondary" appearance="ghost" size="sm" onClick={onEdit}>
              <PiPencilSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Bearbeiten
            </Button>
          )}
          {isOwner && onDelete && (
            <Button intent="danger" appearance="ghost" size="sm" onClick={onDelete}>
              <PiTrash className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Löschen
            </Button>
          )}
        </div>

        <Button intent="secondary" appearance="ghost" onClick={onClose}>
          Schließen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
