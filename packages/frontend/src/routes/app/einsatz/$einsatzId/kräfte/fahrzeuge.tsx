/**
 * Fahrzeuge-Verwaltung Route (Story 4-3)
 *
 * Zeigt alle Fahrzeuge eines Einsatzes mit FMS-Status und Besatzung.
 * Ermöglicht Hinzufügen neuer Fahrzeuge und FMS-Status-Verwaltung.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { useEinsatzFahrzeuge, useUpdateFmsStatus } from '@/features/einsatz/api';
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

  return (
    <EinsatzRolleGate einsatzId={einsatzId}>
      <FahrzeugeContent einsatzId={einsatzId} />
    </EinsatzRolleGate>
  );
}

function FahrzeugeContent({ einsatzId }: { einsatzId: string }) {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-text-primary">Fahrzeuge</h1>
          <p className="mt-1 text-text-muted text-sm">Verwalten Sie die eingesetzten Fahrzeuge und deren Status</p>
        </div>
        <Button intent="primary" onClick={handleOpenFahrzeugDialog}>
          <PiTruck className="mr-2 h-4 w-4" />
          Fahrzeug hinzufügen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-info-surface p-3">
              <PiTruck className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{totalFahrzeuge}</p>
              <p className="text-text-muted text-sm">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-success-surface p-3">
              <PiGauge className="h-6 w-6 text-status-success-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{activeFahrzeuge}</p>
              <p className="text-text-muted text-sm">Im Einsatz</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-info-surface p-3">
              <PiUsers className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{totalBesatzung}</p>
              <p className="text-text-muted text-sm">Personen</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-warning-surface p-3">
              <PiUser className="h-6 w-6 text-status-warning-text" />
            </div>
            <div>
              <p className="font-semibold text-2xl text-text-primary">{durchschnittBesatzung}</p>
              <p className="text-text-muted text-sm">Ø Besatzung</p>
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
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-status-success-border border-b bg-status-success-surface px-4 py-3">
                <h3 className="font-semibold text-status-success-text text-sm">Im Einsatz ({fahrzeugeImEinsatz.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeImEinsatz.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <PiTruck className="h-5 w-5 text-text-muted" />
                          <div>
                            <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                            {fahrzeug.kennzeichen && <p className="text-text-muted text-sm">{fahrzeug.kennzeichen}</p>}
                          </div>
                        </div>
                        {fahrzeug.besatzung && fahrzeug.besatzung.length > 0 && (
                          <div className="mt-2 ml-8">
                            <p className="mb-1 font-medium text-text-secondary text-xs">Besatzung ({fahrzeug.besatzung.length}):</p>
                            <div className="flex flex-wrap gap-2">
                              {fahrzeug.besatzung.map((person) => (
                                <span key={person.id} className="inline-flex items-center gap-1.5 rounded-control bg-surface-raised px-2.5 py-1 text-text-secondary text-xs">
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
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-status-info-border border-b bg-status-info-surface px-4 py-3">
                <h3 className="font-semibold text-status-info-text text-sm">Einsatzbereit ({fahrzeugeBereit.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeBereit.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <PiTruck className="h-5 w-5 text-text-muted" />
                      <div>
                        <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-text-muted text-sm">{fahrzeug.kennzeichen}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Andere Status */}
          {fahrzeugeAndere.length > 0 && (
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-border-subtle border-b bg-surface-raised px-4 py-3">
                <h3 className="font-semibold text-text-primary text-sm">Weitere Fahrzeuge ({fahrzeugeAndere.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeAndere.map((fahrzeug) => (
                  <div key={fahrzeug.id} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <PiTruck className="h-5 w-5 text-text-muted" />
                      <div>
                        <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                        {fahrzeug.kennzeichen && <p className="text-text-muted text-sm">{fahrzeug.kennzeichen}</p>}
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
