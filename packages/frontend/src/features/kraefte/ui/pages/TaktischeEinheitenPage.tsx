/**
 * Hauptseite für die Verwaltung taktischer Einheiten.
 *
 * Orchestriert Header, Statistiken, Baum-Ansicht und alle Dialoge.
 * Folgt das personal.tsx Seiten-Pattern (Header + Stats + Content + Dialoge).
 */

import { useState, useCallback, useMemo } from 'react';
import type { EinsatzFahrzeugDto } from '@/shared';

import { PiPlus, PiTreeStructure, PiShieldCheck, PiWarning, PiXCircle } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { useEinsatzFahrzeuge } from '@/features/kraefte/api/use-einsatz-fahrzeuge';
import { useChangeEinheitStatus } from '@/features/kraefte/api/use-change-einheit-status';
import { useDeleteEinheit } from '@/features/kraefte/api/use-delete-einheit';

import { EinheitenBaum } from '../organisms/EinheitenBaum';
import { EinheitCreateDialog } from '../organisms/EinheitCreateDialog';
import { EinheitEditDialog } from '../organisms/EinheitEditDialog';
import { PersonZuweisungPanel } from '../organisms/PersonZuweisungPanel';
import { FahrzeugZuweisungPanel } from '../organisms/FahrzeugZuweisungPanel';

interface TaktischeEinheitenPageProps {
  /** Einsatz-ID */
  einsatzId: string;
}

/**
 * Taktische Einheiten Seite.
 *
 * Zeigt eine Übersicht aller Einheiten als Baumstruktur mit
 * Statistik-Karten und Dialogen für CRUD-Operationen.
 */
export function TaktischeEinheitenPage({ einsatzId }: TaktischeEinheitenPageProps) {
  // === Dialog States ===
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [editEinheitId, setEditEinheitId] = useState<string | null>(null);
  const [deleteEinheitId, setDeleteEinheitId] = useState<string | null>(null);
  const [zuweisungEinheitId, setZuweisungEinheitId] = useState<string | null>(null);
  const [fahrzeugZuweisungEinheitId, setFahrzeugZuweisungEinheitId] = useState<string | null>(null);

  // === Daten laden ===
  const { data: einheiten = [], isLoading, error } = useEinsatzEinheiten(einsatzId);
  const { data: fahrzeuge = [] } = useEinsatzFahrzeuge(einsatzId);

  /** Fahrzeuge nach Einheit-ID gruppiert */
  const fahrzeugeByEinheit = useMemo(() => {
    const map = new Map<string, EinsatzFahrzeugDto[]>();
    for (const fz of fahrzeuge) {
      if (!fz.einheitId) continue;
      const bucket = map.get(fz.einheitId) ?? [];
      bucket.push(fz);
      map.set(fz.einheitId, bucket);
    }
    return map;
  }, [fahrzeuge]);

  // === Mutations ===
  const { mutate: changeStatus } = useChangeEinheitStatus(einsatzId);
  const { mutate: deleteEinheit, isPending: isDeleting } = useDeleteEinheit(einsatzId);

  // === Statistiken berechnen ===
  const stats = useMemo(() => {
    const gesamt = einheiten.length;
    const einsatzbereit = einheiten.filter((e) => e.status === 'EINSATZBEREIT').length;
    const imEinsatz = einheiten.filter((e) => e.status === 'IM_EINSATZ').length;
    const aufgeloest = einheiten.filter((e) => e.status === 'AUFGELOEST').length;

    return { gesamt, einsatzbereit, imEinsatz, aufgeloest };
  }, [einheiten]);

  // === Handler ===
  const handleOpenCreate = useCallback(() => {
    setCreateParentId(undefined);
    setShowCreateDialog(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreateDialog(false);
    setCreateParentId(undefined);
  }, []);

  const handleAddChild = useCallback((parentId: string) => {
    setCreateParentId(parentId);
    setShowCreateDialog(true);
  }, []);

  const handleEdit = useCallback((einheitId: string) => {
    setEditEinheitId(einheitId);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditEinheitId(null);
  }, []);

  const handleDelete = useCallback((einheitId: string) => {
    setDeleteEinheitId(einheitId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteEinheitId) {
      deleteEinheit(deleteEinheitId, {
        onSuccess: () => {
          setDeleteEinheitId(null);
        },
      });
    }
  }, [deleteEinheitId, deleteEinheit]);

  const handleCloseDelete = useCallback(() => {
    setDeleteEinheitId(null);
  }, []);

  const handleStatusChange = useCallback(
    (einheitId: string, status: string) => {
      changeStatus({ einheitId, dto: { status } });
    },
    [changeStatus],
  );

  const handleOpenZuweisung = useCallback((einheitId: string) => {
    setZuweisungEinheitId(einheitId);
  }, []);

  const handleCloseZuweisung = useCallback(() => {
    setZuweisungEinheitId(null);
  }, []);

  const handleOpenFahrzeugZuweisung = useCallback((einheitId: string) => {
    setFahrzeugZuweisungEinheitId(einheitId);
  }, []);

  const handleCloseFahrzeugZuweisung = useCallback(() => {
    setFahrzeugZuweisungEinheitId(null);
  }, []);

  // === Loading State ===
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade Einheiten..." />
      </div>
    );
  }

  // === Error State ===
  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Die Einheiten konnten nicht geladen werden." />;
  }

  // Name der zu löschenden Einheit für den Confirm-Dialog
  const deleteEinheitName = deleteEinheitId ? (einheiten.find((e) => e.id === deleteEinheitId)?.name ?? 'Einheit') : '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Taktische Einheiten</h1>
          <p className="mt-1 text-sm text-text-secondary">Verwalten Sie die taktischen Einheiten und deren Personalzuweisung</p>
        </div>
        <Button intent="primary" onClick={handleOpenCreate}>
          <PiPlus className="mr-2 h-4 w-4" />
          Neue Einheit
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-info-surface p-3">
              <PiTreeStructure className="h-6 w-6 text-status-info-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.gesamt}</p>
              <p className="text-sm text-text-muted">Gesamt</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-success-surface p-3">
              <PiShieldCheck className="h-6 w-6 text-status-success-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.einsatzbereit}</p>
              <p className="text-sm text-text-muted">Einsatzbereit</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-warning-surface p-3">
              <PiWarning className="h-6 w-6 text-status-warning-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.imEinsatz}</p>
              <p className="text-sm text-text-muted">Im Einsatz</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel bg-surface-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-panel bg-status-danger-surface p-3">
              <PiXCircle className="h-6 w-6 text-status-danger-text" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{stats.aufgeloest}</p>
              <p className="text-sm text-text-muted">Aufgelöst</p>
            </div>
          </div>
        </div>
      </div>

      {/* Einheiten-Baum */}
      <EinheitenBaum
        einheiten={einheiten}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onAddChild={handleAddChild}
        onAssignPersonen={handleOpenZuweisung}
        onAssignFahrzeuge={handleOpenFahrzeugZuweisung}
        fahrzeugeByEinheit={fahrzeugeByEinheit}
      />

      {/* Erstellen Dialog */}
      <EinheitCreateDialog isOpen={showCreateDialog} onClose={handleCloseCreate} einsatzId={einsatzId} parentId={createParentId} />

      {/* Bearbeiten Dialog */}
      {editEinheitId && <EinheitEditDialog isOpen={!!editEinheitId} onClose={handleCloseEdit} einsatzId={einsatzId} einheitId={editEinheitId} />}

      {/* Löschen Bestätigung */}
      <Dialog.Confirm
        isOpen={!!deleteEinheitId}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Einheit löschen"
        message={`Möchten Sie die Einheit "${deleteEinheitName}" wirklich löschen? Alle zugewiesenen Personen werden freigegeben.`}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isProcessing={isDeleting}
      />

      {/* Personalzuweisung Panel */}
      {zuweisungEinheitId && <PersonZuweisungPanel isOpen={!!zuweisungEinheitId} onClose={handleCloseZuweisung} einsatzId={einsatzId} einheitId={zuweisungEinheitId} />}

      {/* Fahrzeugzuweisung Panel */}
      {fahrzeugZuweisungEinheitId && (
        <FahrzeugZuweisungPanel
          isOpen={!!fahrzeugZuweisungEinheitId}
          onClose={handleCloseFahrzeugZuweisung}
          einsatzId={einsatzId}
          einheitId={fahrzeugZuweisungEinheitId}
          einheitName={einheiten.find((e) => e.id === fahrzeugZuweisungEinheitId)?.name ?? 'Einheit'}
        />
      )}
    </div>
  );
}
