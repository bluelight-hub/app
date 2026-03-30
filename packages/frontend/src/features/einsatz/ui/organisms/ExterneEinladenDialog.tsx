/**
 * Dialog zum Einladen externer Personen zu einem Einsatz
 *
 * Ermöglicht Führungskräften, externe Personen per Combobox auszuwählen
 * und zu einem Einsatz einzuladen. Bereits eingeladene Personen werden
 * als separate Gruppe angezeigt und können nicht erneut eingeladen werden.
 */

import { useInviteExterne, useBeitrittsanfragen } from '@/features/operative-roles';
import { api } from '@/shared';
import type { ManagedUsersListResponse, ResponseError } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
import type { ComboboxGroup } from '@/shared/ui/headless/combobox';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PiUserPlus, PiWarning } from 'react-icons/pi';

interface ExterneEinladenDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Einladen von externen Personen
 *
 * Lädt die Benutzerliste über die Admin-API und filtert nach EXTERNE-Rolle.
 * Zeigt bereits eingeladene Personen in einer separaten Gruppe an.
 */
export function ExterneEinladenDialog({ einsatzId, isOpen, onClose }: ExterneEinladenDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const inviteExterne = useInviteExterne();

  // Benutzerliste laden (nur wenn Dialog offen)
  const {
    data: usersData,
    isLoading: isUsersLoading,
    error: usersError,
  } = useQuery<ManagedUsersListResponse, ResponseError>({
    queryKey: ['admin', 'users', 'externe-einladen'],
    queryFn: async () => {
      return await api.userManagement().userManagementControllerFindAllVAlpha();
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

    const externeUsers = usersData.data.filter((u) => u.operativeRole === 'EXTERNE' && !u.isLocked);

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
    return usersData.data.filter((u) => u.operativeRole === 'EXTERNE' && !u.isLocked).length === 0;
  }, [usersData]);

  const isAdminError = useMemo(() => {
    if (!usersError) return false;
    return usersError.response?.status === 403 || usersError.response?.status === 401;
  }, [usersError]);

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
            {isAdminError ? (
              <div className="flex items-start gap-3 rounded-panel border border-status-warning-border bg-status-warning-surface p-4">
                <PiWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning-text" />
                <div>
                  <p className="text-body-sm font-medium text-status-warning-text">Admin-Rechte erforderlich</p>
                  <p className="mt-1 text-body-xs text-text-secondary">Zum Laden der Benutzerliste werden Admin-Rechte benötigt. Bitte melden Sie sich als Admin an.</p>
                </div>
              </div>
            ) : isUsersLoading ? (
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
        <Button intent="primary" onClick={handleInvite} disabled={!selectedUserId || invitedUserIds.has(selectedUserId) || inviteExterne.isPending || isAdminError} loading={inviteExterne.isPending}>
          <PiUserPlus className="h-4 w-4" />
          Einladen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
