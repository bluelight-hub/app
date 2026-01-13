import { PiWarning } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';

interface TokenRevokeConfirmDialogProps {
  /**
   * Ob der Dialog geoeffnet ist
   */
  isOpen: boolean;
  /**
   * Callback zum Schliessen des Dialogs
   */
  onClose: () => void;
  /**
   * Name des zu widerrufenden Tokens
   */
  tokenName: string;
  /**
   * ID des zu widerrufenden Tokens
   */
  tokenId: string;
  /**
   * Callback bei Bestaetigung
   */
  onConfirm: () => void;
  /**
   * Loading-State waehrend der API-Anfrage
   */
  isLoading: boolean;
}

/**
 * TokenRevokeConfirmDialog Organism
 *
 * Bestaetigungsdialog zum Widerrufen eines Access-Tokens.
 * Warnt den Benutzer vor den Auswirkungen der Deaktivierung:
 * - Alle Geraete mit diesem Token verlieren sofort den Zugriff
 * - Das Token kann spaeter wieder reaktiviert werden
 *
 * Verwendet Headless UI Dialog mit Tailwind CSS Dark Mode Support.
 *
 * @example
 * ```tsx
 * <TokenRevokeConfirmDialog
 *   isOpen={isDialogOpen}
 *   onClose={() => setIsDialogOpen(false)}
 *   tokenName="Produktiv-Server"
 *   tokenId="abc123"
 *   onConfirm={handleRevoke}
 *   isLoading={isRevoking}
 * />
 * ```
 */
export function TokenRevokeConfirmDialog({ isOpen, onClose, tokenName, tokenId, onConfirm, isLoading }: TokenRevokeConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} closeOnEscape={!isLoading} closeOnClickOutside={!isLoading}>
      <Dialog.Title>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
          <PiWarning className="h-5 w-5" aria-hidden="true" />
          Access-Token deaktivieren
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <div className="space-y-4">
          <Text>Moechten Sie das folgende Token wirklich deaktivieren?</Text>

          {/* Token Info Box */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="font-medium text-gray-900 dark:text-gray-100">{tokenName}</div>
            <code className="mt-1 font-mono text-gray-500 text-xs dark:text-gray-400">ID: {tokenId}</code>
          </div>

          {/* Warning Box */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <Text className="text-red-800 text-sm dark:text-red-200">
              <strong>Warnung:</strong> Alle Geraete mit diesem Token verlieren sofort den Zugriff auf das System. Sie koennen das Token spaeter wieder reaktivieren.
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
