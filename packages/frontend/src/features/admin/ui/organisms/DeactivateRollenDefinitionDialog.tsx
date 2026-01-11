import { PiWarning } from 'react-icons/pi';
import type { RollenDefinitionDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';

interface DeactivateRollenDefinitionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rollenDefinition: RollenDefinitionDto | null;
  isSubmitting: boolean;
}

/**
 * Bestaetigungsdialog zum Deaktivieren einer Rollendefinition.
 *
 * Warnt den Benutzer vor den Auswirkungen der Deaktivierung.
 */
export const DeactivateRollenDefinitionDialog = ({ isOpen, onClose, onConfirm, rollenDefinition, isSubmitting }: DeactivateRollenDefinitionDialogProps) => {
  if (!rollenDefinition) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <PiWarning className="h-5 w-5" />
          Rollendefinition deaktivieren
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <div className="space-y-4">
          <Text>Möchten Sie die folgende Rollendefinition wirklich deaktivieren?</Text>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{rollenDefinition.name}</span>
                </div>
                {rollenDefinition.funkrufname && <Text className="mt-1 text-gray-600 dark:text-gray-400">Funkrufname: {rollenDefinition.funkrufname}</Text>}
                {rollenDefinition.beschreibung && <Text className="mt-2 text-gray-500 text-sm dark:text-gray-500">{rollenDefinition.beschreibung}</Text>}

                {/* Qualifikationen anzeigen */}
                {rollenDefinition.erforderlicheQualifikationen.length > 0 && (
                  <div className="mt-3">
                    <Text className="mb-1 text-gray-600 text-xs dark:text-gray-400">Erforderliche Qualifikationen:</Text>
                    <div className="flex flex-wrap gap-1">
                      {rollenDefinition.erforderlicheQualifikationen.map((qualifikation) => (
                        <Badge key={qualifikation.qualifikationId} variant="default" size="sm">
                          {qualifikation.qualifikationAbkuerzung}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <Text className="text-amber-800 text-sm dark:text-amber-200">
              <strong>Hinweis:</strong> Deaktivierte Rollen können nicht mehr für neue Besetzungen verwendet werden. Bestehende Besetzungen bleiben erhalten.
            </Text>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={onConfirm} loading={isSubmitting} disabled={isSubmitting}>
          Deaktivieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
