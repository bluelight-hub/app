import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { PiTrash } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms';
import type { ServerConfig } from '../../types/server-config';

export interface ServerDeleteConfirmDialogProps {
  /** Server der gelöscht werden soll (null wenn Dialog geschlossen) */
  server: ServerConfig | null;
  /** Ob der Dialog geöffnet ist */
  open: boolean;
  /** Callback wenn Löschung bestätigt wird */
  onConfirm: () => void;
  /** Callback wenn Löschung abgebrochen wird */
  onCancel: () => void;
  /** Loading-State während Löschung */
  isLoading?: boolean;
}

/**
 * Bestätigungsdialog zum Entfernen eines Servers.
 *
 * Zeigt eine Warnung mit dem Servernamen an und erfordert
 * eine explizite Bestätigung vor dem Löschen.
 */
export function ServerDeleteConfirmDialog({ server, open, onConfirm, onCancel, isLoading = false }: ServerDeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50" data-testid="delete-server-dialog" role="alertdialog">
      {/* Backdrop */}
      <DialogBackdrop transition className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity data-[closed]:opacity-0" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel transition className="mx-auto w-full max-w-sm transform rounded-xl bg-white p-6 shadow-xl transition-all data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-800">
          {/* Warning Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <PiTrash className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>

          {/* Title */}
          <DialogTitle className="mt-4 text-center font-semibold text-gray-900 text-lg dark:text-white">Server entfernen</DialogTitle>

          {/* Description */}
          <Description className="mt-2 text-center text-gray-600 text-sm dark:text-gray-400">
            Möchtest du den Server <span className="font-medium">"{server?.name}"</span> wirklich entfernen?
          </Description>

          {/* Warning */}
          <p className="mt-2 text-center text-gray-600 text-xs dark:text-gray-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button type="button" appearance="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
              Abbrechen
            </Button>
            <Button type="button" intent="danger" appearance="filled" onClick={onConfirm} loading={isLoading} className="flex-1">
              Entfernen
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
