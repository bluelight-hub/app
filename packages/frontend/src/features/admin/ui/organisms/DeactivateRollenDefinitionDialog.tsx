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
} /** * Bestaetigungsdialog zum Deaktivieren einer Rollendefinition. * * Warnt den Benutzer vor den Auswirkungen der Deaktivierung. */
export const DeactivateRollenDefinitionDialog = ({ isOpen, onClose, onConfirm, rollenDefinition, isSubmitting }: DeactivateRollenDefinitionDialogProps) => {
  if (!rollenDefinition) return null;
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      {' '}
      <Dialog.Title>
        {' '}
        <div className="flex items-center gap-2 text-status-warning-text">
          {' '}
          <PiWarning className="h-5 w-5" /> Rollendefinition deaktivieren{' '}
        </div>{' '}
      </Dialog.Title>{' '}
      <Dialog.Body>
        {' '}
        <div className="space-y-4">
          {' '}
          <Text>Möchten Sie die folgende Rollendefinition wirklich deaktivieren?</Text>{' '}
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            {' '}
            <div className="flex items-start justify-between">
              {' '}
              <div>
                {' '}
                <div className="flex items-center gap-2">
                  {' '}
                  <span className="font-semibold text-text-primary">{rollenDefinition.name}</span>{' '}
                </div>{' '}
                {rollenDefinition.funkrufname && <Text className="mt-1 text-text-secondary">Funkrufname: {rollenDefinition.funkrufname}</Text>}{' '}
                {rollenDefinition.beschreibung && <Text className="mt-2 text-sm text-text-muted">{rollenDefinition.beschreibung}</Text>} {/* Qualifikationen anzeigen */}{' '}
                {rollenDefinition.erforderlicheQualifikationen.length > 0 && (
                  <div className="mt-3">
                    {' '}
                    <Text className="mb-1 text-xs text-text-secondary">Erforderliche Qualifikationen:</Text>{' '}
                    <div className="flex flex-wrap gap-1">
                      {' '}
                      {rollenDefinition.erforderlicheQualifikationen.map((qualifikation) => (
                        <Badge key={qualifikation.qualifikationId} variant="default" size="sm">
                          {' '}
                          {qualifikation.qualifikationAbkuerzung}{' '}
                        </Badge>
                      ))}{' '}
                    </div>{' '}
                  </div>
                )}{' '}
              </div>{' '}
            </div>{' '}
          </div>{' '}
          <div className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3">
            {' '}
            <Text className="text-sm text-status-warning-text">
              {' '}
              <strong>Hinweis:</strong> Deaktivierte Rollen können nicht mehr für neue Besetzungen verwendet werden. Bestehende Besetzungen bleiben erhalten.{' '}
            </Text>{' '}
          </div>{' '}
        </div>{' '}
      </Dialog.Body>{' '}
      <Dialog.Footer>
        {' '}
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isSubmitting}>
          {' '}
          Abbrechen{' '}
        </Button>{' '}
        <Button intent="danger" onClick={onConfirm} loading={isSubmitting} disabled={isSubmitting}>
          {' '}
          Deaktivieren{' '}
        </Button>{' '}
      </Dialog.Footer>{' '}
    </Dialog>
  );
};
