/**
 * Dialog zum Beitritt/Person-Setup für einen Einsatz
 *
 * Ermöglicht es dem User, sich mit einer EinsatzPerson für den aktuellen Einsatz zu verknüpfen.
 * Die Person-Daten werden dann für ETB-Einträge automatisch vorausgefüllt.
 */

import { useJoinEinsatz, useMyEinsatzTeilnahme, useEinsatzTeilnehmer } from '@/features/einsatz/api';
import { EinsatzPersonenPicker } from '@/features/kraefte/ui/molecules/EinsatzPersonenPicker';
import { PersonHinzufuegenDialog } from './PersonHinzufuegenDialog.organism';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useEffect, useMemo, useState } from 'react';
import { PiPlus, PiUser } from 'react-icons/pi';

interface EinsatzBeitrittDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Setzen/Ändern der verknüpften Person für einen Einsatz
 *
 * Zeigt einen Person-Picker (bestehende EinsatzPerson auswählen) und
 * eine Option zum Erstellen einer neuen Person.
 */
export function EinsatzBeitrittDialog({ einsatzId, isOpen, onClose }: EinsatzBeitrittDialogProps) {
  const { data: teilnahmeData, isLoading: isTeilnahmeLoading } = useMyEinsatzTeilnahme(einsatzId);
  const { data: alleTeilnehmer } = useEinsatzTeilnehmer(einsatzId);
  const joinEinsatz = useJoinEinsatz();

  const currentEinsatzPersonId = teilnahmeData?.data?.einsatzPersonId || '';
  const isAlreadyJoined = !!teilnahmeData?.data;

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [showPersonDialog, setShowPersonDialog] = useState(false);

  // IDs der Personen die bereits von anderen Bearbeitern verknüpft sind (ausschließen)
  const excludePersonIds = useMemo(() => {
    if (!alleTeilnehmer?.data) return [];
    return alleTeilnehmer.data.filter((t) => t.einsatzPersonId && t.einsatzPersonId !== currentEinsatzPersonId).map((t) => t.einsatzPersonId);
  }, [alleTeilnehmer, currentEinsatzPersonId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId(currentEinsatzPersonId);
    }
  }, [isOpen, currentEinsatzPersonId]);

  const handleSubmit = async () => {
    if (!selectedPersonId) return;

    await joinEinsatz.mutateAsync({
      einsatzId,
      data: { einsatzPersonId: selectedPersonId },
    });
    onClose();
  };

  const handlePersonCreated = (person: { id: string }) => {
    setSelectedPersonId(person.id);
    setShowPersonDialog(false);
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
        <Dialog.CloseButton onClose={onClose} />

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <PiUser className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="flex-1">
            <Dialog.Title className="font-semibold text-gray-900 text-lg dark:text-white">{isAlreadyJoined ? 'Person ändern' : 'Einsatz beitreten'}</Dialog.Title>

            <Dialog.Body className="mt-2">
              <p className="text-gray-600 text-sm dark:text-gray-400">
                {isAlreadyJoined
                  ? 'Ändern Sie Ihre verknüpfte Person für diesen Einsatz.'
                  : 'Wählen Sie Ihre Person für diesen Einsatz. Die Person-Daten werden für ETB-Einträge automatisch vorausgefüllt.'}
              </p>

              <div className="mt-4 space-y-3">
                <EinsatzPersonenPicker
                  einsatzId={einsatzId}
                  value={selectedPersonId}
                  onChange={setSelectedPersonId}
                  disabled={isTeilnahmeLoading || joinEinsatz.isPending}
                  label="Person"
                  placeholder="Person auswählen..."
                  excludePersonIds={excludePersonIds}
                />

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-gray-400 text-xs">oder</span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                <Button appearance="ghost" size="sm" className="w-full justify-center" onClick={() => setShowPersonDialog(true)} disabled={joinEinsatz.isPending}>
                  <PiPlus className="mr-2 h-4 w-4" />
                  Neue Person erstellen
                </Button>
              </div>
            </Dialog.Body>
          </div>
        </div>

        <Dialog.Footer>
          <Button appearance="ghost" size="sm" onClick={onClose} disabled={joinEinsatz.isPending}>
            Abbrechen
          </Button>
          <Button intent="primary" size="sm" onClick={handleSubmit} disabled={joinEinsatz.isPending || isTeilnahmeLoading || !selectedPersonId}>
            {joinEinsatz.isPending ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Speichern...
              </>
            ) : isAlreadyJoined ? (
              'Ändern'
            ) : (
              'Beitreten'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog>

      <PersonHinzufuegenDialog isOpen={showPersonDialog} onClose={() => setShowPersonDialog(false)} einsatzId={einsatzId} onPersonCreated={handlePersonCreated} />
    </>
  );
}
