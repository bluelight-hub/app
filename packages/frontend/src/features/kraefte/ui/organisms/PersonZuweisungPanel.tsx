/**
 * Panel zum Zuweisen und Entfernen von Personen zu/von einer taktischen Einheit.
 *
 * Zeigt aktuell zugewiesene Personen und eine Liste verfügbarer Personen.
 * Nutzt SlideIn-Dialog für komfortable Bedienung.
 */

import { useCallback, useMemo } from 'react';

import { PiPlus, PiTrash, PiUser, PiUserCircle, PiUsers, PiCrown } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useEinheitDetails } from '@/features/kraefte/api/use-einheit-details';
import { useAssignPersonToEinheit } from '@/features/kraefte/api/use-assign-person-to-einheit';
import { useRemovePersonFromEinheit } from '@/features/kraefte/api/use-remove-person-from-einheit';
import { useSetEinheitenfuehrer } from '@/features/kraefte/api/use-set-einheitenfuehrer';
import { useEinsatzPersonen } from '@/features/einsatz/api';

interface PersonZuweisungPanelProps {
  /** Ob das Panel geöffnet ist */
  isOpen: boolean;
  /** Handler zum Schließen */
  onClose: () => void;
  /** Einsatz-ID */
  einsatzId: string;
  /** Einheit-ID */
  einheitId: string;
}

/**
 * Slide-In Panel für die Personalzuweisung zu einer Einheit.
 *
 * Zeigt zwei Bereiche:
 * 1. Aktuell zugewiesene Personen (mit Entfernen-/Führer-Buttons)
 * 2. Verfügbare Personen (mit Zuweisen-Button)
 */
export function PersonZuweisungPanel({ isOpen, onClose, einsatzId, einheitId }: PersonZuweisungPanelProps) {
  const { data: details, isLoading: isLoadingDetails } = useEinheitDetails(einsatzId, einheitId);

  const { data: allePersonen = [], isLoading: isLoadingPersonen } = useEinsatzPersonen(einsatzId);

  const { mutate: assignPerson, isPending: isAssigning } = useAssignPersonToEinheit(einsatzId);

  const { mutate: removePerson, isPending: isRemoving } = useRemovePersonFromEinheit(einsatzId);

  const { mutate: setFuehrer, isPending: isSettingFuehrer } = useSetEinheitenfuehrer(einsatzId);

  const isPending = isAssigning || isRemoving || isSettingFuehrer;

  /** IDs der bereits zugewiesenen Personen */
  const zugewiesenePersonIds = useMemo(() => {
    if (!details?.personen) return new Set<string>();
    return new Set(details.personen.map((p) => p.id));
  }, [details]);

  /** Verfügbare Personen (nicht bereits zugewiesen) */
  const verfuegbarePersonen = useMemo(() => {
    return allePersonen.filter((p) => !zugewiesenePersonIds.has(p.id));
  }, [allePersonen, zugewiesenePersonIds]);

  const handleAssign = useCallback(
    (personId: string) => {
      assignPerson({ einheitId, dto: { personId } });
    },
    [assignPerson, einheitId],
  );

  const handleRemove = useCallback(
    (personId: string) => {
      removePerson({ einheitId, personId });
    },
    [removePerson, einheitId],
  );

  const handleSetFuehrer = useCallback(
    (personId: string) => {
      setFuehrer({ einheitId, dto: { fuehrerId: personId } });
    },
    [setFuehrer, einheitId],
  );

  const isLoading = isLoadingDetails || isLoadingPersonen;

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={onClose}
      title={details ? `Personal: ${details.name}` : 'Personal zuweisen'}
      description={details ? `Stärke: ${details.istStaerke ?? 0}/${details.sollStaerke}` : undefined}
      size="md"
      position="right"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingState message="Lade Daten..." fullScreen={false} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Zugewiesene Personen */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PiUsers className="h-4 w-4" />
              Zugewiesene Personen ({details?.personen?.length ?? 0})
            </h3>

            {details?.personen && details.personen.length > 0 ? (
              <div className="space-y-2">
                {details.personen.map((person) => {
                  const istFuehrer = details.einheitenfuehrer?.id === person.id;
                  return (
                    <div key={person.id} className="flex items-center justify-between rounded-panel border border-border-subtle bg-surface-panel p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-info-surface">
                          <PiUser className="h-4 w-4 text-status-info-text" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {person.vorname} {person.nachname}
                          </p>
                          {istFuehrer && (
                            <span className="inline-flex items-center gap-1 text-xs text-status-warning-text">
                              <PiCrown className="h-3 w-3" />
                              Einheitenführer
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Zum Führer ernennen */}
                        {!istFuehrer && (
                          <Button
                            intent="warning"
                            appearance="ghost"
                            size="icon"
                            onClick={() => handleSetFuehrer(person.id)}
                            disabled={isPending}
                            title="Zum Einheitenführer ernennen"
                            aria-label="Zum Einheitenführer ernennen"
                          >
                            <PiCrown className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Entfernen */}
                        <Button intent="danger" appearance="ghost" size="icon" onClick={() => handleRemove(person.id)} disabled={isPending} title="Person entfernen" aria-label="Person entfernen">
                          <PiTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-panel border border-border-subtle bg-surface-raised px-4 py-6 text-center">
                <PiUserCircle className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">Noch keine Personen zugewiesen</p>
              </div>
            )}
          </section>

          {/* Verfügbare Personen */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PiUser className="h-4 w-4" />
              Verfügbare Personen ({verfuegbarePersonen.length})
            </h3>

            {verfuegbarePersonen.length > 0 ? (
              <div className="space-y-2">
                {verfuegbarePersonen.map((person) => (
                  <div key={person.id} className="flex items-center justify-between rounded-panel border border-border-subtle bg-surface-panel p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised">
                        <PiUser className="h-4 w-4 text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {person.vorname} {person.nachname}
                        </p>
                        <p className="text-xs text-text-muted">{person.funktion}</p>
                      </div>
                    </div>

                    <Button
                      intent="primary"
                      appearance="ghost"
                      size="icon"
                      onClick={() => handleAssign(person.id)}
                      disabled={isPending}
                      title="Person zuweisen"
                      aria-label={`${person.vorname} ${person.nachname} zuweisen`}
                    >
                      <PiPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-panel border border-border-subtle bg-surface-raised px-4 py-6 text-center">
                <p className="text-sm text-text-muted">Keine weiteren Personen verfügbar</p>
              </div>
            )}
          </section>
        </div>
      )}
    </Dialog.SlideIn>
  );
}
