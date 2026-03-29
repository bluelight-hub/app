/**
 * Dialog zum Beitritt/Person-Setup für einen Einsatz
 *
 * Ermöglicht es dem User, sich mit einer EinsatzPerson für den aktuellen Einsatz zu verknüpfen.
 * Die Person-Daten werden dann für ETB-Einträge automatisch vorausgefüllt.
 */

import { PersonHinzufuegenDialog } from '@/features/einsatz';
import { useEinsatzTeilnehmer, useJoinEinsatz, useMyEinsatzTeilnahme } from '@/features/einsatz/api';
import { useEinsatzPersonen, useRegistrierePerson } from '@/features/einsatz/api';
import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { useOperativeRole } from '@/features/operative-roles';
import { EinsatzPersonenPicker } from '@/features/kraefte/ui/molecules/EinsatzPersonenPicker';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { api } from '@/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowLeft, PiPlus, PiUser } from 'react-icons/pi';

interface EinsatzBeitrittDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
  onReturnToOverview?: () => void | Promise<void>;
}

/**
 * Dialog zum Setzen/Ändern der verknüpften Person für einen Einsatz
 *
 * Zeigt einen Person-Picker (bestehende EinsatzPerson auswählen) und
 * eine Option zum Erstellen einer neuen Person.
 */
export function EinsatzBeitrittDialog({ einsatzId, isOpen, onClose, onReturnToOverview }: EinsatzBeitrittDialogProps) {
  const { data: teilnahmeData, isLoading: isTeilnahmeLoading } = useMyEinsatzTeilnahme(einsatzId);
  const { data: alleTeilnehmer } = useEinsatzTeilnehmer(einsatzId);
  const joinEinsatz = useJoinEinsatz();

  const { user } = useCurrentUser();
  const { role: operativeRole } = useOperativeRole();
  const { data: einsatzPersonen, isLoading: isPersonenLoading } = useEinsatzPersonen(einsatzId);
  const registrierePerson = useRegistrierePerson();

  const currentEinsatzPersonId = teilnahmeData?.data?.einsatzPersonId || '';
  const isAlreadyJoined = !!teilnahmeData?.data;
  const requiresAssignment = !isAlreadyJoined;

  // Stammperson-ID des Users aus dem Auth-State
  const userStammpersonId = (user as Record<string, unknown> | null | undefined)?.stammpersonId as string | null | undefined;

  // EinsatzPerson finden, die zur Stammperson des Users gehört
  const matchingEinsatzPersonId = useMemo(() => {
    if (!userStammpersonId || !einsatzPersonen) return '';
    const match = einsatzPersonen.find((p) => p.stammId === userStammpersonId);
    return match?.id ?? '';
  }, [userStammpersonId, einsatzPersonen]);

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [showPersonDialog, setShowPersonDialog] = useState(false);
  const [selectionError, setSelectionError] = useState<string | undefined>(undefined);
  const [pendingCloseAfterJoin, setPendingCloseAfterJoin] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const autoJoinAttemptedRef = useRef(false);
  const gateTitleRef = useRef<HTMLHeadingElement>(null);

  // Auto-Join: Wenn User eine Stammperson hat, automatisch registrieren + beitreten
  const performAutoJoin = useCallback(async () => {
    if (!userStammpersonId || !einsatzId) return;

    setIsAutoJoining(true);
    try {
      let einsatzPersonId = matchingEinsatzPersonId;

      // Falls keine passende EinsatzPerson existiert → aus Stammperson-Daten erstellen
      if (!einsatzPersonId) {
        const stammPersonen = await api.stammPersonen().stammPersonenControllerFindAllVAlpha({});
        const allPersonen = (stammPersonen as unknown as { data: Array<{ id: string; vorname: string; nachname: string; funkkenungBOS?: string }> }).data ?? stammPersonen;
        const stammPerson = (allPersonen as Array<{ id: string; vorname: string; nachname: string; funkkenungBOS?: string }>).find((sp) => sp.id === userStammpersonId);

        if (!stammPerson) {
          setIsAutoJoining(false);
          return;
        }

        const funktionLabel = operativeRole === 'FUEHRUNGSKRAFT' ? 'Führungskraft' : operativeRole === 'EINSATZKRAFT' ? 'Einsatzkraft' : 'Externe';

        const result = await registrierePerson.mutateAsync({
          einsatzId,
          vorname: stammPerson.vorname,
          nachname: stammPerson.nachname,
          funktion: funktionLabel,
          funkrufname: stammPerson.funkkenungBOS,
          stammPersonId: stammPerson.id,
        });

        einsatzPersonId = result.data?.id ?? '';
      }

      if (einsatzPersonId) {
        setSelectedPersonId(einsatzPersonId);
        await joinEinsatz.mutateAsync({
          einsatzId,
          data: { einsatzPersonId },
        });
        setPendingCloseAfterJoin(true);
      }
    } catch {
      // Fehler werden in den Mutations per Toast gehandelt
    } finally {
      setIsAutoJoining(false);
    }
  }, [userStammpersonId, einsatzId, matchingEinsatzPersonId, operativeRole, registrierePerson, joinEinsatz]);

  // Auto-Join auslösen wenn Dialog öffnet und User Stammperson hat
  useEffect(() => {
    if (!isOpen || !requiresAssignment || !userStammpersonId || isTeilnahmeLoading || isPersonenLoading) {
      return;
    }
    if (autoJoinAttemptedRef.current) return;
    autoJoinAttemptedRef.current = true;
    void performAutoJoin();
  }, [isOpen, requiresAssignment, userStammpersonId, isTeilnahmeLoading, isPersonenLoading, performAutoJoin]);

  // IDs der Personen die bereits von anderen Bearbeitern verknüpft sind (ausschließen)
  const excludePersonIds = useMemo(() => {
    if (!alleTeilnehmer?.data) return [];
    return alleTeilnehmer.data.filter((t) => t.einsatzPersonId && t.einsatzPersonId !== currentEinsatzPersonId).map((t) => t.einsatzPersonId);
  }, [alleTeilnehmer, currentEinsatzPersonId]);

  // Reset state when dialog opens — Stammperson als Vorauswahl nutzen
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId(currentEinsatzPersonId || matchingEinsatzPersonId);
      setSelectionError(undefined);
      setPendingCloseAfterJoin(false);
      setIsAutoJoining(false);
      autoJoinAttemptedRef.current = false;
    }
  }, [isOpen, currentEinsatzPersonId, matchingEinsatzPersonId]);

  useEffect(() => {
    if (isOpen && requiresAssignment) {
      gateTitleRef.current?.focus();
    }
  }, [isOpen, requiresAssignment]);

  useEffect(() => {
    if (!isOpen || !pendingCloseAfterJoin) {
      return;
    }

    if (!currentEinsatzPersonId || currentEinsatzPersonId !== selectedPersonId) {
      return;
    }

    setPendingCloseAfterJoin(false);
    onClose();
  }, [currentEinsatzPersonId, isOpen, onClose, pendingCloseAfterJoin, selectedPersonId]);

  const handleDialogClose = () => {
    if (requiresAssignment || joinEinsatz.isPending) {
      return;
    }

    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedPersonId) {
      setSelectionError('Bitte wählen Sie zuerst eine Person aus.');
      return;
    }

    try {
      setSelectionError(undefined);
      await joinEinsatz.mutateAsync({
        einsatzId,
        data: { einsatzPersonId: selectedPersonId },
      });
      setPendingCloseAfterJoin(true);
    } catch {
      setPendingCloseAfterJoin(false);
      // Fehler-Toast wird bereits in useJoinEinsatz.onError behandelt.
      // Hier bewusst schlucken, damit kein unhandled promise rejection im UI entsteht.
    }
  };

  const handlePersonCreated = (person: { id: string }) => {
    setSelectedPersonId(person.id);
    setSelectionError(undefined);
    setShowPersonDialog(false);
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={handleDialogClose} className="max-w-lg" closeOnEscape={!requiresAssignment} closeOnClickOutside={!requiresAssignment}>
        {!requiresAssignment && <Dialog.CloseButton onClose={handleDialogClose} />}

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-info-surface">
              <PiUser className="h-6 w-6 text-status-info-text" />
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              {requiresAssignment && <span className="rounded-full bg-status-warning-surface px-2 py-1 text-body-xs font-medium text-status-warning-text">Pflichtschritt</span>}
            </div>
            <h2 ref={gateTitleRef} tabIndex={-1} className="text-lg font-semibold text-text-primary">
              {requiresAssignment ? 'Zuordnung erforderlich' : 'Zuordnung ändern'}
            </h2>

            <Dialog.Body className="mt-2">
              {isAutoJoining ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Spinner size="lg" />
                  <p className="text-body-sm text-text-secondary">Zuordnung wird automatisch vorbereitet...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <output aria-live="polite" className="block text-body-sm text-text-secondary">
                      {requiresAssignment
                        ? 'Arbeitsraum bleibt gesperrt, bis Sie sich diesem Einsatz eindeutig zuordnen. Danach arbeiten Sie ohne Kontextverlust direkt im aktiven Einsatz weiter.'
                        : 'Ändern Sie Ihre verknüpfte Person für diesen Einsatz.'}
                    </output>
                  </div>

                  <div className="mt-4 space-y-3">
                    <EinsatzPersonenPicker
                      einsatzId={einsatzId}
                      value={selectedPersonId}
                      onChange={(personId) => {
                        setSelectedPersonId(personId);
                        setSelectionError(undefined);
                      }}
                      disabled={isTeilnahmeLoading || joinEinsatz.isPending}
                      error={selectionError}
                      label={requiresAssignment ? 'Einsatzkraft auswählen' : 'Person'}
                      placeholder="Person auswählen..."
                      excludePersonIds={excludePersonIds}
                    />

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border-subtle" />
                      <span className="text-body-xs text-text-muted">oder</span>
                      <div className="h-px flex-1 bg-border-subtle" />
                    </div>

                    <Button appearance="ghost" size="sm" className="w-full justify-center" onClick={() => setShowPersonDialog(true)} disabled={joinEinsatz.isPending}>
                      <PiPlus className="mr-2 h-4 w-4" />
                      Neue Person erstellen
                    </Button>
                  </div>
                </>
              )}
            </Dialog.Body>
          </div>
        </div>

        <Dialog.Footer>
          {requiresAssignment && onReturnToOverview ? (
            <Button appearance="ghost" size="sm" onClick={() => void onReturnToOverview()} disabled={joinEinsatz.isPending}>
              <PiArrowLeft className="mr-2 h-4 w-4" />
              Zur Einsatzliste
            </Button>
          ) : null}
          {!requiresAssignment && (
            <Button appearance="ghost" size="sm" onClick={handleDialogClose} disabled={joinEinsatz.isPending}>
              Abbrechen
            </Button>
          )}
          <Button intent="primary" size="sm" onClick={handleSubmit} disabled={joinEinsatz.isPending || isTeilnahmeLoading}>
            {joinEinsatz.isPending ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-inverse border-t-transparent" />
                Zuordnung wird gespeichert...
              </>
            ) : requiresAssignment ? (
              'Zuordnung bestätigen'
            ) : (
              'Änderung speichern'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog>

      <PersonHinzufuegenDialog isOpen={showPersonDialog} onClose={() => setShowPersonDialog(false)} einsatzId={einsatzId} onPersonCreated={handlePersonCreated} />
    </>
  );
}
