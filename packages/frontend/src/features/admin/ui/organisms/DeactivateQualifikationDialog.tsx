import { PiWarning } from 'react-icons/pi';
import { type QualifikationDto, KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button';
import { Dialog } from '@/shared/ui/molecules/dialog';
import { Text } from '@/shared/ui/atoms/text';
import { Badge } from '@/shared/ui/atoms/badge';

interface DeactivateQualifikationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  qualifikation: QualifikationDto | null;
  isDeactivating: boolean;
}

/**
 * Bestätigungsdialog zum Deaktivieren einer Qualifikation.
 *
 * Warnt den Benutzer vor den Auswirkungen der Deaktivierung.
 */
export const DeactivateQualifikationDialog = ({ isOpen, onClose, onConfirm, qualifikation, isDeactivating }: DeactivateQualifikationDialogProps) => {
  if (!qualifikation) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <PiWarning className="h-5 w-5" />
          Qualifikation deaktivieren
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <div className="space-y-4">
          <Text>Möchten Sie die folgende Qualifikation wirklich deaktivieren?</Text>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{qualifikation.abkuerzung}</span>
                  <Badge variant="info" size="sm">
                    {KATEGORIE_LABELS[qualifikation.kategorie]}
                  </Badge>
                </div>
                <Text className="mt-1 text-gray-600 dark:text-gray-400">{qualifikation.name}</Text>
                {qualifikation.beschreibung && <Text className="mt-2 text-gray-500 text-sm dark:text-gray-500">{qualifikation.beschreibung}</Text>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <Text className="text-amber-800 text-sm dark:text-amber-200">
              <strong>Hinweis:</strong> Deaktivierte Qualifikationen können nicht mehr neuen Kräften zugewiesen werden. Bestehende Zuweisungen bleiben erhalten.
            </Text>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isDeactivating}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={onConfirm} loading={isDeactivating} disabled={isDeactivating}>
          Deaktivieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
