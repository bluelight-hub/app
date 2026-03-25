import { useCallback, useState } from 'react';
import { PiLightning, PiTimer, PiArrowClockwise } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';

import { useActivateGlobalFuehrungsrhythmusTemplate, useActivateEinsatzFuehrungsrhythmusTemplate } from '../../api';

interface EintragPreview {
  id: string;
  titel: string;
  intervallMinuten: number;
  offsetMinuten: number;
  sortOrder: number;
}

interface TemplateInfo {
  id: string;
  name: string;
  beschreibung: string | null;
  eintraege: EintragPreview[];
}

interface ActivateFuehrungsrhythmusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: TemplateInfo;
  einsatzId: string;
  /** Scope bestimmt welcher Activate-Hook verwendet wird. Default: 'GLOBAL'. */
  scope?: 'GLOBAL' | 'EINSATZ';
}

/**
 * Bestaetigungsdialog zum Aktivieren eines Fuehrungsrhythmus-Templates (Story 6.7 AC1, AC2).
 *
 * Zeigt eine Vorschau der zu erstellenden Erinnerungen und erstellt bei Bestaetigung
 * alle wiederkehrenden Erinnerungen atomar.
 */
export function ActivateFuehrungsrhythmusDialog({ isOpen, onClose, template, einsatzId, scope = 'GLOBAL' }: ActivateFuehrungsrhythmusDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const globalMutation = useActivateGlobalFuehrungsrhythmusTemplate();
  const einsatzMutation = useActivateEinsatzFuehrungsrhythmusTemplate();
  const { mutate: activate, isPending } = scope === 'EINSATZ' ? einsatzMutation : globalMutation;

  const handleActivate = useCallback(() => {
    setApiErrorMessage(null);

    activate(
      {
        templateId: template.id,
        einsatzId,
      },
      {
        onSuccess: (data) => {
          const count = data?.erstellteErinnerungen?.length ?? template.eintraege.length;
          toast.success('Fuehrungsrhythmus aktiviert', {
            description: `${count} wiederkehrende Erinnerungen erstellt.`,
          });
          onClose();
        },
        onError: async (error) => {
          const message = await getApiErrorMessage(error, 'Fehler beim Aktivieren des Templates', 'activateFuehrungsrhythmusTemplate');
          setApiErrorMessage(message);
          toast.error('Aktivierung fehlgeschlagen', { description: message });
        },
      },
    );
  }, [activate, template, einsatzId, onClose]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      onClose();
    }
  }, [isPending, onClose]);

  const sortedEintraege = [...template.eintraege].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiLightning className="h-5 w-5 text-status-warning-text" />
        </div>
        <Dialog.Title>Fuehrungsrhythmus aktivieren</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-4">
          {/* Template Info */}
          <div>
            <p className="text-sm text-text-secondary">
              Fuehrungsrhythmus <span className="font-semibold">"{template.name}"</span> aktivieren?
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Es werden {sortedEintraege.length} wiederkehrende {sortedEintraege.length === 1 ? 'Erinnerung' : 'Erinnerungen'} erstellt.
            </p>
          </div>

          {/* Erinnerungs-Vorschau */}
          <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
            <div className="space-y-2">
              {sortedEintraege.map((eintrag) => (
                <div key={eintrag.id} className="flex items-center justify-between rounded-control bg-surface-panel px-3 py-2 text-sm">
                  <span className="font-medium text-text-secondary">{eintrag.titel}</span>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <PiArrowClockwise className="h-3 w-3" />
                      alle {eintrag.intervallMinuten} Min
                    </span>
                    <span className="flex items-center gap-1">
                      <PiTimer className="h-3 w-3" />
                      {eintrag.offsetMinuten === 0 ? 'sofort' : `+${eintrag.offsetMinuten} Min`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
        </div>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="primary" loading={isPending} disabled={isPending} onClick={handleActivate}>
          Aktivieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
