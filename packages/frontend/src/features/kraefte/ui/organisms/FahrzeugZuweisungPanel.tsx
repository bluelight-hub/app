/**
 * Panel zum Zuweisen und Entfernen von Fahrzeugen zu/von einer taktischen Einheit.
 *
 * Zeigt aktuell zugewiesene Fahrzeuge und eine Liste verfügbarer (unzugewiesener) Fahrzeuge.
 * Nutzt SlideIn-Dialog für komfortable Bedienung.
 * Folgt dem Pattern von PersonZuweisungPanel.
 */

import { useCallback, useMemo } from 'react';

import { PiPlus, PiTrash, PiTruck } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useEinsatzFahrzeuge } from '@/features/kraefte/api/use-einsatz-fahrzeuge';
import { useAssignFahrzeugZuEinheit } from '@/features/kraefte/api/use-assign-fahrzeug-zu-einheit';

interface FahrzeugZuweisungPanelProps {
  /** Ob das Panel geöffnet ist */
  isOpen: boolean;
  /** Handler zum Schließen */
  onClose: () => void;
  /** Einsatz-ID */
  einsatzId: string;
  /** Einheit-ID */
  einheitId: string;
  /** Name der Einheit (für den Panel-Titel) */
  einheitName: string;
}

/**
 * Slide-In Panel für die Fahrzeugzuweisung zu einer Einheit.
 *
 * Zeigt zwei Bereiche:
 * 1. Aktuell zugewiesene Fahrzeuge (mit Entfernen-Button)
 * 2. Verfügbare Fahrzeuge ohne Einheit-Zuweisung (mit Zuweisen-Button)
 */
export function FahrzeugZuweisungPanel({ isOpen, onClose, einsatzId, einheitId, einheitName }: FahrzeugZuweisungPanelProps) {
  const { data: alleFahrzeuge = [], isLoading } = useEinsatzFahrzeuge(einsatzId);

  const { mutate: assignFahrzeug, isPending } = useAssignFahrzeugZuEinheit(einsatzId);

  /** Fahrzeuge die dieser Einheit zugewiesen sind */
  const zugewieseneFahrzeuge = useMemo(() => {
    return alleFahrzeuge.filter((f) => f.einheitId === einheitId);
  }, [alleFahrzeuge, einheitId]);

  /** Fahrzeuge ohne Einheit-Zuweisung */
  const verfuegbareFahrzeuge = useMemo(() => {
    return alleFahrzeuge.filter((f) => !f.einheitId);
  }, [alleFahrzeuge]);

  const handleAssign = useCallback(
    (fahrzeugId: string) => {
      assignFahrzeug({ fahrzeugId, einheitId });
    },
    [assignFahrzeug, einheitId],
  );

  const handleRemove = useCallback(
    (fahrzeugId: string) => {
      assignFahrzeug({ fahrzeugId, einheitId: null });
    },
    [assignFahrzeug],
  );

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={onClose}
      title={`Fahrzeuge: ${einheitName}`}
      description={`${zugewieseneFahrzeuge.length} Fahrzeug${zugewieseneFahrzeuge.length !== 1 ? 'e' : ''} zugewiesen`}
      size="md"
      position="right"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingState message="Lade Fahrzeuge..." fullScreen={false} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Zugewiesene Fahrzeuge */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PiTruck className="h-4 w-4" />
              Zugewiesene Fahrzeuge ({zugewieseneFahrzeuge.length})
            </h3>

            {zugewieseneFahrzeuge.length > 0 ? (
              <div className="space-y-2">
                {zugewieseneFahrzeuge.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="flex items-center justify-between rounded-panel border border-border-subtle bg-surface-panel p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-info-surface">
                        <PiTruck className="h-4 w-4 text-status-info-text" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-xs text-text-muted">{fahrzeug.kennzeichen}</p>}
                      </div>
                    </div>

                    <Button
                      intent="danger"
                      appearance="ghost"
                      size="icon"
                      onClick={() => handleRemove(fahrzeug.id)}
                      disabled={isPending}
                      title="Fahrzeug entfernen"
                      aria-label={`${fahrzeug.funkrufname} entfernen`}
                    >
                      <PiTrash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-panel border border-border-subtle bg-surface-raised px-4 py-6 text-center">
                <PiTruck className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">Noch keine Fahrzeuge zugewiesen</p>
              </div>
            )}
          </section>

          {/* Verfügbare Fahrzeuge */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PiTruck className="h-4 w-4" />
              Verfügbare Fahrzeuge ({verfuegbareFahrzeuge.length})
            </h3>

            {verfuegbareFahrzeuge.length > 0 ? (
              <div className="space-y-2">
                {verfuegbareFahrzeuge.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="flex items-center justify-between rounded-panel border border-border-subtle bg-surface-panel p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised">
                        <PiTruck className="h-4 w-4 text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-xs text-text-muted">{fahrzeug.kennzeichen}</p>}
                      </div>
                    </div>

                    <Button
                      intent="primary"
                      appearance="ghost"
                      size="icon"
                      onClick={() => handleAssign(fahrzeug.id)}
                      disabled={isPending}
                      title="Fahrzeug zuweisen"
                      aria-label={`${fahrzeug.funkrufname} zuweisen`}
                    >
                      <PiPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-panel border border-border-subtle bg-surface-raised px-4 py-6 text-center">
                <p className="text-sm text-text-muted">Keine weiteren Fahrzeuge verfügbar</p>
              </div>
            )}
          </section>
        </div>
      )}
    </Dialog.SlideIn>
  );
}
