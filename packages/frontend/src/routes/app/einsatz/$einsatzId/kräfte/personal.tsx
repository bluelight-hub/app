/**
 * Personal-Verwaltung Route (Story 4-3)
 *
 * Zeigt alle Personen eines Einsatzes mit Fahrzeug-Zuweisungen.
 * Ermöglicht Hinzufügen neuer Personen und Zuweisung zu Fahrzeugen.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { useEinsatzPersonen, useEinsatzFahrzeuge, useWeisePersonZuFahrzeugZu, useEntfernePersonVonFahrzeug } from '@/features/einsatz/api';
import { PersonHinzufuegenDialog } from '@/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism';
import { FahrzeugZuweisungsDropdown } from '@/features/einsatz/ui/molecules/FahrzeugZuweisungsDropdown.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { useState, useCallback } from 'react';
import { PiUserPlus, PiUsers, PiTruck, PiUser } from 'react-icons/pi';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/personal')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/kräfte/personal' });

  return (
    <EinsatzRolleGate einsatzId={einsatzId}>
      <PersonalContent einsatzId={einsatzId} />
    </EinsatzRolleGate>
  );
}

function PersonalContent({ einsatzId }: { einsatzId: string }) {
  // State für Dialog
  const [showPersonDialog, setShowPersonDialog] = useState(false);
  const handleOpenPersonDialog = useCallback(() => setShowPersonDialog(true), []);
  const handleClosePersonDialog = useCallback(() => setShowPersonDialog(false), []);

  // State für per-Person Loading (BLOCKER Fix: Race Condition)
  // Set<string> ermöglicht parallele Zuweisungen mehrerer Personen
  const [assigningPersonIds, setAssigningPersonIds] = useState<Set<string>>(new Set());

  // Daten laden
  const { data: personen = [], isLoading: isLoadingPersonen, error: personenError } = useEinsatzPersonen(einsatzId);
  const { data: fahrzeuge = [], isLoading: isLoadingFahrzeuge } = useEinsatzFahrzeuge(einsatzId);

  // Mutations
  const weiseZu = useWeisePersonZuFahrzeugZu(einsatzId);
  const entferne = useEntfernePersonVonFahrzeug(einsatzId);

  // Handler für Fahrzeug-Zuweisung (F1 Fix: Functional setState to prevent stale closure)
  const handleAssign = useCallback(
    (personId: string, fahrzeugId: string | null) => {
      setAssigningPersonIds((prev) => {
        // Guard mit latest state: Prüfe ob DIESE Person bereits zugewiesen wird
        if (prev.has(personId)) return prev;

        const next = new Set(prev).add(personId);

        // Mutation INNERHALB setState feuern (nach Guard)
        if (fahrzeugId) {
          weiseZu.mutate(
            { personId, fahrzeugId },
            {
              onSettled: () => {
                setAssigningPersonIds((p) => {
                  const n = new Set(p);
                  n.delete(personId);
                  return n;
                });
              },
            },
          );
        } else {
          entferne.mutate(
            { personId },
            {
              onSettled: () => {
                setAssigningPersonIds((p) => {
                  const n = new Set(p);
                  n.delete(personId);
                  return n;
                });
              },
            },
          );
        }

        return next;
      });
    },
    [weiseZu, entferne], // NO assigningPersonIds in deps
  );

  // Loading State
  if (isLoadingPersonen || isLoadingFahrzeuge) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade Personaldaten..." />
      </div>
    );
  }

  // Error State
  if (personenError) {
    return <ErrorState title="Fehler beim Laden" description="Die Personaldaten konnten nicht geladen werden." />;
  }

  const personenMitFahrzeug = personen.filter((p) => p.fahrzeugId);
  const personenOhneFahrzeug = personen.filter((p) => !p.fahrzeugId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-text-primary">Personal</h1>
          <p className="mt-1 text-text-secondary text-sm">Verwalten Sie das eingesetzte Personal und deren Fahrzeug-Zuweisungen</p>
        </div>
        <Button intent="primary" onClick={handleOpenPersonDialog}>
          <PiUserPlus className="mr-2 h-4 w-4" />
          Person hinzufügen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-info-surface p-3">
              <PiUsers className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{personen.length}</p>
              <p className="text-text-muted text-sm">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-info-surface p-3">
              <PiTruck className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{personenMitFahrzeug.length}</p>
              <p className="text-text-muted text-sm">Zugewiesen</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-warning-surface p-3">
              <PiUser className="h-6 w-6 text-status-warning-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{personenOhneFahrzeug.length}</p>
              <p className="text-text-muted text-sm">Nicht zugewiesen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personen-Liste */}
      <div className="rounded-panel bg-surface-panel shadow-sm">
        <div className="border-border-subtle border-b px-6 py-4">
          <h2 className="font-semibold text-text-primary text-lg">Eingesetztes Personal</h2>
        </div>

        {personen.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <PiUsers className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <p className="mb-2 font-medium text-text-primary">Noch keine Personen registriert</p>
            <p className="mb-6 text-text-muted text-sm">Fügen Sie die erste Person für diesen Einsatz hinzu</p>
            <Button intent="primary" onClick={handleOpenPersonDialog}>
              <PiUserPlus className="mr-2 h-4 w-4" />
              Person hinzufügen
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-text-primary text-sm">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-text-primary text-sm">Funktion</th>
                  <th className="px-6 py-3 text-left font-medium text-text-primary text-sm">Funkrufname</th>
                  <th className="px-6 py-3 text-left font-medium text-text-primary text-sm">Qualifikationen</th>
                  <th className="w-64 px-6 py-3 text-left font-medium text-text-primary text-sm">Zugewiesenes Fahrzeug</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {personen.map((person) => (
                  <tr key={person.id} className="transition-colors hover:bg-surface-raised">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-info-surface">
                          <PiUser className="h-5 w-5 text-status-info-text" />
                        </div>
                        <div>
                          <p className="font-medium text-text-primary text-sm">
                            {person.vorname} {person.nachname}
                          </p>
                          {person.stammPersonId && <p className="text-text-muted text-xs">Aus Stammdaten</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-pill bg-status-info-surface px-2.5 py-0.5 font-medium text-status-info-text text-xs">{person.funktion}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-text-secondary text-sm">{person.funkrufname || '-'}</td>
                    <td className="px-6 py-4">
                      {person.qualifikationen && person.qualifikationen.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {person.qualifikationen.map((qual) => (
                            <span key={qual.id} className="inline-flex rounded-control bg-surface-raised px-2 py-0.5 text-text-secondary text-xs">
                              {qual.kuerzel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <FahrzeugZuweisungsDropdown
                        currentFahrzeugId={person.fahrzeugId}
                        fahrzeuge={fahrzeuge}
                        onAssign={(fahrzeugId) => handleAssign(person.id, fahrzeugId)}
                        isLoading={assigningPersonIds.has(person.id)}
                        className="w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Person hinzufügen Dialog */}
      <PersonHinzufuegenDialog isOpen={showPersonDialog} onClose={handleClosePersonDialog} einsatzId={einsatzId} />
    </div>
  );
}
