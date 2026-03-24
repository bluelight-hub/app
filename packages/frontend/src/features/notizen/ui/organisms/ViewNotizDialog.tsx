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
        <div className="rounded-full bg-surface-raised p-2">
          <PiNotepad className="h-5 w-5 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="!text-xl">{notiz.titel}</Dialog.Title>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-text-muted text-xs">
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
              <div className="inline-flex items-center gap-1 rounded-pill bg-action-secondary px-2 py-0.5 font-medium text-action-primary text-xs">
                <PiUsersThree className="h-3.5 w-3.5" />
                Team-sichtbar
              </div>
            )}
          </div>

          {/* Inhalt */}
          {notiz.inhalt ? (
            <div className="rounded-panel border border-border-subtle bg-surface-raised p-4">
              <p className="whitespace-pre-wrap text-text-secondary text-sm leading-relaxed">{notiz.inhalt}</p>
            </div>
          ) : (
            <div className="rounded-panel border border-border-subtle border-dashed bg-surface-raised/70 p-4 text-center">
              <p className="text-text-muted text-sm italic">Kein Inhalt vorhanden</p>
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
