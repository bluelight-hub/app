import { PiWarning } from 'react-icons/pi';
import { type QualifikationDto, KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
interface DeactivateQualifikationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  qualifikation: QualifikationDto | null;
  isDeactivating: boolean;
} /** * Bestätigungsdialog zum Deaktivieren einer Qualifikation. * * Warnt den Benutzer vor den Auswirkungen der Deaktivierung. */
export const DeactivateQualifikationDialog = ({ isOpen, onClose, onConfirm, qualifikation, isDeactivating }: DeactivateQualifikationDialogProps) => {
  if (!qualifikation) return null;
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      {' '}
      <Dialog.Title>
        {' '}
        <div className="flex items-center gap-2 text-status-warning-text">
          {' '}
          <PiWarning className="h-5 w-5" /> Qualifikation deaktivieren{' '}
        </div>{' '}
      </Dialog.Title>{' '}
      <Dialog.Body>
        {' '}
        <div className="space-y-4">
          {' '}
          <Text>Möchten Sie die folgende Qualifikation wirklich deaktivieren?</Text>{' '}
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            {' '}
            <div className="flex items-start justify-between">
              {' '}
              <div>
                {' '}
                <div className="flex items-center gap-2">
                  {' '}
                  <span className="font-mono font-semibold text-text-primary">{qualifikation.abkuerzung}</span>{' '}
                  <Badge variant="info" size="sm">
                    {' '}
                    {KATEGORIE_LABELS[qualifikation.kategorie]}{' '}
                  </Badge>{' '}
                </div>{' '}
                <Text className="mt-1 text-text-secondary">{qualifikation.name}</Text>{' '}
                {qualifikation.beschreibung && <Text className="mt-2 text-sm text-text-muted">{qualifikation.beschreibung}</Text>}{' '}
              </div>{' '}
            </div>{' '}
          </div>{' '}
          <div className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3">
            {' '}
            <Text className="text-sm text-status-warning-text">
              {' '}
              <strong>Hinweis:</strong> Deaktivierte Qualifikationen können nicht mehr neuen Kräften zugewiesen werden. Bestehende Zuweisungen bleiben erhalten.{' '}
            </Text>{' '}
          </div>{' '}
        </div>{' '}
      </Dialog.Body>{' '}
      <Dialog.Footer>
        {' '}
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isDeactivating}>
          {' '}
          Abbrechen{' '}
        </Button>{' '}
        <Button intent="danger" onClick={onConfirm} loading={isDeactivating} disabled={isDeactivating}>
          {' '}
          Deaktivieren{' '}
        </Button>{' '}
      </Dialog.Footer>{' '}
    </Dialog>
  );
};
