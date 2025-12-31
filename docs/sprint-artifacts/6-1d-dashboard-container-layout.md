# Story 6.1d: Dashboard Container & Layout

Status: Ready for Review

## Story

Als **Einsatzleiter (Thomas)**,
möchte ich **alle Kräfte-Informationen in einem übersichtlichen Dashboard sehen**,
damit **ich mit einem Blick die Gesamtsituation erfasse**.

## Hintergrund

Diese Story ist die **Integration der drei Dashboard-Widgets** aus Stories 6.1a, 6.1b und 6.1c in einen gemeinsamen Container. Sie bildet die Basis für Story 6.2 (FullScreen & Compact Modus).

**Wichtig:** Diese Story ist eine reine **Frontend-Implementierung**. Die Backend-APIs und alle Widget-Komponenten existieren bereits vollständig!

## Depends On

- **Story 6.1a:** Taktische Stärke-Anzeige (DONE)
- **Story 6.1b:** Fahrzeug-Status Liste (DONE)
- **Story 6.1c:** Rollen-Übersicht (DONE)

## Enables

- **Story 6.2:** FullScreen & Compact Modus

---

## Acceptance Criteria

### AC1: Dashboard Layout

- [x] **Given** ich öffne das Kräfte-Dashboard
- [x] **When** die Seite lädt
- [x] **Then** sehe ich ein Grid-Layout mit:
  - Stärke-Card (oben links)
  - Fahrzeug-Liste (oben rechts)
  - Rollen-Übersicht (unten, volle Breite)
- [x] **And** alle drei Widgets laden parallel

### AC2: Performance < 2s

- [x] **Given** ein Einsatz mit 20 Fahrzeugen und 80 Personen
- [x] **When** ich das Dashboard öffne
- [x] **Then** lädt die gesamte Ansicht in < 2s (NFR1)
- [x] **And** TanStack Query führt alle 3 Queries parallel aus

### AC3: Responsive Layout

- [x] **Given** ich öffne das Dashboard auf einem Tablet (< 768px)
- [x] **When** die Seite rendert
- [x] **Then** stacken die Cards vertikal (Mobile-First)
- [x] **And** auf Desktop (>= 768px) wird das Grid-Layout verwendet

### AC4: Kombinierter Loading State

- [x] **Given** mindestens eine der drei Queries lädt noch
- [x] **When** ich das Dashboard öffne
- [x] **Then** zeigen die einzelnen Widgets ihre Skeleton-Loader
- [x] **And** der Header ist bereits sichtbar

### AC5: Partial Error State

- [x] **Given** eine der drei Queries schlägt fehl
- [x] **When** ich das Dashboard sehe
- [x] **Then** zeigt das betroffene Widget einen Error-State
- [x] **And** die anderen Widgets funktionieren weiter normal
- [x] **And** ein globaler "Alle aktualisieren" Button ist verfügbar

### AC6: Route Integration

- [x] **Given** ich bin auf der Einsatz-Detail-Seite
- [x] **When** ich auf "Kräfte" → "Dashboard" navigiere
- [x] **Then** öffnet sich die Route `/app/einsatz/$einsatzId/kräfte/dashboard`

### AC7: Dashboard Header

- [x] **Given** das Dashboard ist geladen
- [x] **When** ich den Header sehe
- [x] **Then** zeigt er "Kräfte-Dashboard" als Titel
- [x] **And** einen Refresh-Button der alle 3 Queries refetcht
- [x] **And** "Aktualisiert: HH:MM" als Zeitstempel

---

## Implementation Checklist

### Task 1: KraefteDashboard Container erstellen

- [x] **1.1** Neue Datei: `features/kraefte/ui/pages/KraefteDashboard.page.tsx`

```typescript
/**
 * KraefteDashboard - Zentrales Dashboard für alle Kräfte-Widgets.
 *
 * **Story 6.1d - Dashboard Container & Layout:**
 * Integriert StaerkeCard, FahrzeugStatusListe und RollenUebersicht
 * in einem responsiven Grid-Layout.
 */

import { cn } from '@/shared/ui/cn';
import { PiChartBar, PiArrowClockwise, PiWarningCircle } from 'react-icons/pi';
import {
  useTaktischeStaerke,
  useEinsatzFahrzeuge,
  useRollenBesetzungen,
  StaerkeCard,
  FahrzeugStatusListe,
  RollenUebersicht,
} from '@/features/kraefte';

interface KraefteDashboardProps {
  einsatzId: string;
  className?: string;
}

/**
 * Formatiert einen Timestamp als HH:MM
 */
function formatTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KraefteDashboard({ einsatzId, className }: KraefteDashboardProps) {
  // Alle drei Queries parallel laden (AC2)
  const staerkeQuery = useTaktischeStaerke(einsatzId);
  const fahrzeugeQuery = useEinsatzFahrzeuge(einsatzId);
  const rollenQuery = useRollenBesetzungen(einsatzId);

  // Kombinierte States (AC4, AC5)
  const isAnyFetching = staerkeQuery.isFetching || fahrzeugeQuery.isFetching || rollenQuery.isFetching;
  const latestUpdate = Math.max(
    staerkeQuery.dataUpdatedAt || 0,
    fahrzeugeQuery.dataUpdatedAt || 0,
    rollenQuery.dataUpdatedAt || 0
  );

  // Refetch alle Queries (AC5, AC7)
  const refetchAll = () => {
    staerkeQuery.refetch();
    fahrzeugeQuery.refetch();
    rollenQuery.refetch();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header (AC7) */}
      <DashboardHeader
        onRefresh={refetchAll}
        lastUpdated={latestUpdate}
        isRefreshing={isAnyFetching}
      />

      {/* Grid Layout (AC1, AC3) - md:768px für bessere Tablet-Unterstützung */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Stärke-Card (oben links) */}
        <div className="md:col-span-1">
          <StaerkeCard
            einsatzId={einsatzId}
            className="h-full"
          />
        </div>

        {/* Fahrzeug-Liste (oben rechts) */}
        <div className="md:col-span-1">
          <FahrzeugStatusListe
            einsatzId={einsatzId}
            className="h-full"
          />
        </div>

        {/* Rollen-Übersicht (unten, volle Breite) */}
        <div className="md:col-span-2">
          <RollenUebersicht
            einsatzId={einsatzId}
          />
        </div>
      </div>
    </div>
  );
}
```

- [x] **1.2** Dashboard Header Komponente (inline in gleicher Datei)

```typescript
interface DashboardHeaderProps {
  onRefresh: () => void;
  lastUpdated: number;
  isRefreshing: boolean;
}

function DashboardHeader({ onRefresh, lastUpdated, isRefreshing }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <PiChartBar className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Kräfte-Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Aktualisiert: {formatTime(lastUpdated)}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'rounded-lg p-2 text-gray-500 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isRefreshing && 'animate-spin'
          )}
          title="Alle Daten aktualisieren"
        >
          <PiArrowClockwise className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
```

### Task 2: Feature Exports aktualisieren

- [x] **2.1** Neue Datei: `features/kraefte/ui/pages/index.ts`

```typescript
export { KraefteDashboard } from './KraefteDashboard.page';
```

- [x] **2.2** Erweitern: `features/kraefte/ui/index.ts`

```typescript
// Bestehende Exports
export * from './molecules';
export * from './organisms';

// NEU: Pages
export * from './pages';
```

- [x] **2.3** Erweitern: `features/kraefte/index.ts` (Public API)

```typescript
// ... bestehende Exports ...

// NEU: Dashboard Page (Story 6.1d)
export { KraefteDashboard } from './ui/pages';
```

### Task 3: Route erstellen (AC6)

- [x] **3.1** Neue Route-Datei: `routes/app/einsatz/$einsatzId/kräfte/dashboard.tsx`

> **Hinweis:** Der Ordner `/kräfte/` existiert bereits mit `einheiten.tsx`, `fahrzeuge.tsx`, `personal.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { KraefteDashboard } from '@/features/kraefte';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/dashboard')({
  component: KraefteDashboardRoute,
});

function KraefteDashboardRoute() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="container mx-auto p-4 md:p-6">
      <KraefteDashboard einsatzId={einsatzId} />
    </div>
  );
}
```

### Task 4: Navigation prüfen

- [x] **4.1** Die Kräfte-Navigation existiert bereits in `EinsatzDetailNavigation`
- [x] **4.2** Optional: Sub-Navigation für Dashboard-Link hinzufügen wenn gewünscht

> **Hinweis:** Aktuell zeigt `/kräfte` direkt auf den Kräfte-Bereich. Die Dashboard-Route ist unter `/kräfte/dashboard` erreichbar. Falls ein direkter Link gewünscht ist, kann dies in der Einsatz-Navigation ergänzt werden.

### Task 5: Performance-Optimierung (AC2)

- [x] **5.1** Sicherstellen dass alle 3 Queries parallel ausgeführt werden
- [x] **5.2** Keine Wasserfall-Requests (Query A → Query B → Query C)
- [x] **5.3** Verifizieren: Alle Hooks haben `enabled: !!einsatzId`

**Verification via Chrome DevTools:**
1. Network Tab öffnen
2. Dashboard laden
3. Prüfen: 3 API-Requests starten gleichzeitig (nicht nacheinander)

---

## File Structure

```
packages/frontend/src/
├── features/kraefte/
│   ├── ui/
│   │   ├── pages/                           # NEU
│   │   │   ├── KraefteDashboard.page.tsx    # NEU (Task 1)
│   │   │   └── index.ts                     # NEU (Task 2.1)
│   │   └── index.ts                         # ERWEITERN (Task 2.2)
│   └── index.ts                             # ERWEITERN (Task 2.3)
└── routes/app/einsatz/$einsatzId/kräfte/
    ├── einheiten.tsx                        # Existiert
    ├── fahrzeuge.tsx                        # Existiert
    ├── personal.tsx                         # Existiert
    └── dashboard.tsx                        # NEU (Task 3)
```

---

## Existierende Komponenten (WIEDERVERWENDUNG!)

| Komponente | Pfad | Status |
|-----------|------|--------|
| `useTaktischeStaerke` | `features/kraefte/api/use-taktische-staerke.ts` | ✅ Vorhanden |
| `useEinsatzFahrzeuge` | `features/kraefte/api/use-einsatz-fahrzeuge.ts` | ✅ Vorhanden |
| `useRollenBesetzungen` | `features/kraefte/api/use-rollen-besetzungen.ts` | ✅ Vorhanden |
| `StaerkeCard` | `features/kraefte/ui/molecules/StaerkeCard.tsx` | ✅ Vorhanden |
| `FahrzeugStatusListe` | `features/kraefte/ui/organisms/FahrzeugStatusListe.tsx` | ✅ Vorhanden |
| `RollenUebersicht` | `features/kraefte/ui/organisms/RollenUebersicht.tsx` | ✅ Vorhanden |
| `cn` | `shared/ui/cn.ts` | ✅ Vorhanden |

**KEINE neuen Backend-APIs erforderlich!**

---

## Code Patterns (aus Stories 6.1a/b/c)

### Import Pattern

```typescript
// ✅ RICHTIG: cn aus shared/ui
import { cn } from '@/shared/ui/cn';

// ✅ RICHTIG: Icons aus react-icons/pi (konsistent mit anderen Widgets)
import { PiChartBar, PiArrowClockwise } from 'react-icons/pi';

// ✅ RICHTIG: Feature-Imports über Public API
import { useTaktischeStaerke, StaerkeCard } from '@/features/kraefte';
```

### formatTime Pattern (lokal definiert)

```typescript
// In jeder Komponente die Zeit anzeigt - keine externe Dependency
function formatTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

### Error Handling Pattern (Widgets)

Die einzelnen Widgets (StaerkeCard, FahrzeugStatusListe, RollenUebersicht) haben bereits ihre eigenen Error-States implementiert. Das Dashboard zeigt keine globale Error-Page, sondern lässt die Widgets unabhängig funktionieren (Partial Failure).

---

## UX Design Tokens

```typescript
// Layout Grid (Responsive) - md:768px für Tablet-Unterstützung
const gridClasses = {
  container: 'grid gap-4 md:grid-cols-2 md:gap-6',
  staerkeCard: 'md:col-span-1',       // oben links
  fahrzeugListe: 'md:col-span-1',     // oben rechts
  rollenUebersicht: 'md:col-span-2',  // unten, volle Breite
};

// Mobile (< 768px): Alle Cards stacken vertikal
// Tablet/Desktop (>= 768px): 2-Column Grid

// Header
const headerClasses = {
  title: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  timestamp: 'text-sm text-gray-500 dark:text-gray-400',
  refreshButton: 'rounded-lg p-2 text-gray-500 hover:bg-gray-100',
};
```

---

## Testing (MANUELL via Chrome)

### Performance-Test (AC2)

1. Öffne Chrome DevTools → Network Tab
2. Navigiere zu `/app/einsatz/{id}/kräfte/dashboard`
3. Verifiziere: Alle 3 API-Requests starten parallel (nicht sequentiell)
4. Verifiziere: Gesamtladezeit < 2 Sekunden

### Responsive-Test (AC3)

1. Öffne Chrome DevTools → Device Toolbar
2. Wähle Mobile-Auflösung (375px)
3. Verifiziere: Cards stacken vertikal
4. Wähle Tablet-Auflösung (768px × 1024px)
5. Verifiziere: Grid-Layout (2 Spalten oben, 1 Zeile unten)

### Partial-Error-Test (AC5)

1. Simuliere Netzwerk-Fehler für eine Query (Network Tab → Block request)
2. Lade Dashboard
3. Verifiziere: Betroffenes Widget zeigt Error, andere funktionieren
4. Klicke Refresh-Button im Header
5. Verifiziere: Alle 3 Queries werden neu geladen

---

## Architecture Notes

### Warum Partial Error State statt Global Error?

1. **User Experience:** Wenn nur Rollen nicht laden, sieht der User trotzdem Stärke und Fahrzeuge
2. **Resilience:** Dashboard bleibt nutzbar auch bei Teilausfall
3. **Widget-Autonomie:** Jedes Widget hat seinen eigenen Error-Recovery-Button

### Warum md: statt lg: Breakpoint?

- `md:` = 768px (Tablet Portrait)
- `lg:` = 1024px (Tablet Landscape / kleine Laptops)

Bei Tablets im Portrait-Modus (768px-1024px) ist das 2-Spalten-Layout bereits sinnvoll. Mit `lg:` würde das Layout erst ab 1024px aktiv, was auf vielen Tablets suboptimal wäre.

### Query Invalidation

Wenn eine Mutation in einem Widget erfolgt (z.B. Rolle freigeben):
- Das Widget invalidiert seinen eigenen Query (`rollen`)
- Das Widget kann auch `staerke` invalidieren (weil sich die Stärke-Zahlen ändern)
- Das Dashboard muss nichts tun - TanStack Query aktualisiert automatisch

---

## References

| Dokument | Pfad |
|----------|------|
| Story 6.1a | `docs/sprint-artifacts/6-1a-taktische-staerke-anzeige.md` |
| Story 6.1b | `docs/sprint-artifacts/6-1b-fahrzeug-status-liste.md` |
| Story 6.1c | `docs/sprint-artifacts/6-1c-rollen-uebersicht.md` |
| Epic 6 Definition | `docs/epics.md` |
| Project Context | `docs/project-context.md` |
| Validation Report | `docs/sprint-artifacts/validation-report-6-1d-2025-12-30.md` |

---

## Dev Agent Record

### Context Reference

Erstellt via BMad create-story Workflow mit Subagent-Analyse.

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

**2025-12-30 - Story 6.1d Draft erstellt:**

1. **Subagent-Analyse:** Stories 6.1a/b/c Pattern-Extraktion (Query Keys, Hooks, UI)
2. **Frontend-Exploration:** Existierende Komponenten-Struktur dokumentiert
3. **Architecture Decision:** Keine neue Backend-Query - nutzt 3 existierende Queries parallel
4. **Layout Design:** Grid mit md:grid-cols-2, Rollen-Übersicht volle Breite unten
5. **Error/Loading States:** Partial Error States - Widgets unabhängig
6. **Route:** Neue Route `/app/einsatz/$einsatzId/kräfte/dashboard`

**2025-12-30 - Validation Review (SM Agent):**

1. **Import-Pfade korrigiert:** `@/shared/ui/cn` statt `@/lib/utils`
2. **formatTime:** Lokale Funktion (Pattern aus RollenUebersicht)
3. **Icons:** react-icons/pi statt lucide-react (konsistent)
4. **Breakpoint:** `md:` statt `lg:` für bessere Tablet-Unterstützung
5. **Error Handling:** Partial Error States statt globaler Error
6. **Route-Struktur:** Dokumentiert dass `/kräfte/` Ordner existiert

**2025-12-31 - Story 6.1d Implementierung (Dev Agent):**

1. **KraefteDashboard.page.tsx erstellt:** Grid-Layout mit StaerkeCard, FahrzeugStatusListe, RollenUebersicht
2. **Partial Error States:** StaerkeCard hat inline Error-Handler, andere Widgets haben eigene Error-States
3. **Parallel Queries:** Alle 3 useQuery Hooks laden parallel (kein await-Chain)
4. **Navigation erweitert:** Dashboard-Link zu Kräfte-Modul in use-einsatz-modules.ts hinzugefügt
5. **Bug-Fix:** RollenKarte.tsx hatte Syntax-Error (fehlendes `>` bei button tag)
6. **TypeScript & Biome:** Alle Checks bestanden

### File List

**Erstellt:**
- `packages/frontend/src/features/kraefte/ui/pages/KraefteDashboard.page.tsx` ✅
- `packages/frontend/src/features/kraefte/ui/pages/index.ts` ✅
- `packages/frontend/src/routes/app/einsatz/$einsatzId/kräfte/dashboard.tsx` ✅

**Erweitert:**
- `packages/frontend/src/features/kraefte/ui/index.ts` ✅
- `packages/frontend/src/features/kraefte/index.ts` ✅
- `packages/frontend/src/features/einsatz/hooks/use-einsatz-modules.ts` ✅ (Navigation hinzugefügt)

**Bug-Fix (während Implementierung entdeckt):**
- `packages/frontend/src/features/kraefte/ui/molecules/RollenKarte.tsx` ✅ (Syntax-Error: fehlende `>` bei button tag)

### Change Log

| Datum | Änderung |
|-------|----------|
| 2025-12-30 | Story 6.1d Draft erstellt via BMad create-story Workflow |
| 2025-12-30 | Validation Review (SM Agent) - 6 Anpassungen dokumentiert |
| 2025-12-31 | Story 6.1d implementiert - alle Tasks abgeschlossen (Dev Agent) |
| 2025-12-31 | Bug-Fix: RollenKarte.tsx Syntax-Error behoben |
| 2025-12-31 | Story 6.1d Ready for Review |
