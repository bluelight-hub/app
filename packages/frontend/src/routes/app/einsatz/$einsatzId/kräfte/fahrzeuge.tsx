/**
 * Fahrzeuge-Verwaltung Route (Story 4-3)
 *
 * Zeigt alle Fahrzeuge eines Einsatzes mit FMS-Status und Besatzung.
 * Ermöglicht Hinzufügen neuer Fahrzeuge und FMS-Status-Verwaltung.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { useEinsatzFahrzeuge } from '@/features/einsatz/api/use-einsatz-fahrzeuge';
import { useUpdateFmsStatus } from '@/features/einsatz/api/use-update-fms-status';
import { FahrzeugHinzufuegenDialog } from '@/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism';
import { EinsatzResourceWidget } from '@/features/einsatz/ui/molecules/EinsatzResourceWidget';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import type { FmsStatus } from '@/features/einsatz';
import { useState, useCallback } from 'react';
import { PiTruck, PiUsers, PiUser, PiGauge } from 'react-icons/pi';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/fahrzeuge')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/kräfte/fahrzeuge' });

  // State für Dialog
  const [showFahrzeugDialog, setShowFahrzeugDialog] = useState(false);
  const handleOpenFahrzeugDialog = useCallback(() => setShowFahrzeugDialog(true), []);
  const handleCloseFahrzeugDialog = useCallback(() => setShowFahrzeugDialog(false), []);

  // Daten laden
  const { data: fahrzeuge = [], isLoading, error } = useEinsatzFahrzeuge(einsatzId);

  // Mutations
  const updateFmsStatus = useUpdateFmsStatus(einsatzId);

  // Handler für FMS-Status Änderungen
  const handleStatusChange = useCallback(
    (fahrzeugId: string, newStatus: FmsStatus) => {
      updateFmsStatus.mutate({ fahrzeugId, fmsStatus: newStatus });
    },
    [updateFmsStatus],
  );

  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade Fahrzeugdaten..." />
      </div>
    );
  }

  // Error State
  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Die Fahrzeugdaten konnten nicht geladen werden." />;
  }

  // Statistiken berechnen
  const totalFahrzeuge = fahrzeuge.length;
  const activeFahrzeuge = fahrzeuge.filter((f) => f.fmsStatus >= 3 && f.fmsStatus <= 4).length;
  const totalBesatzung = fahrzeuge.reduce((sum, f) => sum + (f.besatzung?.length || 0), 0);
  const durchschnittBesatzung = totalFahrzeuge > 0 ? (totalBesatzung / totalFahrzeuge).toFixed(1) : '0';

  // Fahrzeuge nach Status gruppieren
  const fahrzeugeImEinsatz = fahrzeuge.filter((f) => f.fmsStatus >= 3 && f.fmsStatus <= 4);
  const fahrzeugeBereit = fahrzeuge.filter((f) => f.fmsStatus === 2);
  const fahrzeugeAndere = fahrzeuge.filter((f) => f.fmsStatus < 2 || f.fmsStatus > 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Fahrzeuge</h1>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">Verwalten Sie die eingesetzten Fahrzeuge und deren Status</p>
        </div>
        <Button intent="primary" onClick={handleOpenFahrzeugDialog}>
          <PiTruck className="mr-2 h-4 w-4" />
          Fahrzeug hinzufügen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900/20">
              <PiTruck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{totalFahrzeuge}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
              <PiGauge className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{activeFahrzeuge}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Im Einsatz</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
              <PiUsers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{totalBesatzung}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Personen</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
              <PiUser className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-gray-900 dark:text-gray-100">{durchschnittBesatzung}</p>
              <p className="text-gray-500 text-sm dark:text-gray-400">Ø Besatzung</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fahrzeug-Widget (Story 3-3 Pattern) */}
      <EinsatzResourceWidget fahrzeuge={fahrzeuge} onStatusChange={handleStatusChange} onAddResource={handleOpenFahrzeugDialog} />

      {/* Detaillierte Fahrzeug-Liste nach Status gruppiert */}
      {totalFahrzeuge > 0 && (
        <div className="space-y-4">
          {/* Im Einsatz (FMS 3-4) */}
          {fahrzeugeImEinsatz.length > 0 && (
            <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="border-gray-200 border-b bg-green-50 px-6 py-3 dark:border-gray-700 dark:bg-green-900/10">
                <h3 className="font-semibold text-green-900 text-sm dark:text-green-100">Im Einsatz ({fahrzeugeImEinsatz.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {fahrzeugeImEinsatz.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <PiTruck className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{fahrzeug.funkrufname}</p>
                            {fahrzeug.kennzeichen && <p className="text-gray-500 text-sm dark:text-gray-400">{fahrzeug.kennzeichen}</p>}
                          </div>
                        </div>
                        {fahrzeug.besatzung && fahrzeug.besatzung.length > 0 && (
                          <div className="mt-2 ml-8">
                            <p className="mb-1 font-medium text-gray-700 text-xs dark:text-gray-300">Besatzung ({fahrzeug.besatzung.length}):</p>
                            <div className="flex flex-wrap gap-2">
                              {fahrzeug.besatzung.map((person) => (
                                <span key={person.id} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700 text-xs dark:bg-gray-700 dark:text-gray-300">
                                  <PiUser className="h-3 w-3" />
                                  {person.vorname} {person.nachname}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bereit (FMS 2) */}
          {fahrzeugeBereit.length > 0 && (
            <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="border-gray-200 border-b bg-blue-50 px-6 py-3 dark:border-gray-700 dark:bg-blue-900/10">
                <h3 className="font-semibold text-blue-900 text-sm dark:text-blue-100">Einsatzbereit ({fahrzeugeBereit.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {fahrzeugeBereit.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <PiTruck className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-gray-500 text-sm dark:text-gray-400">{fahrzeug.kennzeichen}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Andere Status */}
          {fahrzeugeAndere.length > 0 && (
            <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="border-gray-200 border-b bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900/50">
                <h3 className="font-semibold text-gray-900 text-sm dark:text-gray-100">Weitere Fahrzeuge ({fahrzeugeAndere.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {fahrzeugeAndere.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <PiTruck className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-gray-500 text-sm dark:text-gray-400">{fahrzeug.kennzeichen}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fahrzeug hinzufügen Dialog */}
      <FahrzeugHinzufuegenDialog isOpen={showFahrzeugDialog} onClose={handleCloseFahrzeugDialog} einsatzId={einsatzId} />
    </div>
  );
}
