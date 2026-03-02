import { PiWarning } from 'react-icons/pi';
import type { FahrzeugtypDto } from '@/features/admin/api';
import { FAHRZEUGTYP_KATEGORIE_LABELS } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

interface DeactivateFahrzeugtypDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fahrzeugtyp: FahrzeugtypDto | null;
  isDeactivating: boolean;
}

/**
 * Bestätigungsdialog zum Deaktivieren eines Fahrzeugtyps.
 */
export const DeactivateFahrzeugtypDialog = ({ isOpen, onClose, onConfirm, fahrzeugtyp, isDeactivating }: DeactivateFahrzeugtypDialogProps) => {
  if (!fahrzeugtyp) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <PiWarning className="h-5 w-5" />
          Fahrzeugtyp deaktivieren
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <div className="space-y-4">
          <Text>Möchten Sie den folgenden Fahrzeugtyp wirklich deaktivieren?</Text>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{fahrzeugtyp.code}</span>
                  <Badge variant="info" size="sm">
                    {FAHRZEUGTYP_KATEGORIE_LABELS[fahrzeugtyp.kategorie]}
                  </Badge>
                </div>
                <Text className="mt-1 text-gray-600 dark:text-gray-400">{fahrzeugtyp.bezeichnung}</Text>
                {fahrzeugtyp.beschreibung && <Text className="mt-2 text-gray-500 text-sm dark:text-gray-500">{fahrzeugtyp.beschreibung}</Text>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <Text className="text-amber-800 text-sm dark:text-amber-200">
              <strong>Hinweis:</strong> Deaktivierte Fahrzeugtypen können nicht mehr für neue Fahrzeuge ausgewählt werden. Bestehende Zuordnungen bleiben erhalten.
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
