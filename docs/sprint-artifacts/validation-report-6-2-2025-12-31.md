# Validation Report: Story 6.2 FullScreen & Compact Modus

**Document:** `docs/sprint-artifacts/6-2-fullscreen-compact-modus.md`
**Checklist:** `.bmad/bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-31
**Validator:** SM Agent (Bob) mit 4 parallelen Subagents

---

## Summary

- **Overall:** 14/21 passed (67%)
- **Critical Issues:** 5
- **Enhancement Opportunities:** 4
- **LLM Optimization Issues:** 3

---

## Section Results

### Section 1: Props & Interface Compatibility
**Pass Rate: 1/4 (25%)**

#### ✗ FAIL: StaerkeCard Props Inkompatibilität

**Story 6.2 Code (Task 4, Zeile 411-415):**
```typescript
interface StaerkeCardProps {
  einsatzId: string;  // ← FALSCH!
  className?: string;
  mode?: DashboardMode;
}
```

**Tatsächliche Implementation (`StaerkeCard.tsx`, Zeile 18-31):**
```typescript
interface StaerkeCardProps {
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  gesamt: number;
  isLoading?: boolean;
  className?: string;
}
```

**Impact:** 🔴 **BREAKING CHANGE** - StaerkeCard akzeptiert Data-Props, NICHT einsatzId. Story 6.2 würde TypeScript-Fehler verursachen und die aktuelle Dashboard-Integration brechen.

**Recommendation:** StaerkeCard Props-Struktur beibehalten (Data-Props). Mode-Support über zusätzliche Props oder Context API.

---

#### ✗ FAIL: Doppelte Query-Instanzen (Task 2 vs. bestehende Komponenten)

**Story 6.2 Code (Task 2, Zeile 148-157):**
```typescript
// In KraefteDashboard
const staerkeQuery = useTaktischeStaerke(einsatzId, { refetchInterval: ... });
const fahrzeugeQuery = useEinsatzFahrzeuge(einsatzId, { refetchInterval: ... });
const rollenQuery = useRollenBesetzungen(einsatzId, { refetchInterval: ... });
```

**Tatsächliche Implementation:**
- `FahrzeugStatusListe.tsx:68`: Hat EIGENEN `useEinsatzFahrzeuge(einsatzId)` Hook
- `RollenUebersicht.tsx:40`: Hat EIGENEN `useRollenBesetzungen(einsatzId)` Hook

**Impact:** 🔴 **DOPPELTE API-CALLS** - TanStack Query Cache würde zwar deduplizieren, aber `refetchInterval` Logik würde kollidieren und potentiell doppelte Refreshes auslösen.

**Recommendation:**
- Option A: Query-Hooks aus Kind-Komponenten entfernen, Props-Passing
- Option B: `refetchInterval` in bestehenden Hooks konfigurierbar machen

---

#### ⚠ PARTIAL: RollenUebersicht Grid-Kollision

**Story 6.2 Code (Task 6, Zeile 698-702):**
```typescript
const gridClasses = {
  standard: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
  fullscreen: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  compact: '', // nicht verwendet
};
```

**Tatsächliche Implementation (`RollenUebersicht.tsx:95`):**
```typescript
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
```

**Impact:** 🟡 **GRID-ÜBERSCHREIBUNG NÖTIG** - Die bestehende Grid-Klasse ist hardcoded. Mode-basierte Klassen müssten das bestehende Grid vollständig ersetzen, nicht ergänzen.

**Evidence:** Grid ist direkt in JSX, nicht via Variable.

---

#### ✓ PASS: Route Search-Parameter Pattern

**Story 6.2 Code (Task 1, Zeile 78-94):** Korrekt nach etabliertem ETB/Lagekarte Pattern.

**Evidence:**
- Nutzt `validateSearch` mit Whitelist (`Zeile 83-92`)
- Fallback auf `'standard'` (`Zeile 90`)
- `Route.useSearch()` Pattern (`Zeile 98`)

---

### Section 2: Existing Pattern Reuse
**Pass Rate: 4/5 (80%)**

#### ✓ PASS: FullscreenCloseButton Wiederverwendung

**Story 6.2 referenziert:** `features/lagekarte/ui/organisms/FullscreenCloseButton`
**Evidence:** Komponente existiert und ist wiederverwendbar.

---

#### ✓ PASS: ESC-Handler Pattern (AC4)

**Story 6.2 Code (Task 8, Zeile 800-811):** Implementiert korrektes Keyboard-Event Pattern.

**Evidence:** Identisch mit `FullscreenCloseButton.tsx:19-29`.

---

#### ✓ PASS: URL-basierte Modi statt localStorage

**Story 6.2 Technical Notes (Zeile 888-899):** Begründet URL-Parameter vs. localStorage korrekt.

---

#### ⚠ PARTIAL: AC5 localStorage Requirement nicht erfüllt

**AC5 fordert (Zeile 58):**
> "die Präferenz wird im localStorage gespeichert"

**Story 6.2 Implementation:** KEINE localStorage-Logik vorhanden.

**Impact:** 🟡 **AC NICHT ERFÜLLT** - User-Präferenz geht bei Seitenwechsel verloren.

**Recommendation:** Kombination implementieren:
```typescript
// URL für aktuellen State, localStorage für Default
const savedMode = localStorage.getItem('kraefte-dashboard-mode');
const defaultMode = savedMode ?? 'standard';
```

---

#### ✓ PASS: refetchInterval Pattern (AC3)

**Story 6.2 Code (Task 2, Zeile 149-157):** Korrekt `refetchInterval: mode === 'fullscreen' ? 30000 : false`

---

### Section 3: Component Architecture
**Pass Rate: 2/4 (50%)**

#### ✗ FAIL: Prop-Drilling vs. Context API

**Story 6.2 Pattern:** Props-basiert (`mode` als Prop an jede Komponente)

**Problem:**
- `StaerkeCard`, `FahrzeugStatusListe`, `RollenUebersicht` + Child-Komponenten (`RollenKarte`, `FahrzeugCard`) müssten ALLE `mode` Prop erhalten
- Prop-Drilling durch 3+ Ebenen

**Evidence:**
- `StaerkeCard` → `StaerkeNumber` (neue Sub-Komponente)
- `FahrzeugStatusListe` → `FahrzeugCard` / `FahrzeugBadge`
- `RollenUebersicht` → `RollenKarte`

**Recommendation:** `DashboardModeContext` implementieren:
```typescript
const DashboardModeContext = createContext<DashboardMode>('standard');
export const useDashboardMode = () => useContext(DashboardModeContext);
```

---

#### ⚠ PARTIAL: Skeleton Loading States

**Story 6.2:** Erwähnt `StaerkeCardSkeleton mode` aber zeigt keine Implementation.

**Problem:** Skeleton-Größen müssen sich AUCH an Mode anpassen.

**Evidence:** `StaerkeCardSkeleton` in `StaerkeCard.tsx:36-53` hat feste Größen (`h-8 w-10`).

---

#### ✓ PASS: Partial Error States (AC5)

**Story 6.2 Code (Task 2, Zeile 218-268):** Korrekte Widget-spezifische Error-Handler mit `DashboardErrorCard`.

---

#### ✓ PASS: DashboardErrorCard Extraktion

**Story 6.2 Code (Task 7, Zeile 736-789):** Sinnvolle Komponenten-Extraktion für Wiederverwendung.

---

### Section 4: UX & Accessibility
**Pass Rate: 4/4 (100%)**

#### ✓ PASS: Schriftgrößen für Fullscreen (AC1)

**Story 6.2 Code (Task 4, Zeile 421-425):**
```typescript
const numberClasses = {
  fullscreen: 'text-4xl font-bold lg:text-5xl', // 36-48px ✓
};
```
**Requirement (NFR19):** Min. 32px für Stärke-Zahlen → Erfüllt.

---

#### ✓ PASS: Touch-Targets für Compact (AC2)

**Story 6.2 Design Tokens (Zeile 945):**
```typescript
button: 'min-h-[44px] min-w-[44px] p-3'
```
**Requirement (NFR20):** Min. 44x44px → Erfüllt.

---

#### ✓ PASS: ESC-Tastatur Support (AC4)

**Story 6.2 Code (Task 8):** Implementiert + `FullscreenCloseButton` hat eigenen Handler.

---

#### ✓ PASS: Mode-Selector Toggle (AC5)

**Story 6.2 Code (Task 3.2, Zeile 353-403):** `ModeSelector` mit 3 Buttons implementiert.

---

### Section 5: File Structure & Imports
**Pass Rate: 3/4 (75%)**

#### ✓ PASS: Feature-Struktur konsistent

**Story 6.2 File Structure (Zeile 849-867):** Folgt etabliertem Pattern.

---

#### ⚠ PARTIAL: Neue Sub-Komponenten nicht exportiert

**Story 6.2 schlägt vor:**
- `StaerkeNumber` (inline in StaerkeCard)
- `FahrzeugBadge` (inline in FahrzeugStatusListe)
- `ModeSelector` (inline in KraefteDashboard)

**Problem:** Diese Komponenten werden nur inline definiert, könnten aber auch in anderen Contexts nützlich sein.

---

#### ✓ PASS: DashboardErrorCard Export

**Story 6.2 Code (Task 9.1):** Korrekt in `molecules/index.ts` exportiert.

---

#### ✓ PASS: Type Export für DashboardMode

**Story 6.2 Code (Task 9.2):** Korrekt in `features/kraefte/index.ts` exportiert.

---

## Failed Items Summary

| # | Item | Severity | Recommendation |
|---|------|----------|----------------|
| 1 | StaerkeCard Props Inkompatibilität | 🔴 CRITICAL | Props-Struktur beibehalten, Mode via className oder Context |
| 2 | Doppelte Query-Instanzen | 🔴 CRITICAL | refetchInterval in Child-Hooks konfigurierbar machen |
| 3 | AC5 localStorage nicht implementiert | 🟡 MAJOR | localStorage für Default-Präferenz hinzufügen |
| 4 | Prop-Drilling Problem | 🟡 MAJOR | DashboardModeContext implementieren |
| 5 | RollenUebersicht Grid hardcoded | 🟡 MINOR | Grid-Klassen dynamisch machen |

---

## Partial Items Summary

| # | Item | Gap | Recommendation |
|---|------|-----|----------------|
| 1 | Skeleton Loading States | Keine Mode-Varianten | Mode-aware Skeletons implementieren |
| 2 | Sub-Komponenten Export | Nur inline definiert | Optional als separate Komponenten exportieren |

---

## Recommendations

### 1. Must Fix (Critical)

#### 1.1 StaerkeCard Props korrigieren

**Statt Story 6.2 Code:**
```typescript
<StaerkeCard einsatzId={einsatzId} mode={mode} />
```

**Korrekte Implementation:**
```typescript
<StaerkeCard
  fuehrung={staerkeQuery.data?.fuehrung ?? 0}
  unterfuehrung={staerkeQuery.data?.unterfuehrung ?? 0}
  mannschaft={staerkeQuery.data?.mannschaft ?? 0}
  gesamt={staerkeQuery.data?.gesamt ?? 0}
  isLoading={staerkeQuery.isLoading}
  mode={mode}
  className="h-full"
/>
```

Und Props erweitern (nicht ersetzen):
```typescript
interface StaerkeCardProps {
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  gesamt: number;
  isLoading?: boolean;
  className?: string;
  mode?: DashboardMode; // NEU: Optional mode prop
}
```

#### 1.2 Query-Duplizierung vermeiden

**Option A (empfohlen):** Query-Options in Child-Hooks konfigurierbar machen:

```typescript
// use-einsatz-fahrzeuge.ts
export function useEinsatzFahrzeuge(
  einsatzId: string,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: QUERY_KEYS.kraefte.fahrzeuge(einsatzId),
    queryFn: () => api.einsatzFahrzeuge().findAllVAlpha(einsatzId),
    enabled: !!einsatzId,
    refetchInterval: options?.refetchInterval ?? 30_000, // Default
  });
}
```

**Option B:** Hooks aus Child-Komponenten entfernen, Data via Props übergeben.

### 2. Should Improve (Major)

#### 2.1 localStorage für Mode-Präferenz

```typescript
// In KraefteDashboard
const [savedMode, setSavedMode] = useState<DashboardMode>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('kraefte-dashboard-mode') as DashboardMode) ?? 'standard';
  }
  return 'standard';
});

// Bei Mode-Wechsel
const handleModeChange = (newMode: DashboardMode) => {
  localStorage.setItem('kraefte-dashboard-mode', newMode);
  navigate({ search: { mode: newMode }, replace: true });
};
```

#### 2.2 DashboardModeContext statt Prop-Drilling

```typescript
// features/kraefte/contexts/dashboard-mode.context.ts
export const DashboardModeContext = createContext<DashboardMode>('standard');
export const useDashboardMode = () => useContext(DashboardModeContext);

// In KraefteDashboard
<DashboardModeContext.Provider value={mode}>
  <StaerkeCard ... />
  <FahrzeugStatusListe ... />
  <RollenUebersicht ... />
</DashboardModeContext.Provider>

// In Child-Komponenten
export function RollenKarte({ besetzung, onFreigeben }) {
  const mode = useDashboardMode(); // Kein Prop-Drilling!
  // ...
}
```

### 3. Consider (Minor)

#### 3.1 Mode-aware Skeleton Loading

```typescript
function StaerkeCardSkeleton({ mode = 'standard' }: { mode?: DashboardMode }) {
  const sizeClasses = {
    standard: 'h-8 w-10',
    fullscreen: 'h-12 w-14',
    compact: 'h-6 w-8',
  };
  // ...
}
```

#### 3.2 RollenUebersicht Grid dynamisch

```typescript
const getGridClasses = (mode: DashboardMode) => {
  const base = 'grid';
  const variants = {
    standard: 'gap-3 sm:grid-cols-2 lg:grid-cols-3',
    fullscreen: 'gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    compact: 'gap-2 grid-cols-1 sm:grid-cols-2',
  };
  return cn(base, variants[mode]);
};
```

---

## LLM Optimization Issues

| # | Issue | Current | Recommended |
|---|-------|---------|-------------|
| 1 | Verbose Code-Blöcke | Komplette Komponenten-Implementierungen | Nur Diff-Änderungen zeigen |
| 2 | Redundante Grid-Definitionen | Grid-Klassen in 3 Komponenten wiederholt | Shared `getDashboardGridClasses()` Helper |
| 3 | Ambiguität bei refetchInterval | Unklar ob Parent oder Child kontrolliert | Klare Verantwortungszuweisung dokumentieren |

---

## Next Steps

1. ☑ Review this validation report
2. ☐ Apply critical fixes to Story 6.2
3. ☐ Run `dev` agent for implementation
4. ☐ Manual testing via Chrome DevTools MCP

---

**Report Generated:** 2025-12-31T12:00:00Z
**Validator:** SM Agent (Bob) - BMad v6
