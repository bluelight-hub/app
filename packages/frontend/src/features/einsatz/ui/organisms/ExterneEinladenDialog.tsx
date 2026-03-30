/**
 * Dialog zum Einladen externer Personen zu einem Einsatz
 *
 * Ermöglicht Führungskräften, externe Personen per Combobox auszuwählen
 * und zu einem Einsatz einzuladen. Bereits eingeladene Personen werden
 * als separate Gruppe angezeigt und können nicht erneut eingeladen werden.
 */

import { useInviteExterne, useBeitrittsanfragen } from '@/features/operative-roles';
import { api } from '@/shared';
import type { EinsatzBeitrittControllerGetExterneUsersVAlpha200Response, ResponseError } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
import type { ComboboxGroup } from '@/shared/ui/headless/combobox';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PiUserPlus } from 'react-icons/pi';

interface ExterneEinladenDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Einladen von externen Personen
 *
 * Lädt die Liste der EXTERNE-User über den Beitritt-Endpoint (JWT-Auth).
 * Zeigt bereits eingeladene Personen in einer separaten Gruppe an.
 */
export function ExterneEinladenDialog({ einsatzId, isOpen, onClose }: ExterneEinladenDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const inviteExterne = useInviteExterne();

  // EXTERNE-User über den Beitritt-Endpoint laden (kein Admin nötig)
  const { data: usersData, isLoading: isUsersLoading } = useQuery<EinsatzBeitrittControllerGetExterneUsersVAlpha200Response, ResponseError>({
    queryKey: ['einsatz-beitritt', einsatzId, 'externe-users'],
    queryFn: async () => {
      return await api.einsatzBeitritt().einsatzBeitrittControllerGetExterneUsersVAlpha({ einsatzId });
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  // Bestehende Beitrittsanfragen für diesen Einsatz laden
  const { data: beitrittsanfragen = [] } = useBeitrittsanfragen(einsatzId);

  // IDs der bereits eingeladenen/genehmigten User
  const invitedUserIds = useMemo(() => {
    return new Set(beitrittsanfragen.filter((ba) => ba.status === 'GENEHMIGT').map((ba) => ba.userId));
  }, [beitrittsanfragen]);

  // Combobox-Gruppen erstellen: Verfügbar / Bereits eingeladen
  const comboboxGroups: ComboboxGroup[] = useMemo(() => {
    if (!usersData?.data) return [];

    const externeUsers = usersData.data;

    const verfuegbar = externeUsers
      .filter((u) => !invitedUserIds.has(u.id))
      .map((u) => ({
        value: u.id,
        label: u.username,
      }));

    const bereitsEingeladen = externeUsers
      .filter((u) => invitedUserIds.has(u.id))
      .map((u) => ({
        value: u.id,
        label: `${u.username} (bereits eingeladen)`,
      }));

    const groups: ComboboxGroup[] = [];

    if (verfuegbar.length > 0) {
      groups.push({ label: 'Verfügbar', items: verfuegbar });
    }
    if (bereitsEingeladen.length > 0) {
      groups.push({ label: 'Bereits eingeladen', items: bereitsEingeladen });
    }

    return groups;
  }, [usersData, invitedUserIds]);

  const hasNoExterneUsers = useMemo(() => {
    if (!usersData?.data) return false;
    return usersData.data.length === 0;
  }, [usersData]);

  const handleInvite = async () => {
    if (!selectedUserId || invitedUserIds.has(selectedUserId)) return;

    try {
      await inviteExterne.mutateAsync({ einsatzId, userId: selectedUserId });
      setSelectedUserId('');
      onClose();
    } catch {
      // Fehler wird in useInviteExterne per Toast behandelt
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <Dialog.CloseButton onClose={handleClose} />

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-info-surface">
            <PiUserPlus className="h-6 w-6 text-status-info-text" />
          </div>
        </div>

        <div className="flex-1">
          <Dialog.Title>Externe Person einladen</Dialog.Title>

          <Dialog.Body>
            {isUsersLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-action-primary border-t-transparent" />
                <span className="ml-3 text-body-sm text-text-secondary">Lade Benutzerliste...</span>
              </div>
            ) : hasNoExterneUsers ? (
              <div className="rounded-panel border border-border-subtle bg-surface-raised p-4 text-center">
                <p className="text-body-sm text-text-secondary">Keine externen Personen verfügbar. Externe Benutzer müssen zuerst in der Admin-Verwaltung angelegt werden.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-sm text-text-secondary">Wählen Sie eine externe Person aus, die zu diesem Einsatz eingeladen werden soll.</p>
                <Combobox groups={comboboxGroups} value={selectedUserId} onChange={(value) => setSelectedUserId(value)} placeholder="Person suchen..." label="Externe Person" openOnFocus />
              </div>
            )}
          </Dialog.Body>
        </div>
      </div>

      <Dialog.Footer loading={inviteExterne.isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={inviteExterne.isPending}>
          Abbrechen
        </Button>
        <Button intent="primary" onClick={handleInvite} disabled={!selectedUserId || invitedUserIds.has(selectedUserId) || inviteExterne.isPending} loading={inviteExterne.isPending}>
          <PiUserPlus className="h-4 w-4" />
          Einladen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
