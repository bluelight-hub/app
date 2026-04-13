# Zeichen-Detail-Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zeichen auf der Lagekarte erhalten ein klickbares Detail-Panel mit Vorschau, editierbarem Label/Notiz, Komposition, Position, Metadaten und Lösch-Aktion.

**Architecture:** Eigenes `Dialog.SlideIn`-Panel (kein Detail-Provider), gesteuert über `selectedZeichenId` im `drawStore`. Klick auf Zeichen → Store-Update → Panel öffnet sich. Label/Notiz inline editierbar mit Debounce-Auto-Save via `useUpdateZeichen`.

**Tech Stack:** React, @tanstack/react-store, @tanstack/react-query, Dialog.SlideIn (Headless UI), react-icons/pi (Phosphor Icons), taktische-zeichen-core (SVG-Rendering)

---

### Task 1: Draw-Store erweitern — `selectedZeichenId` State + Actions

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/stores/draw.store.ts`

- [ ] **Step 1: State-Feld hinzufügen**

In `DrawStoreState` Interface und `initialState` ergänzen:

```typescript
// In DrawStoreState Interface (nach pendingZeichenPlacement):
/** ID des aktuell im Detail-Panel angezeigten Zeichens (null = Panel geschlossen) */
selectedZeichenId: string | null;
```

```typescript
// In initialState (nach pendingZeichenPlacement: null):
selectedZeichenId: null,
```

- [ ] **Step 2: Actions hinzufügen**

Zwei neue exportierte Funktionen am Ende der Actions-Sektion (vor `resetDrawStore`):

```typescript
/**
 * Öffnet das Zeichen-Detail-Panel für ein bestimmtes Zeichen.
 * Schließt dabei die Zeichen-Sidebar und bricht wartende Platzierungen ab.
 */
export const openZeichenDetail = (zeichenId: string) => {
  drawStore.setState((state) => ({
    ...state,
    selectedZeichenId: zeichenId,
    isZeichenSidebarVisible: false,
    pendingZeichenPlacement: null,
  }));
};

/**
 * Schließt das Zeichen-Detail-Panel
 */
export const closeZeichenDetail = () => {
  drawStore.setState((state) => ({
    ...state,
    selectedZeichenId: null,
  }));
};
```

- [ ] **Step 3: resetDrawStore anpassen**

`resetDrawStore` setzt bereits `initialState` zurück — da `selectedZeichenId: null` im `initialState` steht, ist kein zusätzlicher Code nötig. Verifizieren, dass `initialState` das neue Feld enthält.

- [ ] **Step 4: TypeScript-Check**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit --pretty 2>&1 | tail -5`
Expected: Keine Fehler (leere Ausgabe)

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/features/lagekarte/stores/draw.store.ts
git commit -m "✨(frontend): Draw-Store um selectedZeichenId State + Actions erweitern"
```

---

### Task 2: ZeichenDetailContent — Die 6 Sektionen als Presentational Component

**Files:**
- Create: `packages/frontend/src/features/lagekarte/ui/molecules/ZeichenDetailContent.tsx`

- [ ] **Step 1: Datei erstellen mit allen 6 Sektionen**

```typescript
/**
 * ZeichenDetailContent - Inhalt des Zeichen-Detail-Panels
 *
 * 6 Sektionen: Vorschau, Label/Notiz (editierbar), Komposition, Position, Metadaten, Aktionen.
 * Visueller Stil konsistent mit DwdPanelContent / NinaPanelContent.
 */

import { useCallback, useEffect, useState } from 'react';
import { PiClock, PiMapPin, PiNotePencil, PiPuzzlePiece, PiTrash } from 'react-icons/pi';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { ZeichenPreview } from '@/features/taktische-zeichen';
import type { ZeichenDefinition } from '@/features/taktische-zeichen';
import { Button } from '@/shared/ui/atoms/button.atom';

/** Labels für die Kompositions-Felder */
const KOMPOSITION_LABELS: { key: keyof TaktischesZeichenResponseDto['zeichenDefinition']; label: string }[] = [
  { key: 'grundzeichen', label: 'Grundzeichen' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'fachaufgabe', label: 'Fachaufgabe' },
  { key: 'einheit', label: 'Einheit' },
  { key: 'verwaltungsstufe', label: 'Verwaltungsstufe' },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface ZeichenDetailContentProps {
  zeichen: TaktischesZeichenResponseDto;
  onUpdateLabel: (label: string) => void;
  onUpdateNotiz: (notiz: string) => void;
  onRemove: () => void;
  isRemoving: boolean;
}

export function ZeichenDetailContent({ zeichen, onUpdateLabel, onUpdateNotiz, onRemove, isRemoving }: ZeichenDetailContentProps) {
  // Lokaler State für sofortige Input-Reaktion + Debounce
  const [label, setLabel] = useState(zeichen.label ?? '');
  const [notiz, setNotiz] = useState(zeichen.notiz ?? '');

  // Sync wenn sich das Zeichen extern ändert (z.B. nach Mutation-Response)
  useEffect(() => {
    setLabel(zeichen.label ?? '');
  }, [zeichen.label]);

  useEffect(() => {
    setNotiz(zeichen.notiz ?? '');
  }, [zeichen.notiz]);

  // Debounced Save für Label
  useEffect(() => {
    if (label === (zeichen.label ?? '')) return;
    const timer = setTimeout(() => onUpdateLabel(label), 500);
    return () => clearTimeout(timer);
  }, [label, zeichen.label, onUpdateLabel]);

  // Debounced Save für Notiz
  useEffect(() => {
    if (notiz === (zeichen.notiz ?? '')) return;
    const timer = setTimeout(() => onUpdateNotiz(notiz), 500);
    return () => clearTimeout(timer);
  }, [notiz, zeichen.notiz, onUpdateNotiz]);

  const definition: ZeichenDefinition = zeichen.zeichenDefinition;

  return (
    <div className="space-y-0">
      {/* 1. Zeichen-Vorschau */}
      <div className="flex flex-col items-center pb-4">
        <ZeichenPreview definition={definition} size="lg" />
        <h3 className="mt-2 text-base font-semibold text-text-primary">{zeichen.label || definition.grundzeichen}</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          {[definition.grundzeichen, definition.organisation, definition.fachaufgabe].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* 2. Label & Notiz (editierbar) */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiNotePencil className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Label & Notiz</h4>
          </div>
          <div className="mt-2 space-y-2">
            <div>
              <label htmlFor="zeichen-label" className="text-xs text-text-muted">Label</label>
              <input
                id="zeichen-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Bezeichnung eingeben..."
                className="mt-0.5 w-full rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
            <div>
              <label htmlFor="zeichen-notiz" className="text-xs text-text-muted">Notiz</label>
              <textarea
                id="zeichen-notiz"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Notiz hinzufügen..."
                rows={3}
                className="mt-0.5 w-full resize-y rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Zeichen-Komposition */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiPuzzlePiece className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Zeichen-Komposition</h4>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {KOMPOSITION_LABELS.map(({ key, label: fieldLabel }) => {
              const value = definition[key];
              if (!value) return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full border border-border-subtle bg-surface-raised px-2.5 py-0.5 text-body-xs text-text-secondary"
                >
                  <span className="mr-1 text-text-muted">{fieldLabel}:</span>
                  {value}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Position */}
      {zeichen.istPlatziert && zeichen.lat != null && zeichen.lng != null && (
        <section className="space-y-3.5 border-t border-border-subtle pt-3">
          <div>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Position</h4>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
              <div>
                <span className="text-xs text-text-muted">Lat: </span>
                {zeichen.lat.toFixed(5)}°
              </div>
              <div>
                <span className="text-xs text-text-muted">Lng: </span>
                {zeichen.lng.toFixed(5)}°
              </div>
            </div>
            {zeichen.mgrs && (
              <div className="mt-1 text-sm text-text-primary">
                <span className="text-xs text-text-muted">MGRS: </span>
                <span className="font-mono">{zeichen.mgrs}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Metadaten */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiClock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Metadaten</h4>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-text-muted">
            <p>Erstellt von <span className="text-text-secondary">{zeichen.createdBy}</span> · {formatDateTime(zeichen.createdAt)}</p>
            {zeichen.updatedBy && <p>Geändert von <span className="text-text-secondary">{zeichen.updatedBy}</span> · {formatDateTime(zeichen.updatedAt)}</p>}
          </div>
        </div>
      </section>

      {/* 6. Aktionen */}
      <section className="border-t border-border-subtle pt-3">
        <Button
          intent="danger"
          size="sm"
          className="w-full"
          onClick={onRemove}
          loading={isRemoving}
          disabled={isRemoving}
        >
          <PiTrash className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Von Karte entfernen
        </Button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript-Check**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit --pretty 2>&1 | tail -10`
Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/lagekarte/ui/molecules/ZeichenDetailContent.tsx
git commit -m "✨(frontend): ZeichenDetailContent mit 6 Sektionen (Vorschau, Label/Notiz, Komposition, Position, Metadaten, Aktionen)"
```

---

### Task 3: ZeichenDetailPanel — Wrapper mit Dialog.SlideIn + Mutations

**Files:**
- Create: `packages/frontend/src/features/lagekarte/ui/molecules/ZeichenDetailPanel.molecule.tsx`

- [ ] **Step 1: Panel-Komponente erstellen**

```typescript
/**
 * ZeichenDetailPanel - Slide-In Panel für taktische Zeichen
 *
 * Wrapper um ZeichenDetailContent: Lädt Zeichen aus dem Query-Cache,
 * stellt Mutations (Update, Remove) bereit, steuert Dialog.SlideIn.
 */

import { useCallback } from 'react';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { useUpdateZeichen, useRemoveZeichen } from '@/features/taktische-zeichen';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { ZeichenDetailContent } from './ZeichenDetailContent';

interface ZeichenDetailPanelProps {
  /** Das anzuzeigende Zeichen (null = Panel geschlossen) */
  zeichen: TaktischesZeichenResponseDto | undefined;
  /** Einsatz-ID für Mutations */
  einsatzId: string;
  /** Ist das Panel geöffnet? */
  isOpen: boolean;
  /** Callback zum Schließen */
  onClose: () => void;
}

export function ZeichenDetailPanel({ zeichen, einsatzId, isOpen, onClose }: ZeichenDetailPanelProps) {
  const { mutate: updateZeichen } = useUpdateZeichen(einsatzId);
  const { mutate: removeZeichen, isPending: isRemoving } = useRemoveZeichen(einsatzId);

  const handleUpdateLabel = useCallback(
    (label: string) => {
      if (!zeichen) return;
      updateZeichen({ zeichenId: zeichen.id, dto: { label: label || undefined } });
    },
    [zeichen, updateZeichen],
  );

  const handleUpdateNotiz = useCallback(
    (notiz: string) => {
      if (!zeichen) return;
      updateZeichen({ zeichenId: zeichen.id, dto: { notiz: notiz || undefined } });
    },
    [zeichen, updateZeichen],
  );

  const handleRemove = useCallback(() => {
    if (!zeichen) return;
    removeZeichen(zeichen.id, { onSuccess: onClose });
  }, [zeichen, removeZeichen, onClose]);

  if (!zeichen) return null;

  const title = zeichen.label || zeichen.zeichenDefinition.grundzeichen;

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title={title} size="md">
      <ZeichenDetailContent
        zeichen={zeichen}
        onUpdateLabel={handleUpdateLabel}
        onUpdateNotiz={handleUpdateNotiz}
        onRemove={handleRemove}
        isRemoving={isRemoving}
      />
    </Dialog.SlideIn>
  );
}
```

- [ ] **Step 2: TypeScript-Check**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit --pretty 2>&1 | tail -10`
Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/lagekarte/ui/molecules/ZeichenDetailPanel.molecule.tsx
git commit -m "✨(frontend): ZeichenDetailPanel Wrapper mit Dialog.SlideIn und Mutations"
```

---

### Task 4: LagekarteView — Panel einbinden + onZeichenClick verdrahten

**Files:**
- Modify: `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx`

- [ ] **Step 1: Imports hinzufügen**

Ergänze in den bestehenden Import-Blöcken:

```typescript
// Beim drawStore Import (Zeile 15) die neuen Actions hinzufügen:
import { drawStore, toggleSnapEnabled, toggleSymbolPanel, toggleTemplatePanel, clearPendingZeichenPlacement, openZeichenDetail, closeZeichenDetail } from '@/features/lagekarte/stores/draw.store';

// Neuer Import für das Panel (nach den anderen Molecule-Imports):
import { ZeichenDetailPanel } from '../../molecules/ZeichenDetailPanel.molecule';
```

- [ ] **Step 2: Store-Selektor für selectedZeichenId hinzufügen**

Nach dem bestehenden `pendingZeichenPlacement` Selektor (Zeile 99) hinzufügen:

```typescript
const selectedZeichenId = useStore(drawStore, (s) => s.selectedZeichenId);
```

- [ ] **Step 3: Zeichen-Lookup aus dem Cache ableiten**

Nach `const isMapLoaded = !isLoading;` (Zeile 102) hinzufügen:

```typescript
// Zeichen für Detail-Panel aus Cache ableiten
const selectedZeichen = selectedZeichenId ? einsatzZeichen.find((z) => z.id === selectedZeichenId) : undefined;
```

- [ ] **Step 4: onZeichenClick Handler für TaktischeZeichenLayer setzen**

Die `<TaktischeZeichenLayer>` Komponente (Zeile 476) erhält das neue Prop:

```tsx
<TaktischeZeichenLayer
  mapRef={mapRef}
  isMapLoaded={isMapLoaded}
  zeichen={einsatzZeichen}
  onZeichenClick={(z) => openZeichenDetail(z.id)}
/>
```

- [ ] **Step 5: ZeichenDetailPanel im JSX einbinden**

Nach dem bestehenden `<MapDetailPanel ... />` (Zeile 542) einfügen:

```tsx
{/* Zeichen-Detail-Panel (Slide-In von rechts) */}
<ZeichenDetailPanel
  zeichen={selectedZeichen}
  einsatzId={einsatzId}
  isOpen={selectedZeichenId !== null}
  onClose={closeZeichenDetail}
/>
```

- [ ] **Step 6: TypeScript-Check**

Run: `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit --pretty 2>&1 | tail -10`
Expected: Keine Fehler

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx
git commit -m "✨(frontend): ZeichenDetailPanel in LagekarteView einbinden + onZeichenClick verdrahten"
```

---

### Task 5: Manueller Browser-Test

- [ ] **Step 1: Dev-Server starten (falls nicht bereits laufend)**

Run: `pnpm -r dev`

- [ ] **Step 2: Funktionstest im Browser**

Öffne `localhost:3090`, navigiere zu einem Einsatz → Lagekarte. Teste:

1. **Zeichen erstellen:** Über Karten-Zeichen-Sidebar ein Zeichen aus dem Katalog erstellen und auf der Karte platzieren
2. **Klick auf Zeichen:** Klick auf das platzierte Zeichen → Detail-Panel öffnet sich als Slide-In von rechts
3. **Vorschau:** SVG-Vorschau des Zeichens wird korrekt angezeigt
4. **Label bearbeiten:** Label-Feld ändern → nach ~500ms Auto-Save (Query-Cache invalidiert, Karten-Label aktualisiert)
5. **Notiz bearbeiten:** Notiz-Feld ändern → Auto-Save funktioniert
6. **Komposition:** Pill-Badges zeigen nur gesetzte Felder (Grundzeichen, Organisation etc.)
7. **Position:** Lat/Lng + MGRS werden korrekt angezeigt
8. **Metadaten:** Ersteller + Zeitstempel sichtbar
9. **Von Karte entfernen:** Danger-Button klicken → Zeichen wird gelöscht, Panel schließt sich
10. **Panel schließen:** ESC oder Backdrop-Klick schließt das Panel
11. **Zeichen-Sidebar-Interaktion:** Panel schließt die Zeichen-Sidebar beim Öffnen (und umgekehrt funktioniert die Sidebar noch)

- [ ] **Step 3: Edge Cases prüfen**

- Zeichen ohne Label (nur Grundzeichen als Titel)
- Zeichen ohne Notiz (Placeholder-Text sichtbar)
- Zeichen ohne MGRS (Position-Sektion zeigt nur Lat/Lng)
- Schnelles Tippen im Label-Feld (Debounce verhindert Spam-Requests)

- [ ] **Step 4: Abschluss-Commit (falls Korrekturen nötig waren)**

```bash
git add -u
git commit -m "🐛(frontend): Zeichen-Detail-Panel Korrekturen aus manuellem Test"
```
