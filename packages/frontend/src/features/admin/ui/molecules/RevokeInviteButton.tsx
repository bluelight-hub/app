import { useState } from 'react';
import { PiProhibit } from 'react-icons/pi';

import { useRevokeInvite } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

interface RevokeInviteButtonProps {
  /** ID des Invite-Codes */
  inviteId: string;
  /** Status des Invite-Codes */
  status: 'active' | 'used' | 'expired' | 'revoked';
}

/**
 * Button zum Widerrufen eines Invite-Codes mit Bestätigungsdialog.
 *
 * Deaktiviert fuer Status 'used' und 'revoked'.
 * Zeigt Headless UI Dialog zur Bestaetigung der Aktion.
 * Verwendet useRevokeInvite Hook fuer API-Mutation.
 *
 * @example
 * ```tsx
 * <RevokeInviteButton inviteId="123" status="active" />
 * ```
 */
export function RevokeInviteButton({ inviteId, status }: RevokeInviteButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const revokeMutation = useRevokeInvite();
  const isDisabled = status === 'used' || status === 'revoked';

  const handleRevoke = async () => {
    try {
      await revokeMutation.mutateAsync(inviteId);
      setIsConfirmOpen(false);
    } catch (_error) {
      // Error handling via toast in useRevokeInvite hook
    }
  };

  return (
    <>
      <Button intent="danger" appearance="minimal" size="sm" onClick={() => setIsConfirmOpen(true)} disabled={isDisabled} aria-label="Invite-Code widerrufen">
        <PiProhibit className="h-4 w-4" />
      </Button>

      <Dialog.Confirm
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleRevoke}
        title="Invite-Code widerrufen"
        message={
          <div className="space-y-2">
            <p className="text-text-secondary">Möchten Sie diesen Invite-Code wirklich widerrufen?</p>
            <p className="text-sm text-text-muted">Diese Aktion kann nicht rückgängig gemacht werden. Der Code kann nach dem Widerruf nicht mehr verwendet werden.</p>
          </div>
        }
        confirmLabel="Widerrufen"
        cancelLabel="Abbrechen"
        variant="danger"
        isProcessing={revokeMutation.isPending}
        size="md"
      />
    </>
  );
}
