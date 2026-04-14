/**
 * Fahrzeuge-Verwaltung Route (Story 4-3)
 *
 * Zeigt alle Fahrzeuge eines Einsatzes mit FMS-Status und Besatzung.
 * Ermöglicht Hinzufügen neuer Fahrzeuge und FMS-Status-Verwaltung.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { useEinsatzFahrzeuge, useUpdateFmsStatus } from '@/features/einsatz/api';
import { useEinsatzEinheiten, useAssignFahrzeugZuEinheit } from '@/features/kraefte/api';
import { useEinsatzZeichen } from '@/features/taktische-zeichen';
import { EinheitZuweisungsDropdown } from '@/features/kraefte/ui/molecules/EinheitZuweisungsDropdown';
import { FahrzeugHinzufuegenDialog } from '@/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism';
import { FahrzeugZeichenPanel } from '@/features/kraefte/ui/organisms/FahrzeugZeichenPanel';
import { EinsatzResourceWidget } from '@/features/einsatz/ui/molecules/EinsatzResourceWidget';
import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import type { FmsStatus } from '@/features/einsatz';
import { useState, useCallback, useMemo } from 'react';
import { PiMapPin, PiTruck, PiUsers, PiUser, PiGauge } from 'react-icons/pi';

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

  // State für Zeichen-Panel
  const [zeichenPanelFahrzeugId, setZeichenPanelFahrzeugId] = useState<string | null>(null);
  const handleOpenZeichen = useCallback((fahrzeugId: string) => setZeichenPanelFahrzeugId(fahrzeugId), []);
  const handleCloseZeichen = useCallback(() => setZeichenPanelFahrzeugId(null), []);

  // State für Einheit-Zuweisungs-Race-Condition-Guard
  const [assigningFahrzeugIds, setAssigningFahrzeugIds] = useState<Set<string>>(new Set());

  // Daten laden
  const { data: fahrzeuge = [], isLoading, error } = useEinsatzFahrzeuge(einsatzId);
  const { data: einheiten = [] } = useEinsatzEinheiten(einsatzId);
  const { data: alleZeichen = [] } = useEinsatzZeichen(einsatzId);

  /** Taktische Zeichen nach Fahrzeug-ID indexiert */
  const zeichenByFahrzeug = useMemo(() => {
    const map = new Map<string, TaktischesZeichenResponseDto>();
    for (const z of alleZeichen) {
      if (z.referenzTyp === 'FAHRZEUG' && z.referenzId) {
        map.set(z.referenzId, z);
      }
    }
    return map;
  }, [alleZeichen]);

  /** Fahrzeug-Daten für das aktuell geöffnete Zeichen-Panel */
  const zeichenPanelFahrzeug = fahrzeuge.find((f) => f.id === zeichenPanelFahrzeugId);

  // Mutations
  const updateFmsStatus = useUpdateFmsStatus(einsatzId);
  const assignToEinheit = useAssignFahrzeugZuEinheit(einsatzId);

  // Handler für FMS-Status Änderungen
  const handleStatusChange = useCallback(
    (fahrzeugId: string, newStatus: FmsStatus) => {
      updateFmsStatus.mutate({ fahrzeugId, fmsStatus: newStatus });
    },
    [updateFmsStatus],
  );

  // Handler für Einheit-Zuweisung (Race-Condition-Guard mit funktionalem setState)
  const handleEinheitAssign = useCallback(
    (fahrzeugId: string, einheitId: string | null) => {
      setAssigningFahrzeugIds((prev) => {
        if (prev.has(fahrzeugId)) return prev;
        const next = new Set(prev).add(fahrzeugId);
        const onSettled = () => {
          setAssigningFahrzeugIds((p) => {
            const n = new Set(p);
            n.delete(fahrzeugId);
            return n;
          });
        };
        assignToEinheit.mutate({ fahrzeugId, einheitId }, { onSettled });
        return next;
      });
    },
    [assignToEinheit],
  );

  /** Einheiten-Daten für das Dropdown aufbereiten */
  const einheitenOptions = einheiten.map((e) => ({ id: e.id, name: e.name, typ: e.typ }));

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
          <h1 className="text-2xl font-bold text-text-primary">Fahrzeuge</h1>
          <p className="mt-1 text-sm text-text-muted">Verwalten Sie die eingesetzten Fahrzeuge und deren Status</p>
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
              <p className="text-2xl font-semibold text-text-primary">{totalFahrzeuge}</p>
              <p className="text-sm text-text-muted">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-success-surface p-3">
              <PiGauge className="h-6 w-6 text-status-success-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{activeFahrzeuge}</p>
              <p className="text-sm text-text-muted">Im Einsatz</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-info-surface p-3">
              <PiUsers className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{totalBesatzung}</p>
              <p className="text-sm text-text-muted">Personen</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-warning-surface p-3">
              <PiUser className="h-6 w-6 text-status-warning-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{durchschnittBesatzung}</p>
              <p className="text-sm text-text-muted">Ø Besatzung</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fahrzeug-Widget (Story 3-3 Pattern) */}
      <EinsatzResourceWidget
        fahrzeuge={fahrzeuge}
        onStatusChange={handleStatusChange}
        onAddResource={handleOpenFahrzeugDialog}
        zeichenByFahrzeug={zeichenByFahrzeug}
        onManageZeichen={handleOpenZeichen}
      />

      {/* Detaillierte Fahrzeug-Liste nach Status gruppiert */}
      {totalFahrzeuge > 0 && (
        <div className="space-y-4">
          {/* Im Einsatz (FMS 3-4) */}
          {fahrzeugeImEinsatz.length > 0 && (
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-b border-status-success-border bg-status-success-surface px-4 py-3">
                <h3 className="text-sm font-semibold text-status-success-text">Im Einsatz ({fahrzeugeImEinsatz.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeImEinsatz.map((fahrzeug) => {
                  const zeichen = zeichenByFahrzeug.get(fahrzeug.id);
                  return (
                    <div key={fahrzeug.id} className="px-4 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {zeichen ? <ZeichenPreview definition={zeichen.zeichenDefinition as unknown as ZeichenDefinition} size="sm" /> : <PiTruck className="h-5 w-5 text-text-muted" />}
                            <div>
                              <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                              {fahrzeug.kennzeichen && <p className="text-sm text-text-muted">{fahrzeug.kennzeichen}</p>}
                            </div>
                            <Button
                              intent="secondary"
                              appearance="ghost"
                              size="icon"
                              onClick={() => handleOpenZeichen(fahrzeug.id)}
                              title="Taktisches Zeichen"
                              aria-label="Taktisches Zeichen verwalten"
                            >
                              <PiMapPin className="h-4 w-4" />
                            </Button>
                          </div>
                          {fahrzeug.besatzung && fahrzeug.besatzung.length > 0 && (
                            <div className="mt-2 ml-8">
                              <p className="mb-1 text-xs font-medium text-text-secondary">Besatzung ({fahrzeug.besatzung.length}):</p>
                              <div className="flex flex-wrap gap-2">
                                {fahrzeug.besatzung.map((person) => (
                                  <span key={person.id} className="inline-flex items-center gap-1.5 rounded-control bg-surface-raised px-2.5 py-1 text-xs text-text-secondary">
                                    <PiUser className="h-3 w-3" />
                                    {person.vorname} {person.nachname}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <EinheitZuweisungsDropdown
                            currentEinheitId={fahrzeug.einheitId}
                            einheiten={einheitenOptions}
                            onAssign={(einheitId) => handleEinheitAssign(fahrzeug.id, einheitId)}
                            isLoading={assigningFahrzeugIds.has(fahrzeug.id)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bereit (FMS 2) */}
          {fahrzeugeBereit.length > 0 && (
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-b border-status-info-border bg-status-info-surface px-4 py-3">
                <h3 className="text-sm font-semibold text-status-info-text">Einsatzbereit ({fahrzeugeBereit.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeBereit.map((fahrzeug) => {
                  const zeichen = zeichenByFahrzeug.get(fahrzeug.id);
                  return (
                    <div key={fahrzeug.id} className="px-4 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {zeichen ? <ZeichenPreview definition={zeichen.zeichenDefinition as unknown as ZeichenDefinition} size="sm" /> : <PiTruck className="h-5 w-5 text-text-muted" />}
                          <div>
                            <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                            {fahrzeug.kennzeichen && <p className="text-sm text-text-muted">{fahrzeug.kennzeichen}</p>}
                          </div>
                          <Button intent="secondary" appearance="ghost" size="icon" onClick={() => handleOpenZeichen(fahrzeug.id)} title="Taktisches Zeichen" aria-label="Taktisches Zeichen verwalten">
                            <PiMapPin className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <EinheitZuweisungsDropdown
                            currentEinheitId={fahrzeug.einheitId}
                            einheiten={einheitenOptions}
                            onAssign={(einheitId) => handleEinheitAssign(fahrzeug.id, einheitId)}
                            isLoading={assigningFahrzeugIds.has(fahrzeug.id)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Andere Status */}
          {fahrzeugeAndere.length > 0 && (
            <div className="rounded-panel bg-surface-panel shadow-sm">
              <div className="border-b border-border-subtle bg-surface-raised px-4 py-3">
                <h3 className="text-sm font-semibold text-text-primary">Weitere Fahrzeuge ({fahrzeugeAndere.length})</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {fahrzeugeAndere.map((fahrzeug) => {
                  const zeichen = zeichenByFahrzeug.get(fahrzeug.id);
                  return (
                    <div key={fahrzeug.id} className="px-4 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {zeichen ? <ZeichenPreview definition={zeichen.zeichenDefinition as unknown as ZeichenDefinition} size="sm" /> : <PiTruck className="h-5 w-5 text-text-muted" />}
                          <div>
                            <p className="font-medium text-text-primary">{fahrzeug.funkrufname}</p>
                            {fahrzeug.kennzeichen && <p className="text-sm text-text-muted">{fahrzeug.kennzeichen}</p>}
                          </div>
                          <Button intent="secondary" appearance="ghost" size="icon" onClick={() => handleOpenZeichen(fahrzeug.id)} title="Taktisches Zeichen" aria-label="Taktisches Zeichen verwalten">
                            <PiMapPin className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <EinheitZuweisungsDropdown
                            currentEinheitId={fahrzeug.einheitId}
                            einheiten={einheitenOptions}
                            onAssign={(einheitId) => handleEinheitAssign(fahrzeug.id, einheitId)}
                            isLoading={assigningFahrzeugIds.has(fahrzeug.id)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fahrzeug hinzufügen Dialog */}
      <FahrzeugHinzufuegenDialog isOpen={showFahrzeugDialog} onClose={handleCloseFahrzeugDialog} einsatzId={einsatzId} />

      {/* Taktisches Zeichen Panel */}
      {zeichenPanelFahrzeug && (
        <FahrzeugZeichenPanel
          isOpen={!!zeichenPanelFahrzeugId}
          onClose={handleCloseZeichen}
          einsatzId={einsatzId}
          fahrzeugId={zeichenPanelFahrzeug.id}
          fahrzeugName={zeichenPanelFahrzeug.funkrufname}
        />
      )}
    </div>
  );
}
