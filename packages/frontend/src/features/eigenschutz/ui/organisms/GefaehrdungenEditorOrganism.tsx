/**
 * GefaehrdungenEditorOrganism — Save-Flow-Orchester für Gefährdungs-Items
 * (Story 2.2 Task 9, AC4 + AC10).
 *
 * Rendert pro Item einen `GefaehrdungItemEditor`, verwaltet lokalen
 * Draft-State und übergibt den gesamten Items-Array beim Speichern an den
 * Update-Mutation-Hook. Die Mutation trägt das `expectedVersion` der
 * geladenen Beurteilung für Optimistic-Concurrency (409 → Konflikt-Banner).
 *
 * Keyboard-Shortcut `Ctrl/Cmd+S` triggert den Speichern-Flow, analog zum
 * Admin-Backend-Pattern (UX-DR22).
 *
 * Permission-Gate: `useEigenschutzPermissions()` liefert aktuell einen
 * Proxy-Wert (Navigation-Access) — das serverseitige 403 bei fehlender
 * `write`-Rolle bleibt die harte Source-of-Truth. Der Tooltip benennt die
 * fehlende Berechtigung explizit (AC5 in Story 2.1, hier Wiederverwendung).
 */

import { useEigenschutzPermissions } from '@/features/eigenschutz/hooks/useEigenschutzPermissions';
import { EIGENSCHUTZ_QUERY_KEYS, useUpdateGefaehrdungsbeurteilungItems } from '@/features/eigenschutz/api/queries';
import { GEFAEHRDUNG_ITEM_LIMITS, type Gefaehrdungsbeurteilung, type GefaehrdungItem } from '@bluelight-hub/shared/schemas';
import { Button } from '@/shared/ui/atoms/button.atom';
import { SeverityBanner } from '@/shared/ui/molecules/severity-banner.molecule';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiFloppyDiskLight, PiPlusLight } from 'react-icons/pi';
import { GefaehrdungItemEditor } from '../molecules/GefaehrdungItemEditor';

export interface GefaehrdungenEditorOrganismProps {
  readonly einsatzId: string;
  readonly beurteilung: Gefaehrdungsbeurteilung;
}

function getHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export function GefaehrdungenEditorOrganism({ einsatzId, beurteilung }: GefaehrdungenEditorOrganismProps) {
  const queryClient = useQueryClient();
  const mutation = useUpdateGefaehrdungsbeurteilungItems(einsatzId, beurteilung.id);
  const { canCreateGefaehrdungsbeurteilung, isLoading: permissionLoading, requiredPermission } = useEigenschutzPermissions();

  const [items, setItems] = useState<GefaehrdungItem[]>(() => beurteilung.items);
  const [autoFocusIndex, setAutoFocusIndex] = useState<number | null>(null);
  // Wenn die Beurteilung neu geladen wird (z. B. nach Invalidate), müssen
  // lokale Items den Server-State übernehmen — sonst würde der Banner-
  // Reload-Flow stumm ins Leere laufen.
  const lastSyncedVersionRef = useRef<number>(beurteilung.version);
  useEffect(() => {
    if (beurteilung.version !== lastSyncedVersionRef.current) {
      setItems(beurteilung.items);
      lastSyncedVersionRef.current = beurteilung.version;
    }
  }, [beurteilung.items, beurteilung.version]);

  // Validierungs-Status lokal ableiten — TanStack-Form wäre Overkill für
  // einen flachen Items-Array. Die Zod-Validation im Mutation-Handler
  // bleibt die Source-of-Truth fürs Backend-Round-Trip.
  const hasInvalidItem = useMemo(() => {
    return items.some((item) => {
      const titleInvalid = !(item.title ?? '').trim() || (item.title ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.titleMax;
      const schutzTooLong = (item.schutzmassnahmen ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax;
      const descTooLong = (item.description ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.descriptionMax;
      return titleInvalid || schutzTooLong || descTooLong;
    });
  }, [items]);

  const permissionMissing = !permissionLoading && !canCreateGefaehrdungsbeurteilung;
  const saveDisabled = permissionMissing || hasInvalidItem || mutation.isPending;
  const saveTitle = permissionMissing ? `Fehlende Berechtigung: ${requiredPermission}` : undefined;

  const conflictDetected = getHttpStatus(mutation.error) === 409;

  const handleSave = useCallback(() => {
    if (saveDisabled) return;
    mutation.mutate({
      items,
      expectedVersion: beurteilung.version,
    });
  }, [saveDisabled, mutation, items, beurteilung.version]);

  // Ctrl/Cmd+S Shortcut (UX-DR22) — document-level, damit auch bei Fokus
  // im Editor-Feld ein Save ausgelöst werden kann. preventDefault verhindert
  // den Browser-Save-Dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const matches = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!matches) return;
      event.preventDefault();
      handleSave();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const handleAdd = useCallback(() => {
    setItems((prev) => {
      const next = [...prev, { title: '' } as GefaehrdungItem];
      setAutoFocusIndex(next.length - 1);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setItems(beurteilung.items);
    setAutoFocusIndex(null);
  }, [beurteilung.items]);

  const handleReload = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, beurteilung.id),
    });
  }, [queryClient, einsatzId, beurteilung.id]);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleItemChange = useCallback((index: number, next: GefaehrdungItem) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? next : item)));
  }, []);

  return (
    <div className="space-y-4" data-testid="gefaehrdungen-editor-organism">
      {conflictDetected ? (
        <SeverityBanner
          variant="warning"
          title="Jemand anders hat bereits Änderungen gespeichert — bitte neu laden."
          description="Der Save-Versuch wurde nicht übernommen, damit keine fremden Änderungen überschrieben werden."
          action={{ label: 'Neu laden', onClick: handleReload }}
          data-testid="gefaehrdungen-editor-conflict-banner"
        />
      ) : null}

      <div className="space-y-3" data-testid="gefaehrdungen-editor-items">
        {items.map((item, idx) => (
          <GefaehrdungItemEditor
            // Stable key pro-Index reicht — Items tragen erst nach Backend-Save
            // eine `id`. Das ist konsistent mit dem vorhandenen Drawer-Muster.
            key={item.id ?? `item-${idx}`}
            index={idx}
            value={item}
            onChange={(next) => handleItemChange(idx, next)}
            onRemove={() => handleRemove(idx)}
            autoFocusTitle={autoFocusIndex === idx}
            disabled={mutation.isPending}
          />
        ))}
        {items.length === 0 ? (
          <p className="rounded-panel border border-dashed border-border-subtle bg-surface-panel p-4 text-center text-sm text-text-muted">
            Keine Gefährdungen erfasst. Füge eine hinzu, um zu starten.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
        <Button intent="secondary" appearance="outline" type="button" onClick={handleAdd} disabled={mutation.isPending} data-testid="gefaehrdungen-editor-add">
          <PiPlusLight className="h-4 w-4" />
          Gefährdung hinzufügen
        </Button>
        <div className="flex items-center gap-2">
          {/* Tab-Order per AC11: Speichern vor Abbrechen (linear zu Schutzmaßnahmen → Speichern → Abbrechen). */}
          <Button
            intent="primary"
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            aria-disabled={saveDisabled || undefined}
            title={saveTitle}
            loading={mutation.isPending}
            kbd="⌘S"
            data-testid="gefaehrdungen-editor-save"
          >
            <PiFloppyDiskLight className="h-4 w-4" />
            Speichern
          </Button>
          <Button intent="secondary" appearance="ghost" type="button" onClick={handleReset} disabled={mutation.isPending} data-testid="gefaehrdungen-editor-reset">
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
