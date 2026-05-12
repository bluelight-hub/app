/**
 * Fahrzeuge-Verwaltung Route
 *
 * Zeigt alle Fahrzeuge eines Einsatzes als Karten-Grid (Statustableau-Stil).
 * Klick auf FMS-Badge ändert Status direkt, Klick auf Karte öffnet Detail-Panel.
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { useEinsatzFahrzeuge, useUpdateFmsStatus } from '@/features/einsatz/api';
import { useEinsatzEinheiten, useAssignFahrzeugZuEinheit } from '@/features/kraefte/api';
import { useEinsatzZeichen } from '@/features/taktische-zeichen';
import { FahrzeugHinzufuegenDialog } from '@/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism';
import { FahrzeugZeichenPanel } from '@/features/kraefte/ui/organisms/FahrzeugZeichenPanel';
import { FahrzeugDetailPanel } from '@/features/kraefte/ui/organisms/FahrzeugDetailPanel';
import { FahrzeugGridCard, FahrzeugGridCardSkeleton } from '@/features/kraefte/ui/molecules/FahrzeugGridCard';
import { FahrzeugFilterTabs, type FahrzeugFilter } from '@/features/kraefte/ui/molecules/FahrzeugFilterTabs';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { isImEinsatzStatus, isEinsatzbereitStatus, type FmsStatus } from '@/features/einsatz';
import { useState, useCallback, useMemo } from 'react';
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
  // === Dialog/Panel States ===
  const [showFahrzeugDialog, setShowFahrzeugDialog] = useState(false);
  const [selectedFahrzeugId, setSelectedFahrzeugId] = useState<string | null>(null);
  const [zeichenPanelFahrzeugId, setZeichenPanelFahrzeugId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FahrzeugFilter>('alle');
  const [assigningFahrzeugIds, setAssigningFahrzeugIds] = useState<Set<string>>(new Set());

  // === Daten laden ===
  const { data: fahrzeuge = [], isLoading, error } = useEinsatzFahrzeuge(einsatzId);
  const { data: einheiten = [] } = useEinsatzEinheiten(einsatzId);
  const { data: alleZeichen = [] } = useEinsatzZeichen(einsatzId);

  // === Mutations ===
  const updateFmsStatus = useUpdateFmsStatus(einsatzId);
  const assignToEinheit = useAssignFahrzeugZuEinheit(einsatzId);

  // === Abgeleitete Daten ===

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

  /** Einheiten-Map für schnellen Namens-Lookup */
  const einheitenMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of einheiten) {
      map.set(e.id, e.name);
    }
    return map;
  }, [einheiten]);

  /** Filter-Zähler */
  const filterCounts = useMemo(
    () => ({
      alle: fahrzeuge.length,
      einsatz: fahrzeuge.filter((f) => isImEinsatzStatus(f.fmsStatus)).length,
      bereit: fahrzeuge.filter((f) => isEinsatzbereitStatus(f.fmsStatus)).length,
      andere: fahrzeuge.filter((f) => !isImEinsatzStatus(f.fmsStatus) && !isEinsatzbereitStatus(f.fmsStatus)).length,
    }),
    [fahrzeuge],
  );

  /** Gefilterte Fahrzeuge */
  const filteredFahrzeuge = useMemo(() => {
    switch (activeFilter) {
      case 'einsatz':
        return fahrzeuge.filter((f) => isImEinsatzStatus(f.fmsStatus));
      case 'bereit':
        return fahrzeuge.filter((f) => isEinsatzbereitStatus(f.fmsStatus));
      case 'andere':
        return fahrzeuge.filter((f) => !isImEinsatzStatus(f.fmsStatus) && !isEinsatzbereitStatus(f.fmsStatus));
      default:
        return fahrzeuge;
    }
  }, [fahrzeuge, activeFilter]);

  /** Statistiken */
  const stats = useMemo(() => {
    const total = fahrzeuge.length;
    const active = fahrzeuge.filter((f) => isImEinsatzStatus(f.fmsStatus)).length;
    const totalBesatzung = fahrzeuge.reduce((sum, f) => sum + (f.besatzung?.length || 0), 0);
    const avgBesatzung = total > 0 ? (totalBesatzung / total).toFixed(1) : '0';
    return { total, active, totalBesatzung, avgBesatzung };
  }, [fahrzeuge]);

  /** Ausgewähltes Fahrzeug für das Detail-Panel */
  const selectedFahrzeug = selectedFahrzeugId ? fahrzeuge.find((f) => f.id === selectedFahrzeugId) : null;

  /** Fahrzeug für das Zeichen-Panel */
  const zeichenPanelFahrzeug = zeichenPanelFahrzeugId ? fahrzeuge.find((f) => f.id === zeichenPanelFahrzeugId) : null;

  // === Handler ===

  const handleOpenFahrzeugDialog = useCallback(() => setShowFahrzeugDialog(true), []);
  const handleCloseFahrzeugDialog = useCallback(() => setShowFahrzeugDialog(false), []);

  const handleSelectFahrzeug = useCallback((fahrzeugId: string) => setSelectedFahrzeugId(fahrzeugId), []);
  const handleCloseDetail = useCallback(() => setSelectedFahrzeugId(null), []);

  const handleOpenZeichen = useCallback((fahrzeugId: string) => {
    setSelectedFahrzeugId(null);
    setZeichenPanelFahrzeugId(fahrzeugId);
  }, []);
  const handleCloseZeichen = useCallback(() => setZeichenPanelFahrzeugId(null), []);

  const handleStatusChange = useCallback(
    (fahrzeugId: string, newStatus: FmsStatus) => {
      updateFmsStatus.mutate({ fahrzeugId, fmsStatus: newStatus });
    },
    [updateFmsStatus],
  );

  const handleEinheitAssign = useCallback(
    (fahrzeugId: string, einheitId: string | null) => {
      if (assigningFahrzeugIds.has(fahrzeugId)) return;
      setAssigningFahrzeugIds((prev) => new Set(prev).add(fahrzeugId));
      assignToEinheit.mutate(
        { fahrzeugId, einheitId },
        {
          onSettled: () => {
            setAssigningFahrzeugIds((p) => {
              const n = new Set(p);
              n.delete(fahrzeugId);
              return n;
            });
          },
        },
      );
    },
    [assignToEinheit, assigningFahrzeugIds],
  );

  // === Loading & Error ===

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade Fahrzeugdaten..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Die Fahrzeugdaten konnten nicht geladen werden." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fahrzeuge</h1>
          <p className="mt-1 text-sm text-text-secondary">Verwalten Sie die eingesetzten Fahrzeuge und deren Status</p>
        </div>
        <Button intent="primary" onClick={handleOpenFahrzeugDialog}>
          <PiTruck className="mr-2 h-4 w-4" />
          Fahrzeug hinzufügen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-info-surface p-3">
              <PiTruck className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
              <p className="text-sm text-text-muted">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-success-surface p-3">
              <PiGauge className="h-6 w-6 text-status-success-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.active}</p>
              <p className="text-sm text-text-muted">Im Einsatz</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-info-surface p-3">
              <PiUsers className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.totalBesatzung}</p>
              <p className="text-sm text-text-muted">Personen</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-warning-surface p-3">
              <PiUser className="h-6 w-6 text-status-warning-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.avgBesatzung}</p>
              <p className="text-sm text-text-muted">Ø Besatzung</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter-Tabs */}
      <FahrzeugFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={filterCounts} />

      {/* Karten-Grid */}
      {filteredFahrzeuge.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFahrzeuge.map((fahrzeug) => (
            <FahrzeugGridCard
              key={fahrzeug.id}
              fahrzeug={fahrzeug}
              zeichen={zeichenByFahrzeug.get(fahrzeug.id)}
              einheitName={fahrzeug.einheitId ? einheitenMap.get(fahrzeug.einheitId) : null}
              onSelect={handleSelectFahrzeug}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-panel bg-surface-panel py-12 text-center shadow-sm">
          <PiTruck className="mx-auto mb-3 h-12 w-12 text-text-muted opacity-50" />
          <p className="text-sm text-text-muted">{activeFilter === 'alle' ? 'Noch keine Fahrzeuge zugeordnet' : 'Keine Fahrzeuge in dieser Kategorie'}</p>
          {activeFilter === 'alle' && (
            <Button appearance="outline" size="sm" className="mt-4" onClick={handleOpenFahrzeugDialog}>
              <PiTruck className="mr-2 h-4 w-4" />
              Erstes Fahrzeug hinzufügen
            </Button>
          )}
        </div>
      )}

      {/* Detail-Panel */}
      {selectedFahrzeug && (
        <FahrzeugDetailPanel
          isOpen={!!selectedFahrzeugId}
          onClose={handleCloseDetail}
          einsatzId={einsatzId}
          fahrzeug={selectedFahrzeug}
          zeichen={zeichenByFahrzeug.get(selectedFahrzeug.id)}
          onStatusChange={handleStatusChange}
          onEinheitAssign={handleEinheitAssign}
          onManageZeichen={handleOpenZeichen}
          isAssigning={assigningFahrzeugIds.has(selectedFahrzeug.id)}
        />
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
