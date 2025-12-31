# Story 6.2: FullScreen & Compact Modus

Status: ready-for-dev

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

---

## Acceptance Criteria

### AC1: FullScreen-Modus für Beamer

- [ ] **Given** ich bin im Dashboard
- [ ] **When** ich auf "FullScreen" klicke
- [ ] **Then** wird das Dashboard im Vollbild-Modus angezeigt (3m lesbar, NFR19)
- [ ] **And** Schriftgröße min. 32px für Stärke-Zahlen, 24px für Fahrzeugnamen

### AC2: Compact-Modus für Tablet

- [ ] **Given** ich bin im FullScreen-Modus
- [ ] **When** ich auf "Compact" klicke
- [ ] **Then** wird das Dashboard in kompakter Tablet-Ansicht angezeigt (NFR20)
- [ ] **And** Touch-Targets min. 44x44px

### AC3: Auto-Refresh alle 30s

- [ ] **Given** ich bin im FullScreen-Modus
- [ ] **When** 30 Sekunden vergehen
- [ ] **Then** wird das Dashboard automatisch aktualisiert (TanStack Query `refetchInterval: 30000`)

### AC4: Exit-Button in FullScreen

- [ ] **Given** ich bin im FullScreen-Modus
- [ ] **When** ich ESC drücke oder auf "Exit" klicke
- [ ] **Then** kehre ich zur Normal-Ansicht zurück

### AC5: Density-Modi Toggle

- [ ] **Given** ich bin im Dashboard
- [ ] **When** ich den Density-Selector nutze
- [ ] **Then** kann ich zwischen "Normal", "Compact", "FullScreen" wechseln
- [ ] **And** die Präferenz wird im localStorage gespeichert

---

## Implementation Checklist

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

```typescript
import { useNavigate } from '@tanstack/react-router';
import { FullscreenCloseButton } from '@/features/lagekarte/ui/organisms/FullscreenCloseButton';

/**
 * Story 6.2 - Dashboard Modi.
 *
 * - standard: Normales 2-spalten Grid (768px+)
 * - fullscreen: 3-Spalten, große Schrift für Beamer (3m lesbar)
 * - compact: Kompakte Darstellung für Tablets
 */
export type DashboardMode = 'standard' | 'fullscreen' | 'compact';

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

  // Alle drei Queries parallel laden (Story 6.1d Pattern)
  const staerkeQuery = useTaktischeStaerke(einsatzId, {
    // AC3: Auto-Refresh alle 30s im Fullscreen-Modus
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });
  const fahrzeugeQuery = useEinsatzFahrzeuge(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });
  const rollenQuery = useRollenBesetzungen(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Kombinierte States
  const isAnyFetching = staerkeQuery.isFetching || fahrzeugeQuery.isFetching || rollenQuery.isFetching;
  const latestUpdate = Math.max(
    staerkeQuery.dataUpdatedAt || 0,
    fahrzeugeQuery.dataUpdatedAt || 0,
    rollenQuery.dataUpdatedAt || 0
  );

  const refetchAll = () => {
    staerkeQuery.refetch();
    fahrzeugeQuery.refetch();
    rollenQuery.refetch();
  };

  // Mode Navigation Handler
  const handleModeChange = (newMode: DashboardMode) => {
    navigate({
      search: { mode: newMode },
      replace: true,
    });
  };

  const handleExitFullscreen = () => {
    navigate({
      search: { mode: 'standard' },
      replace: true,
    });
  };

  // Layout-Klassen nach Modus
  const gridClasses = {
    standard: 'grid gap-4 md:grid-cols-2 md:gap-6',
    fullscreen: 'grid gap-6 lg:grid-cols-3 xl:gap-8',
    compact: 'grid gap-2 md:grid-cols-2 md:gap-3',
  };

  return (
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
        onRefresh={refetchAll}
        lastUpdated={latestUpdate}
        isRefreshing={isAnyFetching}
        mode={mode}
        onModeChange={handleModeChange}
      />

      {/* Grid Layout nach Modus */}
      <div className={gridClasses[mode]}>
        {/* Stärke-Card */}
        <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
          {staerkeQuery.isError ? (
            <DashboardErrorCard
              title="Stärke"
              onRetry={() => staerkeQuery.refetch()}
              compact={mode === 'compact'}
            />
          ) : (
            <StaerkeCard
              einsatzId={einsatzId}
              className="h-full"
              mode={mode}
            />
          )}
        </div>

        {/* Fahrzeug-Liste */}
        <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
          {fahrzeugeQuery.isError ? (
            <DashboardErrorCard
              title="Fahrzeuge"
              onRetry={() => fahrzeugeQuery.refetch()}
              compact={mode === 'compact'}
            />
          ) : (
            <FahrzeugStatusListe
              einsatzId={einsatzId}
              className="h-full"
              mode={mode}
            />
          )}
        </div>

        {/* Rollen-Übersicht */}
        <div className={cn(
          mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-2'
        )}>
          {rollenQuery.isError ? (
            <DashboardErrorCard
              title="Rollen"
              onRetry={() => rollenQuery.refetch()}
              compact={mode === 'compact'}
            />
          ) : (
            <RollenUebersicht
              einsatzId={einsatzId}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
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

```typescript
interface StaerkeCardProps {
  einsatzId: string;
  className?: string;
  mode?: DashboardMode;
}

export function StaerkeCard({ einsatzId, className, mode = 'standard' }: StaerkeCardProps) {
  const { data, isLoading } = useTaktischeStaerke(einsatzId);

  // AC1: Große Schrift für Fullscreen (32px = text-3xl)
  const numberClasses = {
    standard: 'text-2xl font-bold',
    fullscreen: 'text-4xl font-bold lg:text-5xl',
    compact: 'text-xl font-semibold',
  };

  const labelClasses = {
    standard: 'text-xs text-gray-500',
    fullscreen: 'text-base text-gray-500 lg:text-lg',
    compact: 'text-[10px] text-gray-500',
  };

  if (isLoading) {
    return <StaerkeCardSkeleton mode={mode} />;
  }

  // Compact-Modus: Nur Gesamt anzeigen
  if (mode === 'compact') {
    return (
      <div className={cn(
        'flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3',
        'dark:border-gray-700 dark:bg-gray-800',
        className
      )}>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stärke</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          {data?.gesamt ?? 0}
        </span>
      </div>
    );
  }

  // Standard & Fullscreen: Alle Kategorien
  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm',
      'dark:border-gray-700 dark:bg-gray-800',
      mode === 'fullscreen' ? 'p-6 lg:p-8' : 'p-4',
      className
    )}>
      <h3 className={cn(
        'mb-4 font-medium text-gray-900 dark:text-gray-100',
        mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-sm'
      )}>
        Taktische Stärke
      </h3>

      <div className={cn(
        'flex items-center justify-between',
        mode === 'fullscreen' ? 'gap-8' : 'gap-4'
      )}>
        <StaerkeNumber
          value={data?.fuehrung ?? 0}
          label="Führung"
          color="blue"
          numberClass={numberClasses[mode]}
          labelClass={labelClasses[mode]}
        />
        <StaerkeNumber
          value={data?.unterfuehrung ?? 0}
          label="U-Führung"
          color="green"
          numberClass={numberClasses[mode]}
          labelClass={labelClasses[mode]}
        />
        <StaerkeNumber
          value={data?.mannschaft ?? 0}
          label="Mannschaft"
          color="gray"
          numberClass={numberClasses[mode]}
          labelClass={labelClasses[mode]}
        />
        <StaerkeNumber
          value={data?.gesamt ?? 0}
          label="Gesamt"
          color="default"
          numberClass={numberClasses[mode]}
          labelClass={labelClasses[mode]}
          bold
        />
      </div>
    </div>
  );
}

function StaerkeNumber({
  value,
  label,
  color,
  numberClass,
  labelClass,
  bold
}: {
  value: number;
  label: string;
  color: 'blue' | 'green' | 'gray' | 'default';
  numberClass: string;
  labelClass: string;
  bold?: boolean;
}) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    gray: 'text-gray-600 dark:text-gray-400',
    default: 'text-gray-900 dark:text-white',
  };

  return (
    <div className="flex flex-col items-center">
      <span className={cn(numberClass, colorClasses[color])}>
        {value}
      </span>
      <span className={labelClass}>{label}</span>
    </div>
  );
}
```

### Task 5: FahrzeugStatusListe Mode-Support

- [ ] **5.1** Erweitere: `features/kraefte/ui/organisms/FahrzeugStatusListe.tsx`

```typescript
interface FahrzeugStatusListeProps {
  einsatzId: string;
  onFahrzeugClick?: (fahrzeugId: string) => void;
  className?: string;
  mode?: DashboardMode;
}

export function FahrzeugStatusListe({
  einsatzId,
  onFahrzeugClick,
  className,
  mode = 'standard'
}: FahrzeugStatusListeProps) {
  const { data: fahrzeuge, isLoading, isError } = useEinsatzFahrzeuge(einsatzId);

  if (isLoading) {
    return <FahrzeugListeSkeleton mode={mode} />;
  }

  // Compact: Horizontale Liste mit nur Kennzeichen + Status
  if (mode === 'compact') {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white p-3',
        'dark:border-gray-700 dark:bg-gray-800',
        className
      )}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Fahrzeuge
          </span>
          <span className="text-xs text-gray-500">{fahrzeuge?.length ?? 0}</span>
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
      <h3 className={cn(
        'mb-4 font-medium text-gray-900 dark:text-gray-100',
        mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-sm'
      )}>
        Fahrzeuge ({fahrzeuge?.length ?? 0})
      </h3>

      <div className={cn(
        mode === 'fullscreen' ? 'space-y-4' : 'space-y-3'
      )}>
        {fahrzeuge?.map((fz) => (
          <FahrzeugCard
            key={fz.id}
            fahrzeug={fz}
            onClick={() => onFahrzeugClick?.(fz.id)}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact Badge für Fahrzeug (nur in Compact-Modus).
 */
function FahrzeugBadge({ fahrzeug }: { fahrzeug: EinsatzFahrzeugDto }) {
  const statusColors = {
    // FMS Status Farben
    1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', // Einsatzbereit
    2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', // Auf Anfahrt
    3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', // Am Einsatzort
    // ... weitere
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
      statusColors[fahrzeug.fmsStatus] ?? 'bg-gray-100 text-gray-800'
    )}>
      {fahrzeug.kennzeichen}
    </span>
  );
}
```

### Task 6: RollenUebersicht Mode-Support

- [ ] **6.1** Erweitere: `features/kraefte/ui/organisms/RollenUebersicht.tsx`

```typescript
interface RollenUebersichtProps {
  einsatzId: string;
  onFreigebeClick?: (rollenBesetzungId: string) => void;
  className?: string;
  mode?: DashboardMode;
}

export function RollenUebersicht({
  einsatzId,
  onFreigebeClick,
  className,
  mode = 'standard'
}: RollenUebersichtProps) {
  const { data: besetzungen, isLoading } = useRollenBesetzungen(einsatzId);

  if (isLoading) {
    return <RollenUebersichtSkeleton mode={mode} />;
  }

  // Compact: Inline-Liste statt Grid
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
          <span className="text-xs text-gray-500">{besetzungen?.length ?? 0}</span>
        </div>
        <div className="space-y-1">
          {besetzungen?.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {b.rollenName}:
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {b.personName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid Layouts nach Modus
  const gridClasses = {
    standard: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
    fullscreen: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    compact: '', // nicht verwendet
  };

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-sm',
      'dark:border-gray-700 dark:bg-gray-800',
      mode === 'fullscreen' ? 'p-6 lg:p-8' : 'p-4',
      className
    )}>
      <h3 className={cn(
        'mb-4 font-medium text-gray-900 dark:text-gray-100',
        mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-sm'
      )}>
        Rollenbesetzung ({besetzungen?.length ?? 0})
      </h3>

      <div className={gridClasses[mode]}>
        {besetzungen?.map((b) => (
          <RollenKarte
            key={b.id}
            besetzung={b}
            onFreigeben={() => onFreigebeClick?.(b.id)}
            mode={mode}
          />
        ))}
      </div>
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
│   ├── ui/
│   │   ├── molecules/
│   │   │   ├── StaerkeCard.tsx           # ERWEITERN (Task 4)
│   │   │   ├── DashboardErrorCard.tsx    # NEU (Task 7)
│   │   │   └── index.ts                  # ERWEITERN (Task 9.1)
│   │   ├── organisms/
│   │   │   ├── FahrzeugStatusListe.tsx   # ERWEITERN (Task 5)
│   │   │   └── RollenUebersicht.tsx      # ERWEITERN (Task 6)
│   │   └── pages/
│   │       └── KraefteDashboard.page.tsx # ERWEITERN (Task 2, 3, 8)
│   └── index.ts                          # ERWEITERN (Task 9.2)
├── routes/app/einsatz/$einsatzId/kräfte/
│   └── dashboard.tsx                     # ERWEITERN (Task 1)
└── shared/ui/templates/
    └── SingleEinsatzLayout.tsx           # ERWEITERN (Task 10)
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

### Warum kein localStorage für Mode?

- localStorage würde Mode global speichern (alle Einsätze)
- URL-Parameter ist Einsatz-spezifisch
- Kombination möglich: localStorage für Preference, URL für Override

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

### Warum Mode-Props statt Context?

1. **Explizit:** Jede Komponente zeigt klar ihren Mode
2. **Tree-Shaking:** Kein Context-Overhead
3. **Testing:** Einfacher zu testen mit Props

### Query Invalidation bei Mode-Wechsel

Keine Invalidation nötig - Queries bleiben gleich, nur Layout ändert sich.

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
   - Mode-Props statt Context für Explizitheit

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
   - AC5: ModeSelector im Header

### File List

**Zu erstellen:**
- `packages/frontend/src/features/kraefte/ui/molecules/DashboardErrorCard.tsx` (Task 7)

**Zu erweitern:**
- `packages/frontend/src/routes/app/einsatz/$einsatzId/kräfte/dashboard.tsx` (Task 1)
- `packages/frontend/src/features/kraefte/ui/pages/KraefteDashboard.page.tsx` (Task 2, 3, 8)
- `packages/frontend/src/features/kraefte/ui/molecules/StaerkeCard.tsx` (Task 4)
- `packages/frontend/src/features/kraefte/ui/organisms/FahrzeugStatusListe.tsx` (Task 5)
- `packages/frontend/src/features/kraefte/ui/organisms/RollenUebersicht.tsx` (Task 6)
- `packages/frontend/src/features/kraefte/ui/molecules/index.ts` (Task 9.1)
- `packages/frontend/src/features/kraefte/index.ts` (Task 9.2)
- `packages/frontend/src/shared/ui/templates/SingleEinsatzLayout.tsx` (Task 10)

### Change Log

| Datum | Änderung |
|-------|----------|
| 2025-12-31 | Story 6.2 Draft erstellt via BMad create-story YOLO mit Subagents |
