import { PiWarning } from 'react-icons/pi';
import type { BefehlsgeberVorschlagDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';

interface DeleteBefehlsgeberVorschlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vorschlag: BefehlsgeberVorschlagDto | null;
  isDeleting: boolean;
}

/**
 * Bestaetigungsdialog zum Loeschen eines Befehlsgeber-Vorschlags.
 *
 * Warnt den Benutzer, dass der Vorschlag unwiderruflich geloescht wird.
 */
export const DeleteBefehlsgeberVorschlagDialog = ({ isOpen, onClose, onConfirm, vorschlag, isDeleting }: DeleteBefehlsgeberVorschlagDialogProps) => {
  if (!vorschlag) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
          <PiWarning className="h-5 w-5" />
          Befehlsgeber-Vorschlag löschen
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <div className="space-y-4">
          <Text>Möchten Sie den folgenden Befehlsgeber-Vorschlag wirklich löschen?</Text>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{vorschlag.kuerzel}</span>
                </div>
                <Text className="mt-1 text-gray-600 dark:text-gray-400">{vorschlag.label}</Text>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <Text className="text-red-800 text-sm dark:text-red-200">
              <strong>Achtung:</strong> Der Vorschlag wird unwiderruflich gelöscht. Bestehende Befehle bleiben davon unberührt.
            </Text>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isDeleting}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={onConfirm} loading={isDeleting} disabled={isDeleting}>
          Löschen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
