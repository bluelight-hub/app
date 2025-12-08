import { useActiveEinsatz } from '@/features/einsatz';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { CloseButton } from '@/shared/ui/atoms/close-button.atom';
import type { EinsatzResponseDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Link, useNavigate } from '@tanstack/react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiArchive, PiArrowLeft, PiCaretLeft, PiCaretRight, PiCheckCircle, PiFloppyDisk, PiLightning, PiPencilSimple, PiSpinner } from 'react-icons/pi';
import { toast } from 'sonner';

interface EinsatzHeaderProps {
  einsatz: EinsatzResponseDto;
  isArchived: boolean;
  isEditing: boolean;
  previousEinsatzId: string | null;
  nextEinsatzId: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onArchive: () => void;
  isSaving: boolean;
  isFormDirty?: boolean;
}

export function EinsatzHeader({ einsatz, isEditing, previousEinsatzId, nextEinsatzId, onEdit, onSave, onCancel, onArchive, isSaving, isFormDirty = false }: EinsatzHeaderProps) {
  const navigate = useNavigate();
  const { activeEinsatz, setActiveEinsatz, clearActiveEinsatz } = useActiveEinsatz();
  const isCurrentlyActive = activeEinsatz?.id === einsatz.id;
  const canBeActive = einsatz.status === EinsatzResponseDtoStatusEnum.Angelegt || einsatz.status === EinsatzResponseDtoStatusEnum.InBearbeitung;

  const handleActivateEinsatz = async () => {
    try {
      await setActiveEinsatz(einsatz.id);
      await navigate({ to: '/app/einsatz/$einsatzId', params: { einsatzId: einsatz.id } });
    } catch (error) {
      toast.error('Fehler beim Aktivieren des Einsatzes');
      logger.error('Fehler beim Aktivieren des Einsatzes:', error);
    }
  };

  const handleDeactivateEinsatz = () => {
    clearActiveEinsatz();
    toast.info('Einsatz deaktiviert', {
      description: 'Der Einsatz ist nicht mehr aktiv.',
    });
  };

  useHotkeys('esc', () => {
    navigate({ to: '/app/einsaetze' });
  });

  useHotkeys(
    'mod+o',
    async () => {
      if (!einsatz) return;
      await handleActivateEinsatz();
    },
    [einsatz, handleActivateEinsatz],
    { preventDefault: true },
  );

  return (
    <div className="flex-shrink-0 border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/app/einsaetze">
              <Button appearance="ghost" size="sm">
                <PiArrowLeft className="h-5 w-5" />
                <span className="ml-2 hidden sm:inline">Zurück zur Übersicht</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                appearance="ghost"
                size="sm"
                onClick={() => previousEinsatzId && navigate({ to: '/app/einsaetze/$einsatzId', params: { einsatzId: previousEinsatzId } })}
                disabled={!previousEinsatzId}
                title="Vorheriger Einsatz"
              >
                <PiCaretLeft className="h-5 w-5" />
              </Button>
              <Button
                appearance="ghost"
                size="sm"
                onClick={() => nextEinsatzId && navigate({ to: '/app/einsaetze/$einsatzId', params: { einsatzId: nextEinsatzId } })}
                disabled={!nextEinsatzId}
                title="Nächster Einsatz"
              >
                <PiCaretRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
                {canBeActive && !isCurrentlyActive && (
                  <Button onClick={handleActivateEinsatz} size="lg">
                    <PiLightning className="mr-2 h-5 w-5" />
                    Einsatz starten
                  </Button>
                )}
                {isCurrentlyActive && (
                  <Button onClick={handleDeactivateEinsatz} intent="secondary">
                    <PiCheckCircle className="mr-2 h-5 w-5" />
                    Aktiv
                  </Button>
                )}
                {einsatz.status === EinsatzResponseDtoStatusEnum.Abgeschlossen && (
                  <Button appearance="outline" intent="warning" onClick={onArchive}>
                    <PiArchive className="mr-2 h-5 w-5" />
                    Archivieren
                  </Button>
                )}
                {einsatz.status !== EinsatzResponseDtoStatusEnum.Archiviert && (
                  <Button onClick={onEdit} appearance="ghost">
                    <PiPencilSimple className="mr-2 h-5 w-5" />
                    Bearbeiten
                  </Button>
                )}
              </>
            ) : (
              <>
                <CloseButton onClick={onCancel} label="Abbrechen" />
                <Button onClick={onSave} disabled={isSaving || !isFormDirty}>
                  {isSaving ? <PiSpinner className="mr-2 h-5 w-5 animate-spin" /> : <PiFloppyDisk className="mr-2 h-5 w-5" />}
                  Speichern
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
