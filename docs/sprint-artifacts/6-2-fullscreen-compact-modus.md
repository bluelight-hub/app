# Story 6.2: FullScreen & Compact Modus

Status: done

## Story

Als **Einsatzleiter (Thomas)**,
möchte ich **zwischen FullScreen (Beamer) und Compact (Tablet) wechseln**,
damit **ich das Dashboard situationsgerecht anzeigen kann**.

## Hintergrund

Das Kräfte-Dashboard (Story 6.1d) zeigt Stärke, Fahrzeuge und Rollen. Für den Einsatzraum mit Beamer-Projektion wird ein großformatiges, lesbares Layout benötigt (3m Entfernung). Für FüKw-Tablets ist ein kompaktes Layout mit Touch-Targets gewünscht.

**Vorgänger:**
- **Story 6.1d:** Dashboard Container & Layout (done) - Grid-Layout, parallele Queries, Refresh

**Dependencies:**
- ETB Fullscreen-Pattern (bereits implementiert)
- Lagekarte Fullscreen-Pattern (bereits implementiert)
- FullscreenCloseButton Komponente (wiederverwendbar)

**KRITISCH - Bestehende Komponenten-Struktur:**
- `StaerkeCard` akzeptiert Data-Props (`fuehrung`, `unterfuehrung`, `mannschaft`, `gesamt`), NICHT `einsatzId`
- `FahrzeugStatusListe` und `RollenUebersicht` haben EIGENE interne Query-Hooks
- Grid-Klassen in `RollenUebersicht` sind aktuell hardcoded und müssen dynamisch werden

---

## Acceptance Criteria

### AC1: FullScreen-Modus für Beamer

- [x] **Given** ich bin im Dashboard
- [x] **When** ich auf "FullScreen" klicke
- [x] **Then** wird das Dashboard im Vollbild-Modus angezeigt (3m lesbar, NFR19)
- [x] **And** Schriftgröße min. 32px für Stärke-Zahlen, 24px für Fahrzeugnamen

### AC2: Compact-Modus für Tablet

- [x] **Given** ich bin im FullScreen-Modus
- [x] **When** ich auf "Compact" klicke
- [x] **Then** wird das Dashboard in kompakter Tablet-Ansicht angezeigt (NFR20)
- [x] **And** Touch-Targets min. 44x44px

### AC3: Auto-Refresh alle 30s

- [x] **Given** ich bin im FullScreen-Modus
- [x] **When** 30 Sekunden vergehen
- [x] **Then** wird das Dashboard automatisch aktualisiert (TanStack Query `refetchInterval: 30000`)

### AC4: Exit-Button in FullScreen

- [x] **Given** ich bin im FullScreen-Modus
- [x] **When** ich ESC drücke oder auf "Exit" klicke
- [x] **Then** kehre ich zur Normal-Ansicht zurück

### AC5: Density-Modi Toggle

- [x] **Given** ich bin im Dashboard
- [x] **When** ich den Density-Selector nutze
- [x] **Then** kann ich zwischen "Normal", "Compact", "FullScreen" wechseln
- [x] **And** die Präferenz wird im localStorage gespeichert

---

## Implementation Checklist

### Task 0: DashboardModeContext erstellen (Prop-Drilling vermeiden)

- [ ] **0.1** Neue Datei: `features/kraefte/contexts/dashboard-mode.context.ts`

> **WARUM:** Vermeidet Prop-Drilling durch 3+ Ebenen (Dashboard → Liste → Card).
> Child-Komponenten können Mode direkt via Context lesen.

```typescript
import { createContext, useContext } from 'react';

/**
 * Story 6.2 - Dashboard Modi für Layout-Varianten.
 *
 * - standard: Normales 2-Spalten Grid (768px+)
 * - fullscreen: 3-Spalten, große Schrift für Beamer (3m lesbar)
 * - compact: Kompakte Darstellung für Tablets
 */
export type DashboardMode = 'standard' | 'fullscreen' | 'compact';

const DashboardModeContext = createContext<DashboardMode>('standard');

/**
 * Hook zum Lesen des aktuellen Dashboard-Modus.
 *
 * Wird von Child-Komponenten (StaerkeCard, FahrzeugCard, RollenKarte)
 * verwendet um Mode-spezifische Styles anzuwenden.
 */
export const useDashboardMode = () => useContext(DashboardModeContext);

export const DashboardModeProvider = DashboardModeContext.Provider;
```

- [ ] **0.2** Export in `features/kraefte/contexts/index.ts`

```typescript
export { DashboardModeProvider, useDashboardMode } from './dashboard-mode.context';
export type { DashboardMode } from './dashboard-mode.context';
```

- [ ] **0.3** Export in `features/kraefte/index.ts`

```typescript
// Contexts
export { DashboardModeProvider, useDashboardMode } from './contexts';
export type { DashboardMode } from './contexts';
```

### Task 1: Route erweitern für Mode-Parameter

- [ ] **1.1** Erweitere Route: `routes/app/einsatz/$einsatzId/kräfte/dashboard.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { KraefteDashboard } from '@/features/kraefte';

/**
 * Story 6.2 - Search Parameter für Dashboard-Modus.
 *
 * URL-basierte Modi ermöglichen Bookmarks und Sharing.
 * Pattern aus ETB und Lagekarte übernommen.
 */
export type KraefteDashboardSearchParams = {
  mode?: 'standard' | 'fullscreen' | 'compact';
};

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/dashboard')({
  validateSearch: (search: Record<string, unknown>): KraefteDashboardSearchParams => {
    const mode = search.mode;
    const validModes = ['standard', 'fullscreen', 'compact'];

    if (mode && validModes.includes(mode as string)) {
      return { mode: mode as KraefteDashboardSearchParams['mode'] };
    }

    // AC5: localStorage als Default-Fallback
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('kraefte-dashboard-mode');
      if (savedMode && validModes.includes(savedMode)) {
        return { mode: savedMode as KraefteDashboardSearchParams['mode'] };
      }
    }

    return { mode: 'standard' };
  },
  component: KraefteDashboardRoute,
});

function KraefteDashboardRoute() {
  const { einsatzId } = Route.useParams();
  const { mode = 'standard' } = Route.useSearch();

  // Fullscreen-Modus: Keine Container-Padding
  if (mode === 'fullscreen') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <KraefteDashboard einsatzId={einsatzId} mode="fullscreen" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <KraefteDashboard einsatzId={einsatzId} mode={mode} />
    </div>
  );
}
```

### Task 2: KraefteDashboard Props erweitern

- [ ] **2.1** Erweitere: `features/kraefte/ui/pages/KraefteDashboard.page.tsx`

> **KRITISCH:** Die bestehenden Child-Komponenten (`FahrzeugStatusListe`, `RollenUebersicht`)
> haben EIGENE Query-Hooks. Wir nutzen DashboardModeProvider um refetchInterval zu steuern.
> StaerkeCard nutzt Data-Props - Query bleibt im Dashboard.

```typescript
import { useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FullscreenCloseButton } from '@/features/lagekarte/ui/organisms/FullscreenCloseButton';
import { DashboardModeProvider, type DashboardMode } from '../../contexts';
import { cn } from '@/shared/ui/cn';
import { PiChartBar, PiArrowClockwise, PiWarningCircle } from 'react-icons/pi';
import { useTaktischeStaerke } from '../../api';
import { StaerkeCard } from '../molecules';
import { FahrzeugStatusListe, RollenUebersicht } from '../organisms';
import { DashboardErrorCard } from '../molecules/DashboardErrorCard';

interface KraefteDashboardProps {
  einsatzId: string;
  className?: string;
  mode?: DashboardMode;
}

export function KraefteDashboard({
  einsatzId,
  className,
  mode = 'standard'
}: KraefteDashboardProps) {
  const navigate = useNavigate();

  // NUR StaerkeCard Query hier - FahrzeugStatusListe und RollenUebersicht
  // haben eigene Hooks und lesen refetchInterval via useDashboardMode()
  const staerkeQuery = useTaktischeStaerke(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Kombinierte States für Header (Child-Komponenten updaten sich selbst)
  const isAnyFetching = staerkeQuery.isFetching;
  const latestUpdate = staerkeQuery.dataUpdatedAt || 0;

  // Mode Navigation Handler mit localStorage Speicherung (AC5)
  const handleModeChange = useCallback((newMode: DashboardMode) => {
    localStorage.setItem('kraefte-dashboard-mode', newMode);
    navigate({
      search: { mode: newMode },
      replace: true,
    });
  }, [navigate]);

  const handleExitFullscreen = useCallback(() => {
    handleModeChange('standard');
  }, [handleModeChange]);

  // AC4: ESC-Handler für Fullscreen
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'fullscreen') {
        event.preventDefault();
        handleExitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [mode, handleExitFullscreen]);

  // Layout-Klassen nach Modus
  const gridClasses = {
    standard: 'grid gap-4 md:grid-cols-2 md:gap-6',
    fullscreen: 'grid gap-6 lg:grid-cols-3 xl:gap-8',
    compact: 'grid gap-2 md:grid-cols-2 md:gap-3',
  };

  return (
    <DashboardModeProvider value={mode}>
      <div className={cn(
        'space-y-6',
        mode === 'fullscreen' && 'p-6 lg:p-8',
        className
      )}>
        {/* AC4: Exit-Button in FullScreen */}
        {mode === 'fullscreen' && (
          <FullscreenCloseButton onClose={handleExitFullscreen} />
        )}

        {/* Header mit Mode-Selector (AC5) */}
        <DashboardHeader
          onRefresh={() => staerkeQuery.refetch()}
          lastUpdated={latestUpdate}
          isRefreshing={isAnyFetching}
          mode={mode}
          onModeChange={handleModeChange}
        />

        {/* Grid Layout nach Modus */}
        <div className={gridClasses[mode]}>
          {/* Stärke-Card - KORREKT: Data-Props, nicht einsatzId */}
          <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
            {staerkeQuery.isError ? (
              <DashboardErrorCard
                title="Stärke"
                onRetry={() => staerkeQuery.refetch()}
                compact={mode === 'compact'}
              />
            ) : (
              <StaerkeCard
                fuehrung={staerkeQuery.data?.fuehrung ?? 0}
                unterfuehrung={staerkeQuery.data?.unterfuehrung ?? 0}
                mannschaft={staerkeQuery.data?.mannschaft ?? 0}
                gesamt={staerkeQuery.data?.gesamt ?? 0}
                isLoading={staerkeQuery.isLoading}
                className="h-full"
              />
            )}
          </div>

          {/* Fahrzeug-Liste - Hat eigenen Hook, liest Mode via Context */}
          <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
            <FahrzeugStatusListe einsatzId={einsatzId} className="h-full" />
          </div>

          {/* Rollen-Übersicht - Hat eigenen Hook, liest Mode via Context */}
          <div className={cn(
            mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-2'
          )}>
            <RollenUebersicht einsatzId={einsatzId} />
          </div>
        </div>
      </div>
    </DashboardModeProvider>
  );
}
```

### Task 3: DashboardHeader mit Mode-Selector

- [ ] **3.1** Erweitere DashboardHeader in `KraefteDashboard.page.tsx`

```typescript
import { PiArrowsOut, PiArrowsIn, PiDevices } from 'react-icons/pi';

interface DashboardHeaderProps {
  onRefresh: () => void;
  lastUpdated: number;
  isRefreshing: boolean;
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

function DashboardHeader({
  onRefresh,
  lastUpdated,
  isRefreshing,
  mode,
  onModeChange
}: DashboardHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between',
      mode === 'fullscreen' && 'sticky top-0 z-10 -mx-6 -mt-6 bg-white px-6 py-4 shadow-sm dark:bg-gray-800 lg:-mx-8 lg:px-8'
    )}>
      <div className="flex items-center gap-3">
        <PiChartBar className={cn(
          'text-gray-500 dark:text-gray-400',
          mode === 'fullscreen' ? 'h-8 w-8' : 'h-6 w-6'
        )} />
        <h1 className={cn(
          'font-bold text-gray-900 dark:text-gray-100',
          mode === 'fullscreen' ? 'text-3xl lg:text-4xl' : 'text-2xl'
        )}>
          Kräfte-Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Timestamp (AC3: Auto-Refresh Indikator) */}
        {latestUpdate > 0 && (
          <span className={cn(
            'text-gray-500 dark:text-gray-400',
            mode === 'fullscreen' ? 'text-lg' : 'text-sm'
          )}>
            Aktualisiert: {formatTime(latestUpdate)}
          </span>
        )}

        {/* Mode Selector (AC5) */}
        <ModeSelector mode={mode} onModeChange={onModeChange} />

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'rounded-lg p-2 text-gray-500 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isRefreshing && 'animate-spin',
            mode === 'fullscreen' && 'p-3'
          )}
          title="Alle Daten aktualisieren"
        >
          <PiArrowClockwise className={mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5'} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **3.2** Mode-Selector Komponente

```typescript
interface ModeSelectorProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
      <button
        type="button"
        onClick={() => onModeChange('compact')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'compact'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        )}
        title="Kompakt-Modus für Tablets"
      >
        <PiDevices className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onModeChange('standard')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'standard'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        )}
        title="Standard-Ansicht"
      >
        Normal
      </button>
      <button
        type="button"
        onClick={() => onModeChange('fullscreen')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'fullscreen'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        )}
        title="Vollbild-Modus für Beamer"
      >
        <PiArrowsOut className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### Task 4: StaerkeCard Mode-Support

- [ ] **4.1** Erweitere: `features/kraefte/ui/molecules/StaerkeCard.tsx`

> **KRITISCH:** Props-Struktur BEIBEHALTEN (Data-Props), Mode via Context lesen.
> StaerkeCard erhält Daten vom Parent, NICHT via eigenem Hook.

```typescript
import { cn } from '@/shared/ui/cn';
import { useDashboardMode, type DashboardMode } from '../../contexts';

interface StaerkeCardProps {
  /** Anzahl Führungskräfte */
  fuehrung: number;
  /** Anzahl Unterführer */
  unterfuehrung: number;
  /** Anzahl Mannschaftsmitglieder */
  mannschaft: number;
  /** Gesamtanzahl */
  gesamt: number;
  /** Loading State */
  isLoading?: boolean;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Story 6.2 - Mode-aware Size Classes.
 */
const getModeClasses = (mode: DashboardMode) => ({
  number: {
    standard: 'text-2xl font-bold',
    fullscreen: 'text-4xl font-bold lg:text-5xl',
    compact: 'text-xl font-semibold',
  }[mode],
  label: {
    standard: 'text-xs text-gray-500',
    fullscreen: 'text-base text-gray-500 lg:text-lg',
    compact: 'text-[10px] text-gray-500',
  }[mode],
  container: {
    standard: 'p-4',
    fullscreen: 'p-6 lg:p-8',
    compact: 'p-3',
  }[mode],
  title: {
    standard: 'text-sm',
    fullscreen: 'text-xl lg:text-2xl',
    compact: 'text-xs',
  }[mode],
  gap: {
    standard: 'gap-4',
    fullscreen: 'gap-8',
    compact: 'gap-2',
  }[mode],
});

/**
 * StaerkeCard zeigt die taktische Stärke.
 *
 * Liest DashboardMode via Context für Mode-spezifische Styles.
 * Daten werden via Props übergeben (Query im Parent).
 */
export function StaerkeCard({
  fuehrung,
  unterfuehrung,
  mannschaft,
  gesamt,
  isLoading,
  className
}: StaerkeCardProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  if (isLoading) {
    return <StaerkeCardSkeleton className={className} />;
  }

  // Compact-Modus: Nur Gesamt anzeigen (platzsparend)
  if (mode === 'compact') {
    return (
      <div className={cn(
        'flex items-center justify-between rounded-lg border border-gray-200 bg-white',
        'dark:border-gray-700 dark:bg-gray-800',
        classes.container,
        className
      )}>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stärke</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">{gesamt}</span>
      </div>
    );
  }

  // Standard & Fullscreen: Alle Kategorien mit Separatoren
  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm',
      'dark:border-gray-700 dark:bg-gray-800',
      classes.container,
      className
    )}>
      <h3 className={cn(
        'mb-4 font-medium text-gray-900 dark:text-gray-100',
        classes.title
      )}>
        Taktische Stärke
      </h3>

      <div className={cn('flex items-center justify-between', classes.gap)}>
        {/* Führung - Blau */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-blue-600 dark:text-blue-400')}>{fuehrung}</span>
          <p className={classes.label}>Führung</p>
        </div>

        <span className={cn('text-gray-400 dark:text-gray-500', mode === 'fullscreen' ? 'text-2xl' : 'text-xl')}>/</span>

        {/* Unterführung - Grün */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-green-600 dark:text-green-400')}>{unterfuehrung}</span>
          <p className={classes.label}>Unterführung</p>
        </div>

        <span className={cn('text-gray-400 dark:text-gray-500', mode === 'fullscreen' ? 'text-2xl' : 'text-xl')}>/</span>

        {/* Mannschaft - Grau */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-gray-600 dark:text-gray-300')}>{mannschaft}</span>
          <p className={classes.label}>Mannschaft</p>
        </div>

        <span className={cn('text-gray-400 dark:text-gray-500', mode === 'fullscreen' ? 'text-2xl' : 'text-xl')}>/</span>

        {/* Gesamt - Bold/Schwarz */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-gray-900 dark:text-white')}>{gesamt}</span>
          <p className={classes.label}>Gesamt</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loading State für StaerkeCard.
 */
function StaerkeCardSkeleton({ className }: { className?: string }) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse',
      'dark:border-gray-700 dark:bg-gray-800',
      classes.container,
      className
    )}>
      <div className="mb-4 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className={cn('flex items-center justify-between', classes.gap)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className={cn(
              'mx-auto mb-1 rounded bg-gray-200 dark:bg-gray-700',
              mode === 'fullscreen' ? 'h-12 w-14' : mode === 'compact' ? 'h-6 w-8' : 'h-8 w-10'
            )} />
            <div className="mx-auto h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Task 5: FahrzeugStatusListe Mode-Support

- [ ] **5.1** Erweitere: `features/kraefte/ui/organisms/FahrzeugStatusListe.tsx`

> **KRITISCH:** Komponente hat EIGENEN Hook. Mode via Context lesen.
> refetchInterval mode-aware machen.

```typescript
import { cn } from '@/shared/ui/cn';
import { FahrzeugCard, FahrzeugCardSkeleton } from '../molecules/FahrzeugCard';
import { useEinsatzFahrzeuge } from '../../api/use-einsatz-fahrzeuge';
import { useDashboardMode } from '../../contexts';
import { PiTruck, PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';

interface FahrzeugStatusListeProps {
  einsatzId: string;
  onFahrzeugClick?: (fahrzeugId: string) => void;
  className?: string;
}

export function FahrzeugStatusListe({
  einsatzId,
  onFahrzeugClick,
  className
}: FahrzeugStatusListeProps) {
  // Mode via Context (kein Prop-Drilling)
  const mode = useDashboardMode();

  // AC3: refetchInterval nur in Fullscreen
  const { data: fahrzeuge, isLoading, error, refetch, dataUpdatedAt } = useEinsatzFahrzeuge(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        mode === 'fullscreen' ? 'p-6 lg:p-8' : mode === 'compact' ? 'p-3' : 'p-4',
        className
      )}>
        <FahrzeugStatusListeSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        mode === 'fullscreen' ? 'p-6 lg:p-8' : mode === 'compact' ? 'p-3' : 'p-4',
        className
      )}>
        <div className="flex flex-col items-center py-8 text-red-500">
          <PiWarningCircle className="mb-2 h-8 w-8" />
          <p className="text-sm">Fehler beim Laden der Fahrzeuge</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-blue-600 text-sm hover:underline">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const fahrzeugCount = fahrzeuge?.length ?? 0;

  // Compact: Badge-Liste statt Karten
  if (mode === 'compact') {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white p-3',
        'dark:border-gray-700 dark:bg-gray-800',
        className
      )}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Fahrzeuge</span>
          <span className="text-xs text-gray-500">{fahrzeugCount}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {fahrzeuge?.map((fz) => (
            <FahrzeugBadge key={fz.id} fahrzeug={fz} />
          ))}
        </div>
      </div>
    );
  }

  // Standard & Fullscreen: Vollständige Karten
  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm',
      'dark:border-gray-700 dark:bg-gray-800',
      mode === 'fullscreen' ? 'p-6 lg:p-8' : 'p-4',
      className
    )}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiTruck className={cn('text-gray-500', mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5')} />
          <h3 className={cn(
            'font-semibold text-gray-900 dark:text-gray-100',
            mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-base'
          )}>
            Fahrzeuge
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-gray-500', mode === 'fullscreen' ? 'text-base' : 'text-sm')}>
            {fahrzeugCount} im Einsatz
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Aktualisieren"
          >
            <PiArrowClockwise className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Liste */}
      {fahrzeuge && fahrzeuge.length > 0 ? (
        <div className={mode === 'fullscreen' ? 'space-y-4' : 'space-y-3'}>
          {fahrzeuge.map((fahrzeug) => (
            <FahrzeugCard
              key={fahrzeug.id}
              fahrzeug={fahrzeug}
              onClick={onFahrzeugClick ? () => onFahrzeugClick(fahrzeug.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-gray-500">
          <PiTruck className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Fahrzeuge erfasst</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Badge für Fahrzeug.
 */
function FahrzeugBadge({ fahrzeug }: { fahrzeug: { id: string; funkrufname: string; fmsStatus: number } }) {
  const statusColors: Record<number, string> = {
    1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    4: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
      statusColors[fahrzeug.fmsStatus] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    )}>
      {fahrzeug.funkrufname}
    </span>
  );
}

function FahrzeugStatusListeSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <FahrzeugCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **5.2** Erweitere Hook: `features/kraefte/api/use-einsatz-fahrzeuge.ts`

> Hook muss `refetchInterval` als Option akzeptieren.

```typescript
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

interface UseEinsatzFahrzeugeOptions {
  refetchInterval?: number | false;
}

/**
 * Hook für Einsatz-Fahrzeuge.
 *
 * Story 6.2: refetchInterval ist konfigurierbar für Fullscreen-Modus.
 */
export function useEinsatzFahrzeuge(
  einsatzId: string,
  options?: UseEinsatzFahrzeugeOptions
) {
  return useQuery({
    queryKey: QUERY_KEYS.kraefte.fahrzeuge(einsatzId),
    queryFn: () => api.einsatzFahrzeuge().einsatzFahrzeugeControllerFindAllVAlpha(einsatzId),
    enabled: !!einsatzId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
```

### Task 6: RollenUebersicht Mode-Support

- [ ] **6.1** Erweitere: `features/kraefte/ui/organisms/RollenUebersicht.tsx`

> **KRITISCH:** Komponente hat EIGENEN Hook. Mode via Context lesen (kein Prop).
> refetchInterval mode-aware machen. Grid-Klassen dynamisch gestalten.

```typescript
import { cn } from '@/shared/ui/cn';
import { PiUsers, PiArrowClockwise, PiWarningCircle } from 'react-icons/pi';
import { useRollenBesetzungen } from '../../api';
import { useDashboardMode } from '../../contexts';
import { RollenKarte, RollenKarteSkeleton } from '../molecules/RollenKarte';

interface RollenUebersichtProps {
  einsatzId: string;
  onFreigebeClick?: (rollenBesetzungId: string) => void;
  className?: string;
  // KEIN mode Prop - wird via useDashboardMode() Context gelesen
}

/**
 * Formatiert einen Timestamp als HH:MM
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * RollenUebersicht zeigt alle besetzten Führungsrollen.
 *
 * Story 6.2: Liest Mode via Context für Mode-spezifische Layouts.
 * Grid-Klassen sind dynamisch basierend auf Mode.
 */
export function RollenUebersicht({
  einsatzId,
  onFreigebeClick,
  className
}: RollenUebersichtProps) {
  // Mode via Context (kein Prop-Drilling)
  const mode = useDashboardMode();

  // AC3: refetchInterval nur in Fullscreen
  const { data: besetzungen, isLoading, error, refetch, dataUpdatedAt } = useRollenBesetzungen(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className={cn(
        'rounded-lg border bg-white dark:bg-gray-800',
        mode === 'fullscreen' ? 'p-6 lg:p-8' : mode === 'compact' ? 'p-3' : 'p-4',
        className
      )}>
        <RollenUebersichtSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn(
        'rounded-lg border bg-white dark:bg-gray-800',
        mode === 'fullscreen' ? 'p-6 lg:p-8' : mode === 'compact' ? 'p-3' : 'p-4',
        className
      )}>
        <div className="flex flex-col items-center py-8 text-red-500">
          <PiWarningCircle className="mb-2 h-8 w-8" />
          <p className="text-sm">Fehler beim Laden der Rollen</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-blue-600 text-sm hover:underline">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const besetzteCount = besetzungen?.length ?? 0;

  // Compact: Inline-Liste statt Grid (platzsparend für Tablets)
  if (mode === 'compact') {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white p-3',
        'dark:border-gray-700 dark:bg-gray-800',
        className
      )}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Rollen
          </span>
          <span className="text-xs text-gray-500">{besetzteCount} besetzt</span>
        </div>
        {besetzungen && besetzungen.length > 0 ? (
          <div className="space-y-1">
            {besetzungen.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700"
              >
                <span className="font-medium text-gray-700 text-xs dark:text-gray-300">
                  {b.rollenName}
                </span>
                <span className="text-gray-600 text-xs dark:text-gray-400">
                  {b.personName}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-xs">Keine Rollen besetzt</p>
        )}
      </div>
    );
  }

  // Grid Layouts nach Modus (DYNAMISCH, nicht hardcoded)
  const gridClasses = {
    standard: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
    fullscreen: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    compact: '', // nicht verwendet (hat separaten Return)
  };

  // Standard & Fullscreen: Vollständige Karten im Grid
  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm',
      'dark:border-gray-700 dark:bg-gray-800',
      mode === 'fullscreen' ? 'p-6 lg:p-8' : 'p-4',
      className
    )}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiUsers className={cn('text-gray-500', mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5')} />
          <h3 className={cn(
            'font-semibold text-gray-900 dark:text-gray-100',
            mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-base'
          )}>
            Führungsrollen
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-gray-500', mode === 'fullscreen' ? 'text-base' : 'text-sm')}>
            {besetzteCount} besetzt
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Aktualisieren"
            aria-label="Aktualisieren"
          >
            <PiArrowClockwise className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {dataUpdatedAt && (
        <p className={cn(
          'mb-3 text-gray-400',
          mode === 'fullscreen' ? 'text-sm' : 'text-xs'
        )}>
          Aktualisiert: {formatTime(dataUpdatedAt)}
        </p>
      )}

      {/* Grid oder Empty State */}
      {besetzungen && besetzungen.length > 0 ? (
        <div className={gridClasses[mode]}>
          {besetzungen.map((besetzung) => (
            <RollenKarte
              key={besetzung.id}
              besetzung={besetzung}
              onFreigeben={onFreigebeClick ? () => onFreigebeClick(besetzung.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-gray-500">
          <PiUsers className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Rollen besetzt</p>
        </div>
      )}
    </div>
  );
}

function RollenUebersichtSkeleton() {
  const mode = useDashboardMode();

  const gridClasses = {
    standard: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
    fullscreen: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    compact: 'space-y-1',
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className={gridClasses[mode]}>
        {[1, 2, 3].map((i) => (
          <RollenKarteSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **6.2** Erweitere Hook: `features/kraefte/api/use-rollen-besetzungen.ts`

> Hook muss `refetchInterval` als Option akzeptieren (wie Task 5.2).

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

interface UseRollenBesetzungenOptions {
  refetchInterval?: number | false;
}

/**
 * Hook für Rollen-Besetzungen eines Einsatzes.
 *
 * Story 6.2: refetchInterval ist konfigurierbar für Fullscreen-Modus.
 */
export function useRollenBesetzungen(
  einsatzId: string,
  options?: UseRollenBesetzungenOptions
) {
  return useQuery({
    queryKey: QUERY_KEYS.kraefte.rollenBesetzungen(einsatzId),
    queryFn: () => api.rollenBesetzung().rollenBesetzungControllerFindByEinsatzVAlpha(einsatzId),
    enabled: !!einsatzId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
```

- [ ] **6.3** RollenKarte Mode-Support via Context

> RollenKarte liest Mode via Context für Mode-spezifische Styles.

```typescript
// In RollenKarte.tsx
import { useDashboardMode } from '../../contexts';

export function RollenKarte({ besetzung, onFreigeben }: RollenKarteProps) {
  const mode = useDashboardMode();

  // Mode-spezifische Styles
  const containerClasses = {
    standard: 'rounded-lg border p-4',
    fullscreen: 'rounded-lg border p-5 lg:p-6',
    compact: 'rounded border p-2', // nicht verwendet (Inline-Liste)
  };

  const nameClasses = {
    standard: 'text-base font-semibold',
    fullscreen: 'text-lg lg:text-xl font-bold',
    compact: 'text-sm font-medium',
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      containerClasses[mode]
    )}>
      <p className={cn('text-gray-900 dark:text-white', nameClasses[mode])}>
        {besetzung.rollenName}
      </p>
      <p className={cn(
        'text-gray-600 dark:text-gray-400',
        mode === 'fullscreen' ? 'text-base lg:text-lg' : 'text-sm'
      )}>
        {besetzung.personName}
      </p>
      {/* ... */}
    </div>
  );
}
```

### Task 7: DashboardErrorCard extrahieren

- [ ] **7.1** Neue Komponente: `features/kraefte/ui/molecules/DashboardErrorCard.tsx`

```typescript
import { PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface DashboardErrorCardProps {
  title: string;
  onRetry: () => void;
  compact?: boolean;
}

/**
 * Story 6.2 - Einheitliche Error-Card für Dashboard-Widgets.
 *
 * Extrahiert aus Story 6.1d zur Wiederverwendung und
 * Mode-spezifischen Darstellung.
 */
export function DashboardErrorCard({
  title,
  onRetry,
  compact = false
}: DashboardErrorCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50',
      'dark:border-red-800 dark:bg-red-900/20',
      compact ? 'gap-1 p-3' : 'gap-2 p-4 h-full'
    )}>
      <PiWarningCircle className={cn(
        'text-red-500',
        compact ? 'h-5 w-5' : 'h-8 w-8'
      )} />
      <p className={cn(
        'text-center text-red-600 dark:text-red-400',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {title} konnte nicht geladen werden
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'flex items-center gap-1 text-red-600 hover:text-red-700',
          'dark:text-red-400 dark:hover:text-red-300',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        <PiArrowClockwise className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        Erneut versuchen
      </button>
    </div>
  );
}
```

### Task 8: Keyboard-Support (AC4)

- [ ] **8.1** ESC-Handler im KraefteDashboard hinzufügen

```typescript
// In KraefteDashboard.page.tsx
import { useEffect } from 'react';

// Im Component Body:
useEffect(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // AC4: ESC zum Verlassen des Fullscreen-Modus
    if (event.key === 'Escape' && mode === 'fullscreen') {
      event.preventDefault();
      handleExitFullscreen();
    }
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, [mode, handleExitFullscreen]);
```

### Task 9: Feature Exports aktualisieren

- [ ] **9.1** Erweitere: `features/kraefte/ui/molecules/index.ts`

```typescript
export { StaerkeCard } from './StaerkeCard';
export { FahrzeugCard } from './FahrzeugCard';
export { RollenKarte } from './RollenKarte';
export { DashboardErrorCard } from './DashboardErrorCard'; // NEU
```

- [ ] **9.2** Erweitere Type-Exports in `features/kraefte/index.ts`

```typescript
// Types
export type { DashboardMode } from './ui/pages/KraefteDashboard.page';
```

### Task 10: SingleEinsatzLayout Integration

- [ ] **10.1** Erweitere: `shared/ui/templates/SingleEinsatzLayout.tsx`

```typescript
// Füge Kräfte-Dashboard zu supportsFullscreen hinzu
const isOnKraefteDashboardRoute = !!matchRoute({
  to: '/app/einsatz/$einsatzId/kräfte/dashboard',
  fuzzy: false
});

const supportsFullscreen = isOnKarteRoute || isOnEtbRoute || isOnKraefteDashboardRoute;
```

---

## File Structure

```
packages/frontend/src/
├── features/kraefte/
│   ├── contexts/                           # NEU (Task 0)
│   │   ├── dashboard-mode.context.ts       # NEU - DashboardModeContext
│   │   └── index.ts                        # NEU - Context Exports
│   ├── api/
│   │   ├── use-taktische-staerke.ts        # ERWEITERN (refetchInterval Option)
│   │   ├── use-einsatz-fahrzeuge.ts        # ERWEITERN (Task 5.2)
│   │   └── use-rollen-besetzungen.ts       # ERWEITERN (Task 6.2)
│   ├── ui/
│   │   ├── molecules/
│   │   │   ├── StaerkeCard.tsx             # ERWEITERN (Task 4)
│   │   │   ├── RollenKarte.tsx             # ERWEITERN (Task 6.3)
│   │   │   ├── DashboardErrorCard.tsx      # NEU (Task 7)
│   │   │   └── index.ts                    # ERWEITERN (Task 9.1)
│   │   ├── organisms/
│   │   │   ├── FahrzeugStatusListe.tsx     # ERWEITERN (Task 5)
│   │   │   └── RollenUebersicht.tsx        # ERWEITERN (Task 6)
│   │   └── pages/
│   │       └── KraefteDashboard.page.tsx   # ERWEITERN (Task 2, 3, 8)
│   └── index.ts                            # ERWEITERN (Task 9.2 + Context Export)
├── routes/app/einsatz/$einsatzId/kräfte/
│   └── dashboard.tsx                       # ERWEITERN (Task 1)
└── shared/ui/templates/
    └── SingleEinsatzLayout.tsx             # ERWEITERN (Task 10)
```

---

## Existierende Komponenten (WIEDERVERWENDUNG!)

| Komponente | Pfad | Verwendung |
|-----------|------|------------|
| `FullscreenCloseButton` | `features/lagekarte/ui/organisms/FullscreenCloseButton/` | Import für AC4 |
| `cn` | `shared/ui/cn.ts` | Conditional Classes |
| `useTaktischeStaerke` | `features/kraefte/api/use-taktische-staerke.ts` | Query mit refetchInterval |
| `useEinsatzFahrzeuge` | `features/kraefte/api/use-einsatz-fahrzeuge.ts` | Query mit refetchInterval |
| `useRollenBesetzungen` | `features/kraefte/api/use-rollen-besetzungen.ts` | Query mit refetchInterval |

**KEINE neuen Backend-APIs erforderlich!**

---

## Technical Notes

### Warum URL-basierte Modi?

1. **Bookmarks:** User kann Fullscreen-URL speichern
2. **Sharing:** Link mit `?mode=fullscreen` kann geteilt werden
3. **Back-Button:** Browser-History funktioniert korrekt
4. **Pattern-Konsistenz:** ETB und Lagekarte nutzen bereits gleiches Pattern

### Kombination URL + localStorage (AC5)

> **Ursprünglich** war nur URL geplant, aber AC5 fordert localStorage-Persistenz.

**Implementierte Lösung:**
- **URL** hat Priorität (für Sharing/Bookmarks)
- **localStorage** als Fallback wenn URL keinen Mode hat
- Bei Mode-Wechsel: Beide werden aktualisiert

```typescript
// In Route validateSearch:
const savedMode = localStorage.getItem('kraefte-dashboard-mode');
if (savedMode && validModes.includes(savedMode)) {
  return { mode: savedMode };
}

// Bei Mode-Wechsel:
const handleModeChange = (newMode: DashboardMode) => {
  localStorage.setItem('kraefte-dashboard-mode', newMode);
  navigate({ search: { mode: newMode }, replace: true });
};
```

### refetchInterval in Fullscreen

```typescript
// AC3: Auto-Refresh nur im Fullscreen aktiv
const { data } = useTaktischeStaerke(einsatzId, {
  refetchInterval: mode === 'fullscreen' ? 30000 : false,
});
```

Vermeidet unnötige API-Calls im Standard/Compact-Modus.

---

## UX Design Tokens

### Fullscreen-Modus (AC1)

```typescript
const fullscreenTokens = {
  // Schriftgrößen (3m lesbar)
  title: 'text-3xl lg:text-4xl',      // 32-40px
  staerkeNumber: 'text-4xl lg:text-5xl', // 36-48px
  fahrzeugName: 'text-xl lg:text-2xl',   // 20-24px
  label: 'text-base lg:text-lg',         // 16-18px

  // Abstände
  padding: 'p-6 lg:p-8',
  gap: 'gap-6 lg:gap-8',

  // Grid
  grid: 'grid-cols-1 lg:grid-cols-3',
};
```

### Compact-Modus (AC2)

```typescript
const compactTokens = {
  // Schriftgrößen
  title: 'text-sm',
  number: 'text-xl',
  label: 'text-xs',

  // Touch-Targets (min 44x44px)
  button: 'min-h-[44px] min-w-[44px] p-3',

  // Abstände
  padding: 'p-3',
  gap: 'gap-2',

  // Grid
  grid: 'grid-cols-2',
};
```

---

## Testing (MANUELL via Chrome)

### AC1: Fullscreen-Test

1. Navigiere zu `/app/einsatz/{id}/kräfte/dashboard`
2. Klicke auf Fullscreen-Button im Header
3. Verifiziere: URL ändert sich zu `?mode=fullscreen`
4. Verifiziere: Dashboard füllt gesamten Bildschirm
5. Verifiziere: Stärke-Zahlen sind mindestens 32px (text-4xl)
6. Verifiziere: Fahrzeugnamen sind mindestens 24px (text-2xl)

### AC2: Compact-Test

1. Navigiere zu `/app/einsatz/{id}/kräfte/dashboard?mode=compact`
2. Verifiziere: Kompaktes Layout mit weniger Padding
3. Verifiziere: Touch-Targets (Buttons) sind min. 44x44px
4. Chrome DevTools → Device Toolbar → Tablet simulieren

### AC3: Auto-Refresh-Test

1. Navigiere zu `?mode=fullscreen`
2. Öffne Chrome DevTools → Network Tab
3. Warte 30 Sekunden
4. Verifiziere: 3 API-Requests werden automatisch gesendet
5. Wechsle zu `?mode=standard`
6. Verifiziere: Keine automatischen Requests mehr

### AC4: ESC-Test

1. Navigiere zu `?mode=fullscreen`
2. Drücke ESC-Taste
3. Verifiziere: Mode wechselt zu `standard`
4. Verifiziere: URL ändert sich zu `?mode=standard`

### AC5: Mode-Selector-Test

1. Klicke auf Compact-Button
2. Verifiziere: URL ändert sich, Layout passt sich an
3. Klicke auf Fullscreen-Button
4. Verifiziere: URL ändert sich, Layout passt sich an
5. Klicke auf Normal-Button
6. Verifiziere: Standard-Layout

---

## Architecture Notes

### Warum FullscreenCloseButton aus Lagekarte wiederverwenden?

1. **DRY:** Gleiche Funktionalität bereits implementiert
2. **ESC-Support:** Keyboard-Handler bereits integriert
3. **Styling:** Konsistentes Erscheinungsbild über Features

### Warum DashboardModeContext statt Mode-Props?

> **Ursprünglich** war Mode-Props geplant, aber Validation zeigte 3+ Ebenen Prop-Drilling.

1. **Vermeidet Prop-Drilling:** Mode muss durch Dashboard → Liste → Card → Sub-Component
2. **Child-Komponenten haben eigene Hooks:** FahrzeugStatusListe/RollenUebersicht lesen Mode für refetchInterval
3. **Konsistenz:** Alle Komponenten nutzen `useDashboardMode()` für Mode-spezifische Styles
4. **Testing:** Context ist einfach zu mocken via `DashboardModeProvider` Wrapper

```typescript
// Test-Setup
render(
  <DashboardModeProvider value="fullscreen">
    <StaerkeCard fuehrung={1} unterfuehrung={2} mannschaft={5} gesamt={8} />
  </DashboardModeProvider>
);
```

### Warum StaerkeCard Data-Props statt einsatzId?

1. **Trennung von Concerns:** StaerkeCard ist nur für Rendering zuständig
2. **Query-Ownership:** Dashboard hat die Query, kann refetchInterval pro Mode steuern
3. **Wiederverwendbarkeit:** StaerkeCard könnte auch mit statischen Daten genutzt werden

### Query Invalidation bei Mode-Wechsel

Keine Invalidation nötig - Queries bleiben gleich, nur Layout und refetchInterval ändern sich.

---

## References

| Dokument | Pfad |
|----------|------|
| Story 6.1d | `docs/sprint-artifacts/6-1d-dashboard-container-layout.md` |
| ETB Fullscreen | `features/etb/ui/organisms/EtbFullscreenView/` |
| Lagekarte Fullscreen | `features/lagekarte/ui/organisms/LagekarteView/` |
| FullscreenCloseButton | `features/lagekarte/ui/organisms/FullscreenCloseButton/` |
| Project Context | `docs/project-context.md` |
| Epic 6 Definition | `docs/epics.md` |

---

## Dev Agent Record

### Context Reference

Erstellt via BMad create-story Workflow (YOLO-Modus) mit parallelen Subagents.
**Validiert** via SM Agent mit validate-create-story Workflow (4 parallel Subagents).

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

**2025-12-31 - Story 6.2 Draft erstellt:**

1. **Subagent-Analyse (3 parallel):**
   - Explore Agent #1: Kräfte Frontend Patterns (StaerkeCard, FahrzeugStatusListe, etc.)
   - Explore Agent #2: Story 6.1d Learnings (Grid-Layout, Error-States, Queries)
   - Explore Agent #3: Fullscreen Patterns (ETB, Lagekarte, FullscreenCloseButton)

2. **Pattern-Entscheidungen:**
   - URL-basierte Modi (`?mode=fullscreen`) wie ETB/Lagekarte
   - FullscreenCloseButton aus Lagekarte wiederverwenden
   - ~~Mode-Props statt Context für Explizitheit~~ → **Korrigiert zu Context-Pattern**

3. **Komponenten-Erweiterungen:**
   - StaerkeCard: Compact-Variante (nur Gesamt)
   - FahrzeugStatusListe: Compact-Badge-Liste
   - RollenUebersicht: Compact-Inline-Liste
   - DashboardErrorCard: Extrahiert für Wiederverwendung

4. **AC-Mapping:**
   - AC1: Fullscreen-Layout mit großen Schriften
   - AC2: Compact-Layout mit Touch-Targets
   - AC3: refetchInterval: 30000 nur in Fullscreen
   - AC4: ESC-Handler + FullscreenCloseButton
   - AC5: ModeSelector im Header + localStorage Persistenz

**2025-12-31 - SM Agent Validation (14/21 → Fixes Applied):**

1. **Validation mit 4 parallelen Subagents:**
   - Agent #1: Analysierte StaerkeCard/FahrzeugStatusListe/RollenUebersicht Props
   - Agent #2: Analysierte ETB/Lagekarte Fullscreen Patterns
   - Agent #3: Analysierte TanStack Router Search Params
   - Agent #4: Analysierte Story 6.1d Learnings

2. **5 Kritische Issues gefunden und behoben:**
   - 🔴 StaerkeCard Props Inkompatibilität → **BEHOBEN:** Data-Props beibehalten
   - 🔴 Doppelte Query-Instanzen → **BEHOBEN:** Child-Hooks mit refetchInterval Option
   - 🟡 AC5 localStorage nicht implementiert → **BEHOBEN:** localStorage für Default-Präferenz
   - 🟡 Prop-Drilling Problem → **BEHOBEN:** DashboardModeContext (Task 0)
   - 🟡 RollenUebersicht Grid hardcoded → **BEHOBEN:** Dynamische Grid-Klassen

3. **Architektur-Änderungen:**
   - **NEU:** Task 0 - DashboardModeContext erstellen
   - **NEU:** contexts/ Ordner in Feature-Struktur
   - Child-Komponenten lesen Mode via `useDashboardMode()` Hook
   - Hooks (`useEinsatzFahrzeuge`, `useRollenBesetzungen`) erweitert mit `refetchInterval` Option

### File List

**Zu erstellen:**
- `packages/frontend/src/features/kraefte/contexts/dashboard-mode.context.ts` (Task 0)
- `packages/frontend/src/features/kraefte/contexts/index.ts` (Task 0)
- `packages/frontend/src/features/kraefte/ui/molecules/DashboardErrorCard.tsx` (Task 7)

**Zu erweitern:**
- `packages/frontend/src/routes/app/einsatz/$einsatzId/kräfte/dashboard.tsx` (Task 1)
- `packages/frontend/src/features/kraefte/ui/pages/KraefteDashboard.page.tsx` (Task 2, 3, 8)
- `packages/frontend/src/features/kraefte/ui/molecules/StaerkeCard.tsx` (Task 4)
- `packages/frontend/src/features/kraefte/ui/molecules/RollenKarte.tsx` (Task 6.3)
- `packages/frontend/src/features/kraefte/ui/organisms/FahrzeugStatusListe.tsx` (Task 5)
- `packages/frontend/src/features/kraefte/ui/organisms/RollenUebersicht.tsx` (Task 6)
- `packages/frontend/src/features/kraefte/api/use-einsatz-fahrzeuge.ts` (Task 5.2)
- `packages/frontend/src/features/kraefte/api/use-rollen-besetzungen.ts` (Task 6.2)
- `packages/frontend/src/features/kraefte/ui/molecules/index.ts` (Task 9.1)
- `packages/frontend/src/features/kraefte/index.ts` (Task 9.2)
- `packages/frontend/src/shared/ui/templates/SingleEinsatzLayout.tsx` (Task 10)

### Change Log

| Datum | Änderung |
|-------|----------|
| 2025-12-31 | Story 6.2 Draft erstellt via BMad create-story YOLO mit Subagents |
| 2025-12-31 | SM Agent Validation: 14/21 passed (67%), 5 kritische Issues identifiziert |
| 2025-12-31 | Story 6.2 überarbeitet: DashboardModeContext, Data-Props, Hook Options |
