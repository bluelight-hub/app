import { PiWarning } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

interface TokenRevokeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokenName: string;
  tokenId: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TokenRevokeConfirmDialog({ isOpen, onClose, tokenName, tokenId, onConfirm, isLoading }: TokenRevokeConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} closeOnEscape={!isLoading} closeOnClickOutside={!isLoading}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-status-danger-text">
          <PiWarning className="h-5 w-5" aria-hidden="true" />
          <span>Access-Token deaktivieren</span>
        </div>
      </Dialog.Title>
      <Dialog.Body>
        <div className="space-y-4">
          <Text>Möchten Sie das folgende Token wirklich deaktivieren?</Text>

          <div className="rounded-panel border border-border-subtle bg-surface-raised p-4">
            <div className="font-medium text-text-primary">{tokenName}</div>
            <code className="mt-1 font-mono text-text-muted text-xs">ID: {tokenId}</code>
          </div>

          <div className="rounded-panel border border-status-danger-border bg-status-danger-surface p-3">
            <Text className="text-sm text-status-danger-text">
              <strong>Warnung:</strong> Alle Geräte mit diesem Token verlieren sofort den Zugriff auf das System. Sie können das Token später wieder reaktivieren.
            </Text>
          </div>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={onClose} disabled={isLoading}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={onConfirm} loading={isLoading} disabled={isLoading}>
          Deaktivieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
