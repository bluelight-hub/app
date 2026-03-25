/**
 * ServerSwitchWarningDialog Molekül
 *
 * Warndialog der angezeigt wird, wenn ein eingeloggter User
 * zu einem anderen Server wechseln möchte. Informiert über
 * die notwendige Abmeldung vor dem Server-Wechsel.
 *
 * @module features/server/ui/molecules/ServerSwitchWarningDialog
 */

import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { PiWarning, PiSignOut } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms';
import type { ServerConfig } from '../../types/server-config';

export interface ServerSwitchWarningDialogProps {
  /** Aktuell aktiver Server */
  currentServer: ServerConfig;
  /** Server zu dem gewechselt werden soll */
  targetServer: ServerConfig;
  /** Ob der Dialog geöffnet ist */
  open: boolean;
  /** Callback wenn Wechsel bestätigt wird (Logout + Server-Wechsel) */
  onConfirm: () => void;
  /** Callback wenn Wechsel abgebrochen wird */
  onCancel: () => void;
  /** Loading-State während Logout/Wechsel */
  isLoading?: boolean;
}

/**
 * Warndialog für Server-Wechsel bei eingeloggtem User.
 *
 * Zeigt eine Warnung an, dass der User abgemeldet wird,
 * bevor er zu einem anderen Server wechseln kann.
 * Nutzt role="alertdialog" für WCAG Accessibility Compliance.
 */
export function ServerSwitchWarningDialog({ currentServer, targetServer, open, onConfirm, onCancel, isLoading = false }: ServerSwitchWarningDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      className="relative z-50"
      data-testid="switch-server-dialog"
      role="alertdialog"
      aria-labelledby="switch-warning-title"
      aria-describedby="switch-warning-description"
    >
      {/* Backdrop */}
      <DialogBackdrop transition className="fixed inset-0 bg-surface-inverse/50 backdrop-blur-sm transition-opacity data-[closed]:opacity-0" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel transition className="mx-auto w-full max-w-sm transform rounded-xl bg-surface-panel p-6 shadow-xl transition-all data-[closed]:scale-95 data-[closed]:opacity-0">
          {/* Warning Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-warning-surface">
            <PiWarning className="h-6 w-6 text-status-warning-text" aria-hidden="true" />
          </div>

          {/* Title */}
          <DialogTitle id="switch-warning-title" className="mt-4 text-center text-lg font-semibold text-text-primary">
            Server wechseln
          </DialogTitle>

          {/* Description */}
          <Description id="switch-warning-description" className="mt-2 text-center text-sm text-text-secondary">
            Um zu Server <span className="font-medium text-text-primary">"{targetServer.name}"</span> zu wechseln, musst du dich zuerst abmelden.
          </Description>

          {/* Info */}
          <p className="mt-2 text-center text-xs text-text-muted">
            Deine aktuelle Session auf <span className="font-medium">"{currentServer.name}"</span> wird beendet.
          </p>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button type="button" appearance="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
              Abbrechen
            </Button>
            <Button type="button" intent="warning" appearance="filled" onClick={onConfirm} loading={isLoading} className="flex-1">
              <PiSignOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Abmelden und wechseln
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
