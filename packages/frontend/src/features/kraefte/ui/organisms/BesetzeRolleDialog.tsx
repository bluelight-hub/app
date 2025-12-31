/**
 * BesetzeRolleDialog fuer die Zuweisung einer Person zu einer Rolle.
 *
 * **Story 6.1c - Rollen-Zuweisung (AC3):**
 * MVP: Einfacher Dialog mit ID-Eingabe. Vollstaendige Personenauswahl in spaeteren Stories.
 */

import { useCallback, useState } from 'react';
import { PiUserPlus } from 'react-icons/pi';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useBesetzeRolle } from '../../api';

interface BesetzeRolleDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Einsatz ID */
  einsatzId: string;
  /** Optionale vorausgewaehlte RollenDefinition ID */
  rollenDefinitionId?: string;
}

/**
 * Extrahiert Error Code aus API-Fehler und liefert benutzerfreundliche Meldung.
 *
 * Bekannte Fehlercodes werden uebersetzt:
 * - ROLLE_ALREADY_BESETZT -> "Diese Rolle ist bereits besetzt"
 * - PERSON_NOT_FOUND -> "Person nicht gefunden"
 * - PERSON_BEREITS_AUF_ANDERER_ROLLE -> "Person ist bereits einer anderen Rolle zugewiesen"
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('already_besetzt') || message.includes('bereits besetzt')) {
      return 'Diese Rolle ist bereits besetzt';
    }
    if (message.includes('person_not_found') || message.includes('person nicht gefunden')) {
      return 'Person nicht gefunden';
    }
    if (message.includes('bereits_auf_anderer_rolle') || message.includes('already assigned')) {
      return 'Person ist bereits einer anderen Rolle zugewiesen';
    }
  }
  return 'Fehler beim Besetzen der Rolle';
}

/**
 * Dialog zum Besetzen einer Rolle mit einer EinsatzPerson.
 *
 * MVP-Implementierung: Einfache Texteingabe fuer IDs.
 * In spaeteren Stories wird eine vollstaendige Personenauswahl implementiert.
 */
export function BesetzeRolleDialog({ isOpen, onClose, einsatzId, rollenDefinitionId: initialRollenDefinitionId }: BesetzeRolleDialogProps) {
  const [rollenDefinitionId, setRollenDefinitionId] = useState(initialRollenDefinitionId ?? '');
  const [einsatzPersonId, setEinsatzPersonId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: besetzeRolle, isPending } = useBesetzeRolle(einsatzId);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!rollenDefinitionId.trim() || !einsatzPersonId.trim()) {
        setErrorMessage('Bitte alle Felder ausfuellen');
        return;
      }

      setErrorMessage(null);
      besetzeRolle(
        {
          rollenDefinitionId: rollenDefinitionId.trim(),
          einsatzPersonId: einsatzPersonId.trim(),
        },
        {
          onSuccess: () => {
            setRollenDefinitionId('');
            setEinsatzPersonId('');
            onClose();
          },
          onError: (error) => {
            setErrorMessage(getErrorMessage(error));
          },
        },
      );
    },
    [rollenDefinitionId, einsatzPersonId, besetzeRolle, onClose],
  );

  const handleClose = useCallback(() => {
    if (!isPending) {
      setErrorMessage(null);
      setRollenDefinitionId(initialRollenDefinitionId ?? '');
      setEinsatzPersonId('');
      onClose();
    }
  }, [isPending, initialRollenDefinitionId, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
          <PiUserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <Dialog.Title>Rolle besetzen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form id="besetze-rolle-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rollenDefinitionId" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Rollen-Definition ID
            </label>
            <input
              type="text"
              id="rollenDefinitionId"
              value={rollenDefinitionId}
              onChange={(e) => setRollenDefinitionId(e.target.value)}
              disabled={isPending || !!initialRollenDefinitionId}
              placeholder="z.B. cuid2..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
          </div>

          <div>
            <label htmlFor="einsatzPersonId" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Einsatz-Person ID
            </label>
            <input
              type="text"
              id="einsatzPersonId"
              value={einsatzPersonId}
              onChange={(e) => setEinsatzPersonId(e.target.value)}
              disabled={isPending}
              placeholder="z.B. cuid2..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
            <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">MVP: Vollstaendige Personenauswahl in spaeteren Stories.</p>
          </div>

          {/* Error Message */}
          {errorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{errorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="besetze-rolle-form" intent="primary" loading={isPending} disabled={isPending}>
          Zuweisen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
