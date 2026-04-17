import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PiArrowSquareOut, PiPencilSimple, PiTrash, PiWarningCircle } from 'react-icons/pi';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { GEFAHRENTYP_LABELS, SCHUTZOBJEKT_LABELS, WARNSTUFEN, type GefahrentypValue, type SchutzobjektValue, type WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { useUpdateGefahrenmatrixBewertung } from '@/features/gefahrenmatrix/api/mutations';
import { WarnstufeChip } from '@/features/gefahrenmatrix/ui/atoms/WarnstufeChip';
import { useAkutConfirm } from '@/features/gefahrenmatrix/hooks/use-akut-confirm';
import { splitViewActions, splitViewStore } from '@/features/einsatz/stores/split-view.store';
import { cn } from '@/shared/ui/cn';
import { useDeleteGefahrenzone } from '../../api';
import { GefahrenzoneInlinePopover, type GefahrenzonePopoverValues } from '../molecules/GefahrenzoneInlinePopover';

export interface GefahrenzoneDetailPanelProps {
  zone: GefahrenzoneDto;
  einsatzId: string;
  /** Optional — Callback, wenn Panel nach Delete geschlossen werden soll. */
  onClose?: () => void;
}

function normalizeWarnstufe(input: unknown): WarnstufeValue {
  if (typeof input === 'string' && WARNSTUFEN.includes(input as WarnstufeValue)) {
    return input as WarnstufeValue;
  }
  return 'KEINE';
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/**
 * Seitliches Detail-Panel für eine Gefahrenzone. Zeigt Metadaten + drei
 * primäre Aktionen: zur Matrix-Zelle springen, Warnstufe bearbeiten (reuse
 * `GefahrenzoneInlinePopover` aus G2), Zone löschen (mit Confirm).
 */
export function GefahrenzoneDetailPanel({ zone, einsatzId, onClose }: GefahrenzoneDetailPanelProps) {
  const navigate = useNavigate();
  const warnstufe = normalizeWarnstufe(zone.warnstufe);
  const gefahrentypLabel = GEFAHRENTYP_LABELS[zone.gefahrentyp as GefahrentypValue] ?? zone.gefahrentyp;
  const schutzobjektLabel = SCHUTZOBJEKT_LABELS[zone.schutzobjekt as SchutzobjektValue] ?? zone.schutzobjekt;

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Split-View-Roundtrip (G4): Im Split-Modus spiegelt der Panel-Mount die Zone
  // als Focus in den Store, damit die Gefahrenmatrix-Seite die passende Zelle
  // scrollt und pulsiert. Out-of-split: kein Side-Effect.
  useEffect(() => {
    if (!splitViewStore.state.isActive) return;
    const current = splitViewStore.state.focus;
    if (current?.kind === 'zone' && current.zoneId === zone.id) return;
    splitViewActions.setFocus({ kind: 'zone', zoneId: zone.id });
  }, [zone.id]);

  const updateMatrix = useUpdateGefahrenmatrixBewertung();
  const deleteZone = useDeleteGefahrenzone();

  const initialValues: GefahrenzonePopoverValues = {
    gefahrentyp: zone.gefahrentyp as GefahrentypValue,
    schutzobjekt: zone.schutzobjekt as SchutzobjektValue,
    warnstufe,
  };

  const handleJumpToMatrix = () => {
    navigate({
      to: '/app/einsatz/$einsatzId/sicherheit/gefahren',
      params: { einsatzId },
      search: { mode: 'standard', focus: `cell:${zone.gefahrentyp}:${zone.schutzobjekt}` } as never,
    });
  };

  const { requestChange, dialog: akutDialog } = useAkutConfirm({
    onCommit: async ({ gefahrentyp, schutzobjekt, warnstufe: nextWarnstufe }) => {
      await updateMatrix.mutateAsync({ einsatzId, data: { gefahrentyp, schutzobjekt, warnstufe: nextWarnstufe } });
      setEditing(false);
    },
    onCancel: () => {
      // Edit-Popover bleibt offen, damit der Nutzer eine andere Warnstufe wählen kann.
    },
  });

  const handleSubmitEdit = (values: GefahrenzonePopoverValues) => {
    requestChange({
      gefahrentyp: zone.gefahrentyp as GefahrentypValue,
      schutzobjekt: zone.schutzobjekt as SchutzobjektValue,
      previous: warnstufe,
      next: values.warnstufe,
    });
  };

  const handleDelete = async () => {
    await deleteZone.mutateAsync({ einsatzId, zoneId: zone.id });
    setConfirmDelete(false);
    onClose?.();
  };

  const sectionHeaderId = `gefahrenzone-panel-header-${zone.id}`;

  return (
    <section role="region" aria-labelledby={sectionHeaderId} className="flex flex-col gap-4 p-panel">
      {akutDialog}
      <header className="flex items-start gap-3">
        <WarnstufeChip warnstufe={warnstufe} size="md" />
        <div className="min-w-0 flex-1">
          <h2 id={sectionHeaderId} className="text-title-sm font-semibold text-text-primary">
            {gefahrentypLabel}
          </h2>
          <p className="text-body-xs text-text-muted">Schutzobjekt: {schutzobjektLabel}</p>
        </div>
      </header>

      {zone.bezeichnung ? <p className="rounded-panel bg-surface-raised p-3 text-body-sm text-text-secondary">{String(zone.bezeichnung)}</p> : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-body-sm">
        <dt className="text-text-muted">Geometrietyp</dt>
        <dd className="text-text-primary">{zone.geometryType === 'CIRCLE' ? 'Kreis' : 'Polygon'}</dd>
        <dt className="text-text-muted">Erstellt</dt>
        <dd className="text-text-primary">
          {formatDate(zone.erstelltAm)}
          <span className="ml-1 text-text-muted">· {zone.erstelltVon}</span>
        </dd>
        <dt className="text-text-muted">Aktualisiert</dt>
        <dd className="text-text-primary">{formatDate(zone.aktualisiertAm)}</dd>
        <dt className="text-text-muted">ID</dt>
        <dd className="font-mono text-[11px] break-all text-text-muted">{zone.id}</dd>
      </dl>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleJumpToMatrix}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-action-primary px-3 py-1.5 text-body-sm font-medium text-text-inverse shadow-button-primary hover:bg-action-primary-hover focus:shadow-focus focus:outline-none"
        >
          <PiArrowSquareOut className="size-4" aria-hidden />
          Zur Matrix-Zelle
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center justify-center gap-2 rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-raised focus:shadow-focus focus:outline-none"
        >
          <PiPencilSimple className="size-4" aria-hidden />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center justify-center gap-2 rounded-control border border-transparent px-3 py-1.5 text-body-sm text-status-danger-text hover:border-status-danger-border hover:bg-status-danger-surface focus:shadow-focus focus:outline-none"
        >
          <PiTrash className="size-4" aria-hidden />
          Zone löschen
        </button>
      </div>

      {confirmDelete && (
        <div role="alertdialog" aria-labelledby={`${sectionHeaderId}-confirm`} className={cn('rounded-panel border border-status-danger-border bg-status-danger-surface p-3 text-body-sm')}>
          <div className="flex items-start gap-2">
            <PiWarningCircle className="size-4 text-status-danger-text" aria-hidden />
            <div className="flex-1">
              <p id={`${sectionHeaderId}-confirm`} className="font-semibold text-status-danger-text">
                Zone wirklich löschen?
              </p>
              <p className="text-text-secondary">Die Geometrie wird unwiderruflich entfernt. Die Matrix-Bewertung bleibt bestehen.</p>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-control px-2 py-1 text-body-sm text-text-secondary hover:bg-surface-raised focus:shadow-focus focus:outline-none"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteZone.isPending}
              className="rounded-control bg-status-danger-text px-2 py-1 text-body-sm font-medium text-text-inverse hover:opacity-90 focus:shadow-focus focus:outline-none disabled:opacity-60"
            >
              Löschen
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="relative">
          <GefahrenzoneInlinePopover mode="edit" initialValues={initialValues} isSubmitting={updateMatrix.isPending} onCancel={() => setEditing(false)} onSubmit={handleSubmitEdit} />
        </div>
      )}
    </section>
  );
}
