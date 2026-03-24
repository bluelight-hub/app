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
} /** * Bestätigungsdialog zum Deaktivieren eines Fahrzeugtyps. */
export const DeactivateFahrzeugtypDialog = ({ isOpen, onClose, onConfirm, fahrzeugtyp, isDeactivating }: DeactivateFahrzeugtypDialogProps) => {
  if (!fahrzeugtyp) return null;
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      {' '}
      <Dialog.Title>
        {' '}
        <div className="flex items-center gap-2 text-status-warning-text">
          {' '}
          <PiWarning className="h-5 w-5" /> Fahrzeugtyp deaktivieren{' '}
        </div>{' '}
      </Dialog.Title>{' '}
      <Dialog.Body>
        {' '}
        <div className="space-y-4">
          {' '}
          <Text>Möchten Sie den folgenden Fahrzeugtyp wirklich deaktivieren?</Text>{' '}
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 ">
            {' '}
            <div className="flex items-start justify-between">
              {' '}
              <div>
                {' '}
                <div className="flex items-center gap-2">
                  {' '}
                  <span className="font-mono font-semibold text-text-primary">{fahrzeugtyp.code}</span>{' '}
                  <Badge variant="info" size="sm">
                    {' '}
                    {FAHRZEUGTYP_KATEGORIE_LABELS[fahrzeugtyp.kategorie]}{' '}
                  </Badge>{' '}
                </div>{' '}
                <Text className="mt-1 text-text-secondary">{fahrzeugtyp.bezeichnung}</Text>{' '}
                {fahrzeugtyp.beschreibung && <Text className="mt-2 text-text-muted text-sm ">{fahrzeugtyp.beschreibung}</Text>}{' '}
              </div>{' '}
            </div>{' '}
          </div>{' '}
          <div className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3">
            {' '}
            <Text className="text-status-warning-text text-sm">
              {' '}
              <strong>Hinweis:</strong> Deaktivierte Fahrzeugtypen können nicht mehr für neue Fahrzeuge ausgewählt werden. Bestehende Zuordnungen bleiben erhalten.{' '}
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
