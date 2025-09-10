import { Button } from '@atoms/button.atom';
import type { EinsatzResponseDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Link, useNavigate } from '@tanstack/react-router';
import { PiArchive, PiArrowLeft, PiCaretLeft, PiCaretRight, PiFloppyDisk, PiPencilSimple, PiSpinner, PiX } from 'react-icons/pi';

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

export function EinsatzHeader({ einsatz, isArchived, isEditing, previousEinsatzId, nextEinsatzId, onEdit, onSave, onCancel, onArchive, isSaving, isFormDirty = false }: EinsatzHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex-shrink-0 border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/app/einsaetze">
              <Button variant="ghost" size="sm">
                <PiArrowLeft className="h-5 w-5" />
                <span className="ml-2 hidden sm:inline">Zurück zur Übersicht</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => previousEinsatzId && navigate({ to: '/app/einsaetze/$einsatzId', params: { einsatzId: previousEinsatzId } })}
                disabled={!previousEinsatzId}
                title="Vorheriger Einsatz"
              >
                <PiCaretLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
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
                {einsatz.status === EinsatzResponseDtoStatusEnum.Abgeschlossen && (
                  <Button variant="secondary" onClick={onArchive} className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/20">
                    <PiArchive className="mr-2 h-5 w-5" />
                    Archivieren
                  </Button>
                )}
                {einsatz.status !== EinsatzResponseDtoStatusEnum.Archiviert && (
                  <Button onClick={onEdit}>
                    <PiPencilSimple className="mr-2 h-5 w-5" />
                    Bearbeiten
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onCancel}>
                  <PiX className="mr-2 h-5 w-5" />
                  Abbrechen
                </Button>
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
