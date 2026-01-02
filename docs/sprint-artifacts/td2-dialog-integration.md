# Story TD2.4: Dialog-Integration für BesetzeRolle & FreigebeRolle

Status: done

## Story

Als **Einsatzleiter**,
möchte ich **Führungsrollen direkt aus der Taktischen Übersicht besetzen und freigeben können**,
damit **ich ohne Wechsel zwischen Ansichten die Einsatzstruktur verwalten kann**.

## Hintergrund

**KRITISCHER BUG aus Epic 6 Retrospektive:**
Die Dialog-Komponenten `BesetzeRolleDialog` und `FreigebeRolleDialog` wurden in Story 6.1c erstellt, aber **NIEMALS in die KraefteDashboard-Page integriert**. Es gibt weder Buttons zum Öffnen noch sind die Dialoge im Render-Tree eingebunden.

**Existierende Komponenten (bereits implementiert):**
- `BesetzeRolleDialog.tsx` - Dialog zur Rollenzuweisung (MVP mit ID-Eingabe)
- `FreigebeRolleDialog.tsx` - Bestätigungs-Dialog für Freigabe
- `useBesetzeRolle()` Hook - TanStack Mutation
- `useFreigebeRolle()` Hook - TanStack Mutation
- `RollenUebersicht.tsx` - Zeigt besetzte Rollen (Read-Only)
- `RollenKarte.tsx` - Einzelne Rolle mit "Freigeben"-Button (Callback nicht verbunden)

**Root Cause:** Code erstellt aber Integration in Page vergessen. Review hat es nicht bemerkt.

## Acceptance Criteria

### AC1: FreigebeRolleDialog Integration

- [x] `KraefteDashboard.page.tsx` hat State für FreigebeRolleDialog (`showFreigebeDialog`, `selectedBesetzung`) ✅
- [x] `RollenUebersicht` erhält `onFreigebeClick` Callback-Prop ✅
- [x] Klick auf "Freigeben"-Button in `RollenKarte` öffnet `FreigebeRolleDialog` ✅
- [x] Dialog zeigt Rollenname + Personenname der freizugebenden Besetzung ✅
- [x] Nach erfolgreicher Freigabe: Dialog schließt, Daten werden invalidiert ✅
- [x] Error-State wird im Dialog angezeigt (nicht Toast) ✅

### AC2: BesetzeRolleDialog Integration

- [x] `KraefteDashboard.page.tsx` hat State für BesetzeRolleDialog (`showBesetzeDialog`) ✅
- [x] Button "Rolle besetzen" in `RollenUebersicht`-Header oder als FAB sichtbar ✅
- [x] Klick auf Button öffnet `BesetzeRolleDialog` ✅
- [x] Nach erfolgreicher Besetzung: Dialog schließt, Daten werden invalidiert ✅
- [x] Error-Handling mit bekannten Fehlercodes (BEREITS_BESETZT, PERSON_NOT_FOUND, etc.) ✅

### AC3: State Management Pattern (Widget-Autonomie)

- [x] Dialog-State LOKAL in `KraefteDashboard.page.tsx` (nicht global) ✅
- [x] Keine Prop-Drilling über mehr als 2 Ebenen ✅
- [x] Handler nutzen `useCallback` für stabile Referenzen ✅
- [x] Loading-State pro Dialog (nicht global) ✅

### AC4: Query Invalidation (Cache-Konsistenz)

- [x] Nach `besetzeRolle` Mutation: Query-Invalidierung für `rollen`, `staerke`, `kraefte` ✅
- [x] Nach `freigebeRolle` Mutation: Query-Invalidierung für `rollen`, `staerke`, `kraefte` ✅
- [x] Keine manuelle Refresh-Button notwendig ✅

### AC5: Code Quality (CLAUDE.md Compliance)

- [x] TypeScript strict mode (keine `any` Types) ✅
- [x] Keine `import type` für Runtime-Klassen (AC1) ✅
- [x] Imports alphabetisch sortiert ✅
- [x] Biome Linting: 0 Errors ✅

## Tasks / Subtasks

- [x] Task 1: FreigebeRolleDialog Integration (AC: 1, 3, 4) ✅
  - [x] State hinzufügen in `KraefteDashboard.page.tsx`:
    - `showFreigebeDialog: boolean`
    - `selectedBesetzung: RollenBesetzungListItemDto | null`
  - [x] Handler erstellen:
    - `handleOpenFreigebeDialog(besetzung: RollenBesetzungListItemDto)`
    - `handleCloseFreigebeDialog()`
  - [x] `onFreigebeClick` Prop an `RollenUebersicht` übergeben
  - [x] `FreigebeRolleDialog` im JSX rendern mit Props
  - [x] Verifizieren: Dialog öffnet, Daten angezeigt, Freigabe funktioniert

- [x] Task 2: BesetzeRolleDialog Integration (AC: 2, 3, 4) ✅
  - [x] State hinzufügen: `showBesetzeDialog: boolean`
  - [x] Handler erstellen:
    - `handleOpenBesetzeDialog()`
    - `handleCloseBesetzeDialog()`
  - [x] "Rolle besetzen" Button in `RollenUebersicht` Header
    - Option A: Button in bestehenden Header von `RollenUebersicht` ✅
  - [x] `BesetzeRolleDialog` im JSX rendern mit Props
  - [x] Verifizieren: Dialog öffnet, Inputs funktionieren, Besetzung funktioniert

- [x] Task 3: RollenUebersicht Erweiterung (AC: 2) ✅
  - [x] Prop `onBesetzeClick?: () => void` hinzufügen
  - [x] Header-Bereich erweitern für Action-Button
  - [x] Button "Rolle besetzen" mit Plus-Icon rendern
  - [x] Mode-aware Styling (fullscreen/compact/standard)

- [x] Task 4: Verifizierung (AC: 5) ✅
  - [x] `pnpm --filter @bluelight-hub/frontend lint:check` → 0 Errors
  - [x] `pnpm --filter @bluelight-hub/frontend build` → Success
  - [x] Manuelle Tests: Dialoge öffnen/schließen/Aktionen (via Browser/chrome-devtools)
  - [x] TypeScript: Keine `any` Types

## Dev Notes

### Integration Pattern (Best Practice aus SingleEinsatzDashboard)

```typescript
// In KraefteDashboard.page.tsx

// 1. Imports
import { BesetzeRolleDialog, FreigebeRolleDialog } from '../../ui/organisms';
import type { RollenBesetzungListItemDto } from '@bluelight-hub/shared/client';

// 2. State Management
const [showBesetzeDialog, setShowBesetzeDialog] = useState(false);
const [showFreigebeDialog, setShowFreigebeDialog] = useState(false);
const [selectedBesetzung, setSelectedBesetzung] = useState<RollenBesetzungListItemDto | null>(null);

// 3. Handler (mit useCallback für Performance)
const handleOpenBesetzeDialog = useCallback(() => setShowBesetzeDialog(true), []);
const handleCloseBesetzeDialog = useCallback(() => setShowBesetzeDialog(false), []);

const handleOpenFreigebeDialog = useCallback((besetzung: RollenBesetzungListItemDto) => {
  setSelectedBesetzung(besetzung);
  setShowFreigebeDialog(true);
}, []);

const handleCloseFreigebeDialog = useCallback(() => {
  setSelectedBesetzung(null);
  setShowFreigebeDialog(false);
}, []);

// 4. RollenUebersicht mit Callbacks
<RollenUebersicht
  einsatzId={einsatzId}
  onFreigebeClick={handleOpenFreigebeDialog}
  onBesetzeClick={handleOpenBesetzeDialog}
/>

// 5. Dialoge rendern (am Ende des JSX)
<BesetzeRolleDialog
  isOpen={showBesetzeDialog}
  onClose={handleCloseBesetzeDialog}
  einsatzId={einsatzId}
/>
<FreigebeRolleDialog
  isOpen={showFreigebeDialog}
  onClose={handleCloseFreigebeDialog}
  einsatzId={einsatzId}
  besetzung={selectedBesetzung}
/>
```

### RollenUebersicht Props Erweiterung

```typescript
// In RollenUebersicht.tsx

interface RollenUebersichtProps {
  einsatzId: string;
  onFreigebeClick?: (besetzung: RollenBesetzungListItemDto) => void;  // NEU: Objekt statt ID
  onBesetzeClick?: () => void;  // NEU
  className?: string;
}

// Header mit Action-Button
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold">Führungsrollen</h3>
  {onBesetzeClick && (
    <Button
      size="sm"
      variant="secondary"
      onClick={onBesetzeClick}
    >
      <PiPlus className="w-4 h-4 mr-1" />
      Rolle besetzen
    </Button>
  )}
</div>
```

### RollenKarte Callback Anpassung

```typescript
// In RollenKarte.tsx
// Aktuell: onFreigeben?: () => void
// Besser: onFreigeben wird von RollenUebersicht mit besetzung gefüllt

// In RollenUebersicht.tsx beim Mapping:
{besetzungen.map((besetzung) => (
  <RollenKarte
    key={besetzung.id}
    besetzung={besetzung}
    onFreigeben={onFreigebeClick ? () => onFreigebeClick(besetzung) : undefined}
  />
))}
```

### Existierende Dateien (NICHT neu erstellen!)

| Datei | Pfad | Aktion |
|-------|------|--------|
| BesetzeRolleDialog | `features/kraefte/ui/organisms/BesetzeRolleDialog.tsx` | Existiert ✅ |
| FreigebeRolleDialog | `features/kraefte/ui/organisms/FreigebeRolleDialog.tsx` | Existiert ✅ |
| RollenUebersicht | `features/kraefte/ui/organisms/RollenUebersicht.tsx` | Erweitern (Props) |
| RollenKarte | `features/kraefte/ui/molecules/RollenKarte.tsx` | Keine Änderung nötig |
| KraefteDashboard | `features/kraefte/ui/pages/KraefteDashboard.page.tsx` | Integration hinzufügen |

### API-Endpoints (Referenz)

| Aktion | Endpoint | Hook |
|--------|----------|------|
| Rolle besetzen | `POST /einsaetze/{id}/rollen-besetzung` | `useBesetzeRolle(einsatzId)` |
| Rolle freigeben | `DELETE /einsaetze/{id}/rollen-besetzung/{besetzungId}` | `useFreigebeRolle(einsatzId)` |
| Rollen abrufen | `GET /einsaetze/{id}/rollen-besetzung` | `useRollenBesetzungen(einsatzId)` |

### Query Invalidation (bereits in Hooks implementiert)

```typescript
// In use-besetze-rolle.ts und use-freigebe-rolle.ts
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId),
  });
}
```

### Project Structure Notes

- Alignment mit Feature-basierter Struktur: `features/kraefte/ui/`
- Atomic Design: Dialoge sind `organisms`, Button ist `atom`
- TanStack Ecosystem: Query + Form + Store

### References

- [Source: features/kraefte/ui/organisms/BesetzeRolleDialog.tsx] - Existierender Dialog
- [Source: features/kraefte/ui/organisms/FreigebeRolleDialog.tsx] - Existierender Dialog
- [Source: features/kraefte/ui/organisms/RollenUebersicht.tsx] - Zu erweitern
- [Source: features/kraefte/ui/pages/KraefteDashboard.page.tsx] - Integration Target
- [Source: features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism.tsx] - Pattern-Vorlage
- [Source: docs/sprint-artifacts/td2-query-handler-tests.md] - Vorherige Story Learnings
- [Source: CLAUDE.md#Frontend Rules] - TanStack + Tailwind Patterns

## Dev Agent Record

### Context Reference

Automatisch generiert durch Create-Story Workflow.

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**2026-01-01 - Implementierung abgeschlossen (Dev Agent Amelia)**

- ✅ Task 1: FreigebeRolleDialog Integration
  - State (`showFreigebeDialog`, `selectedBesetzung`) in KraefteDashboard
  - Handler mit `useCallback` für stabile Referenzen
  - `onFreigebeClick` Prop an RollenUebersicht übergeben (Objekt statt ID)
  - FreigebeRolleDialog im JSX gerendert
- ✅ Task 2: BesetzeRolleDialog Integration
  - State (`showBesetzeDialog`) in KraefteDashboard
  - Handler für Open/Close mit `useCallback`
  - BesetzeRolleDialog im JSX gerendert
- ✅ Task 3: RollenUebersicht Erweiterung
  - `onBesetzeClick?: () => void` Prop hinzugefügt
  - "Rolle besetzen" Button mit PiPlus-Icon im Header
  - Mode-aware Styling (standard: sm, fullscreen: base)
- ✅ Task 4: Verifizierung
  - TypeScript: No errors
  - Biome Lint: 0 errors (nur pre-existing warnings)
  - Build: Success

**Pattern-Entscheidungen:**
- `onFreigebeClick` Signature geändert von `(id: string)` zu `(besetzung: RollenBesetzungListItemDto)` für bessere Dialog-Integration
- Button "Rolle besetzen" in Header rechts vor Refresh-Button positioniert
- Alle Handler nutzen `useCallback` (AC3 Widget-Autonomie)

### File List

**Modifiziert:**
- `packages/frontend/src/features/kraefte/ui/pages/KraefteDashboard.page.tsx` ✅
  - Dialog State hinzugefügt (showBesetzeDialog, showFreigebeDialog, selectedBesetzung)
  - Handler mit useCallback erstellt
  - Dialoge im JSX gerendert
  - RollenUebersicht Props erweitert
- `packages/frontend/src/features/kraefte/ui/organisms/RollenUebersicht.tsx` ✅
  - `onFreigebeClick` Signature: `(besetzung: RollenBesetzungListItemDto) => void`
  - `onBesetzeClick?: () => void` Prop hinzugefügt
  - "Rolle besetzen" Button mit Mode-aware Styling
  - PiPlus Icon importiert

**Unverändert (bereits implementiert):**
- `packages/frontend/src/features/kraefte/api/use-besetze-rolle.ts` ✅
- `packages/frontend/src/features/kraefte/api/use-freigebe-rolle.ts` ✅

**Code Review Fixes (2026-01-01):**
- `packages/frontend/src/features/kraefte/ui/organisms/BesetzeRolleDialog.tsx` ✅
  - Refactored von HTML Form + useState zu @tanstack/react-form + Zod
  - Zod-Schema für Validierung hinzugefügt
  - Field-Level Error-Anzeige implementiert
  - Import-Sortierung korrigiert
- `packages/frontend/src/features/kraefte/ui/organisms/FreigebeRolleDialog.tsx` ✅
  - Import-Sortierung korrigiert
- `packages/frontend/src/features/kraefte/ui/organisms/RollenUebersicht.tsx` ✅
  - Import-Sortierung korrigiert
