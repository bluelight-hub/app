/**
 * Personal-Verwaltung Route (Story 4-3)
 *
 * Zeigt alle Personen eines Einsatzes mit Fahrzeug-Zuweisungen.
 * Ermöglicht Hinzufügen neuer Personen und Zuweisung zu Fahrzeugen.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
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

  // Handler für Fahrzeug-Zuweisung (BLOCKER Fix: Per-Person Loading State)
  const handleAssign = useCallback(
    (personId: string, fahrzeugId: string | null) => {
      // Guard gegen Race Condition: Prüfe ob DIESE Person bereits zugewiesen wird
      if (assigningPersonIds.has(personId)) return;

      // Füge Person zu Loading Set hinzu
      setAssigningPersonIds((prev) => new Set(prev).add(personId));

      if (fahrzeugId) {
        weiseZu.mutate(
          { personId, fahrzeugId },
          {
            onSettled: () => {
              // Entferne Person aus Loading Set
              setAssigningPersonIds((prev) => {
                const next = new Set(prev);
                next.delete(personId);
                return next;
              });
            },
          },
        );
      } else {
        entferne.mutate(
          { personId },
          {
            onSettled: () => {
              // Entferne Person aus Loading Set
              setAssigningPersonIds((prev) => {
                const next = new Set(prev);
                next.delete(personId);
                return next;
              });
            },
          },
        );
      }
    },
    [weiseZu, entferne, assigningPersonIds],
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Personal</h1>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">Verwalten Sie das eingesetzte Personal und deren Fahrzeug-Zuweisungen</p>
        </div>
        <Button intent="primary" onClick={handleOpenPersonDialog}>
          <PiUserPlus className="mr-2 h-4 w-4" />
          Person hinzufügen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900/20">
              <PiUsers className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{personen.length}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
              <PiTruck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{personenMitFahrzeug.length}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Zugewiesen</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
              <PiUser className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{personenOhneFahrzeug.length}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Nicht zugewiesen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personen-Liste */}
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <div className="border-gray-200 border-b px-6 py-4 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Eingesetztes Personal</h2>
        </div>

        {personen.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <PiUsers className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-600" />
            <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">Noch keine Personen registriert</p>
            <p className="mb-6 text-gray-500 text-sm dark:text-gray-400">Fügen Sie die erste Person für diesen Einsatz hinzu</p>
            <Button intent="primary" onClick={handleOpenPersonDialog}>
              <PiUserPlus className="mr-2 h-4 w-4" />
              Person hinzufügen
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100">Funktion</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100">Funkrufname</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100">Qualifikationen</th>
                  <th className="w-64 px-6 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100">Zugewiesenes Fahrzeug</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {personen.map((person) => (
                  <tr key={person.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20">
                          <PiUser className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm dark:text-gray-100">
                            {person.vorname} {person.nachname}
                          </p>
                          {person.stammPersonId && <p className="text-gray-500 text-xs dark:text-gray-400">Aus Stammdaten</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900/20 dark:text-blue-300">{person.funktion}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700 text-sm dark:text-gray-300">{person.funkrufname || '-'}</td>
                    <td className="px-6 py-4">
                      {person.qualifikationen && person.qualifikationen.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {person.qualifikationen.map((qual) => (
                            <span key={qual.id} className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 text-xs dark:bg-gray-700 dark:text-gray-300">
                              {qual.kuerzel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm dark:text-gray-400">-</span>
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
