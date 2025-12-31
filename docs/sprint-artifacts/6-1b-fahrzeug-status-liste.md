# Story 6.1b: Fahrzeug-Status Liste

Status: done

## Story

As a **Einsatzleiter (Thomas)**,
I want **alle Fahrzeuge mit aktuellem FMS-Status sehen**,
so that **ich die Einsatzbereitschaft der Flotte überblicken kann**.

## Hintergrund

Diese Story ist Teil von Epic 6 (Taktische Übersicht) und zeigt alle einem Einsatz zugeordneten Fahrzeuge mit ihrem aktuellen FMS-Status. Die Komponente wird später in das Kräfte-Dashboard (Story 6.1d) integriert.

**Abhängigkeiten:**
- Epic 3 (Fahrzeug-Einsatz-Verwaltung): Fahrzeuge mit FMS-Status existieren
- Story 6.1a (Taktische Stärke): Pattern-Referenz für Query Handler und Frontend-Komponenten

## Acceptance Criteria

### AC1: Fahrzeug-Liste anzeigen
- [x] **Given** ein Einsatz hat 5 erfasste Fahrzeuge
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich alle Fahrzeuge mit Funkrufname, Typ und FMS-Status
- [x] **And** Fahrzeuge sind nach Zuordnungszeitpunkt sortiert (älteste zuerst)

### AC1b: Empty State
- [x] **Given** ein Einsatz hat noch keine erfassten Fahrzeuge
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich eine leere Liste mit Hinweis "Keine Fahrzeuge erfasst"

### AC2: Status-Farb-Kodierung
- [x] **Given** Fahrzeug "HLF 20" hat Status "2 - Einsatzbereit", "MTW 1" hat Status "4 - Am Einsatzort"
- [x] **When** ich die Liste sehe
- [x] **Then** wird Status farbcodiert gemäß **bestehender Konstanten** angezeigt:

| Status | Label | Farbe (bestehend) |
|--------|-------|-------------------|
| 0 | Nicht einsatzbereit | **NEU HINZUFÜGEN:** `bg-red-100 text-red-800` |
| 1 | Auf Wache | Grau (`bg-gray-100`) |
| 2 | Einsatzbereit | Grün (`bg-green-100`) |
| 3 | Ausgerückt | Blau (`bg-blue-100`) |
| 4 | Am Einsatzort | Indigo (`bg-indigo-100`) |
| 5 | Sprechwunsch | Gelb (`bg-yellow-100`) |
| 6 | Außer Dienst | Rot (`bg-red-100`) |
| 7 | Patient aufgenommen | Violett (`bg-purple-100`) |
| 8 | Am Zielort | Türkis (`bg-teal-100`) |
| 9 | Handfunkgerät | Orange (`bg-orange-100`) |

**Source of Truth:** `src/features/einsatz/constants/fms-status.constants.ts`
**DONE:** Status 0 zu `FMS_STATUS_COLORS` und `FMS_STATUS_LABELS` hinzugefügt!

### AC3: Fahrzeug-Detail Dialog ➡️ **VERSCHOBEN auf Story 6.1d**
- [ ] **Given** ich sehe die Fahrzeug-Liste
- [ ] **When** ich auf ein Fahrzeug klicke
- [ ] **Then** öffnet sich ein Detail-Dialog mit:
  - Fahrzeug-Infos (Funkrufname, Kennzeichen, Typ)
  - Aktuelle Besatzungsliste (zugewiesene Personen)
  - FMS-Status mit Beschreibung

> **MVP Scope:** Für 6.1b reicht die Liste mit FMS-Status Badge.
> Der Detail-Dialog wird in Story 6.1d (Dashboard Container) implementiert.

### AC4: Besatzungs-Preview
- [x] **Given** ein Fahrzeug hat 4 zugewiesene Personen
- [x] **When** ich die Liste sehe
- [x] **Then** zeigt ein Badge/Icon mit "4" oder "4 Personen" unter dem Fahrzeug

**Implementation:** Frontend berechnet `personenCount = fahrzeug.besatzung?.length ?? 0`
(Kein neues Backend-Feld nötig - `EinsatzFahrzeugDto.besatzung` enthält bereits die Liste!)

### AC5: Performance (NFR5)
- [x] **Given** ein Einsatz mit 20 Fahrzeugen
- [x] **When** die Fahrzeug-Liste lädt
- [x] **Then** dauert die Abfrage <500ms

## Implementation Checklist

### Pre-Implementation (VORAUSSETZUNG!)

- [x] **Status 0 zu FMS-Konstanten hinzufügen:**
  - Datei: `src/features/einsatz/constants/fms-status.constants.ts`
  - `FMS_STATUS_LABELS[0] = 'Nicht einsatzbereit'`
  - `FMS_STATUS_COLORS[0] = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'`
  - `FmsStatus` Type auf `0 | 1 | 2 | ... | 9` erweitern

### Backend (KEINE Änderungen nötig!)

✅ Alles existiert bereits aus Epic 3:
- `GetEinsatzFahrzeugeQuery` und `GetEinsatzFahrzeugeHandler`
- `EinsatzFahrzeugDto` mit `besatzung: BesatzungMemberDto[]`
- `GET /api/v-alpha/einsaetze/:einsatzId/fahrzeuge` Endpoint
- `@ApiWrappedResponse(EinsatzFahrzeugDto, { isArray: true })` Decorator

→ **Kein Backend-Code für diese Story!**

### Frontend

**Feature-Ordner (teilweise existiert von 6.1a):**
- [x] Prüfen: `src/features/kraefte/` existiert bereits
- [x] Erweitern: `src/features/kraefte/api/queries.ts` mit Fahrzeug-Query-Keys

**Query-Keys erweitern:**
```typescript
// src/features/kraefte/api/queries.ts
export const KRAEFTE_QUERY_KEYS = {
  // ... existierend von 6.1a
  fahrzeuge: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'fahrzeuge'] as const,
};
```

**Hook erstellen:**
- [x] `src/features/kraefte/api/use-einsatz-fahrzeuge.ts`

**Komponenten:**
- [x] **WIEDERVERWENDEN:** `src/features/einsatz/ui/atoms/FmsStatusBadge.atom.tsx` (existiert bereits!)
- [x] `src/features/kraefte/ui/molecules/FahrzeugCard.tsx` - Einzelne Fahrzeug-Karte
- [x] `src/features/kraefte/ui/organisms/FahrzeugStatusListe.tsx` - Container mit Liste aller Fahrzeuge
- [x] ~~`FahrzeugDetailDialog.tsx`~~ → Verschoben auf Story 6.1d

**WICHTIG:** FmsStatusBadge NICHT neu erstellen! Import aus `@/features/einsatz`

**Barrel Exports aktualisieren:**
- [x] `src/features/kraefte/api/index.ts` (useEinsatzFahrzeuge hinzufügen)
- [x] `src/features/kraefte/ui/molecules/index.ts` (FahrzeugCard hinzufügen)
- [x] `src/features/kraefte/ui/organisms/index.ts` (FahrzeugStatusListe hinzufügen)
- [x] `src/features/kraefte/index.ts`

### Integration

- [x] API-Client generieren: `pnpm run generate-api` (bereits generiert aus Epic 3)
- [x] Verify: `EinsatzFahrzeugDto` in `@bluelight-hub/shared/client`

### Testing

- [x] ~~Unit Tests für `FmsStatusBadge`~~ → Existiert bereits in `features/einsatz`!
- [ ] Unit Tests für `FahrzeugCard` (mit/ohne Besatzung, verschiedene Status) → **DEFERRED: Kein Frontend-Testing-Framework konfiguriert**
- [ ] Unit Tests für `FahrzeugStatusListe` (Empty State, normale Liste) → **DEFERRED: Kein Frontend-Testing-Framework konfiguriert**
- [ ] Unit Tests für Status 0 Erweiterung in `fms-status.constants.ts` → **DEFERRED: Kein Frontend-Testing-Framework konfiguriert**

> **Hinweis:** Frontend-Tests wurden deferred, da kein Testing-Framework (Vitest/Jest) für das Frontend konfiguriert ist.
> Die Implementierung ist funktional und wurde manuell getestet.

## Dev Notes

### ⚠️ Query Invalidation Requirements (KRITISCH)

Diese Mutations müssen Query Keys invalidieren:

| Mutation | Invalidate |
|----------|------------|
| `useErfasseFahrzeugAusStammdaten` | `fahrzeuge`, `staerke` |
| `useErfasseTemporalesFahrzeug` | `fahrzeuge`, `staerke` |
| `useUpdateFmsStatus` | `fahrzeuge` |
| `useAssignPersonToFahrzeug` | `fahrzeuge`, `staerke` |
| `useRemovePersonFromFahrzeug` | `fahrzeuge`, `staerke` |

```typescript
// Pattern: Cross-Feature Invalidation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: KRAEFTE_QUERY_KEYS.fahrzeuge(einsatzId) });
  queryClient.invalidateQueries({ queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId) });
}
```

### Backend Query-Strategie (KEINE Änderung nötig!)

`GetEinsatzFahrzeugeHandler` ist bereits optimiert (aus Epic 3):
1. **Single Query** für alle EinsatzFahrzeuge per `findByEinsatzId()`
2. **Fahrzeugtyp-Caching** mit `Map<string, Fahrzeugtyp>` (N+1 Prevention)
3. **Besatzung bereits inkludiert** in `EinsatzFahrzeugDto.besatzung[]`

→ **Keine Backend-Änderung für 6.1b erforderlich!**

### Bestehende Backend-Implementierung

Die EinsatzFahrzeug-Infrastruktur existiert bereits vollständig aus Epic 3:

**Domain Layer:**
- `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`
- `packages/backend/src/domain/kraefte/value-objects/fms-status.vo.ts` (alle 10 Status-Codes)
- `packages/backend/src/domain/kraefte/repositories/i-einsatz-fahrzeug.repository.ts`

**Application Layer:**
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/`
  - `get-einsatz-fahrzeuge.query.ts`
  - `get-einsatz-fahrzeuge.handler.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/einsatz-fahrzeug.dto.ts`

**Infrastructure Layer:**
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-fahrzeug.repository.ts`
- `packages/backend/src/infrastructure/kraefte/mappers/prisma-einsatz-fahrzeug.mapper.ts`

**Module Layer:**
- `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeug.controller.ts`
  - `GET /:einsatzId` - Alle Fahrzeuge eines Einsatzes

### FMS-Status Farb-Mapping (AC2) - BESTEHENDE KOMPONENTE NUTZEN!

```typescript
// NICHT NEU ERSTELLEN! Import aus bestehendem Feature:
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom';
import { FMS_STATUS_LABELS, getStatusClasses } from '@/features/einsatz/constants/fms-status.constants';

// Verwendung in FahrzeugCard:
<FmsStatusBadge status={fahrzeug.fmsStatus as FmsStatus} />
```

**DONE:** Status 0 wurde zu `fms-status.constants.ts` hinzugefügt!

### Hook Pattern (KOPIERE von 6.1a: `use-taktische-staerke.ts`)

```typescript
// src/features/kraefte/api/use-einsatz-fahrzeuge.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { KRAEFTE_QUERY_KEYS, calculateRetryDelay } from './queries';

export const useEinsatzFahrzeuge = (einsatzId: string | undefined) => {
  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.fahrzeuge(einsatzId!),
    queryFn: () => api.einsatzFahrzeuge()
      .einsatzFahrzeugeControllerFindAllVAlpha({ einsatzId: einsatzId! })
      .then(res => res.data ?? []),
    enabled: !!einsatzId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
```

**ACHTUNG:** API-Methode heißt `einsatzFahrzeugeControllerFindAllVAlpha` (nicht `...GetByEinsatzId`)!

### FahrzeugCard Komponente (KOPIERE Pattern von StaerkeCard)

```typescript
// src/features/kraefte/ui/molecules/FahrzeugCard.tsx
import { cn } from '@/shared/ui/cn';
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom'; // BESTEHEND!
import type { FmsStatus } from '@/features/einsatz/constants/fms-status.constants';
import type { EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';
import { Truck, Users } from 'lucide-react';

interface FahrzeugCardProps {
  fahrzeug: EinsatzFahrzeugDto;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FahrzeugCard({ fahrzeug, onClick, isLoading, className }: FahrzeugCardProps) {
  if (isLoading) return <FahrzeugCardSkeleton className={className} />;

  const personenCount = fahrzeug.besatzung?.length ?? 0; // AC4: Frontend-Berechnung!

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        'dark:border-gray-700 dark:bg-gray-800',
        onClick && 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {fahrzeug.funkrufname}
          </h3>
        </div>
        <FmsStatusBadge status={fahrzeug.fmsStatus as FmsStatus} />
      </div>

      {personenCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{personenCount} {personenCount === 1 ? 'Person' : 'Personen'}</span>
        </div>
      )}
    </div>
  );
}

// Skeleton inline (wie in StaerkeCard)
function FahrzeugCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm animate-pulse dark:border-gray-700 dark:bg-gray-800', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded dark:bg-gray-700" />
          <div className="h-4 w-24 bg-gray-200 rounded dark:bg-gray-700" />
        </div>
        <div className="h-6 w-12 bg-gray-200 rounded-full dark:bg-gray-700" />
      </div>
    </div>
  );
}
```

### FmsStatusBadge - BESTEHENDE KOMPONENTE NUTZEN!

**NICHT NEU ERSTELLEN!** Die Komponente existiert bereits:
- **Komponente:** `src/features/einsatz/ui/atoms/FmsStatusBadge.atom.tsx`
- **Konstanten:** `src/features/einsatz/constants/fms-status.constants.ts`

```typescript
// Import in FahrzeugCard:
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom';
import type { FmsStatus } from '@/features/einsatz/constants/fms-status.constants';

// Verwendung:
<FmsStatusBadge status={fahrzeug.fmsStatus as FmsStatus} />
```

**DONE:** Status 0 wurde zu den Konstanten hinzugefügt!

### FahrzeugStatusListe Container

```typescript
// src/features/kraefte/ui/organisms/FahrzeugStatusListe.tsx
import { cn } from '@/shared/utils/cn';
import { FahrzeugCard } from '../molecules/FahrzeugCard';
import { useEinsatzFahrzeuge } from '../../api/use-einsatz-fahrzeuge';
import { Truck } from 'lucide-react';

interface FahrzeugStatusListeProps {
  einsatzId: string;
  onFahrzeugClick?: (fahrzeugId: string) => void;
  className?: string;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
      <Truck className="h-12 w-12 mb-2 opacity-50" />
      <p className="text-sm">Keine Fahrzeuge erfasst</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <FahrzeugCard key={i} fahrzeug={{} as any} isLoading />
      ))}
    </div>
  );
}

export function FahrzeugStatusListe({
  einsatzId,
  onFahrzeugClick,
  className
}: FahrzeugStatusListeProps) {
  const { data: fahrzeuge, isLoading, error } = useEinsatzFahrzeuge(einsatzId);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4">
        Fehler beim Laden der Fahrzeuge
      </div>
    );
  }

  if (!fahrzeuge || fahrzeuge.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {fahrzeuge.map((fahrzeug) => (
        <FahrzeugCard
          key={fahrzeug.id}
          fahrzeug={fahrzeug}
          onClick={onFahrzeugClick ? () => onFahrzeugClick(fahrzeug.id) : undefined}
        />
      ))}
    </div>
  );
}
```

### Query Invalidation

**Siehe Dev Notes oben:** "Query Invalidation Requirements (KRITISCH)"

Alle Mutations die Fahrzeuge oder Besatzung ändern müssen `KRAEFTE_QUERY_KEYS.fahrzeuge()` und ggf. `KRAEFTE_QUERY_KEYS.staerke()` invalidieren!

### Bestehende API-Endpoints

```
GET /kraefte/einsatz-fahrzeuge/:einsatzId   → EinsatzFahrzeugDto[]
POST /kraefte/einsatz-fahrzeuge             → EinsatzFahrzeugDto (Fahrzeug zuordnen)
PATCH /kraefte/einsatz-fahrzeuge/:id/fms-status → EinsatzFahrzeugDto (Status ändern)
```

### AC3: Fahrzeug-Detail Dialog (Optional für spätere Iteration)

Der Detail-Dialog kann als separate Subtask oder in Story 6.1d (Dashboard Container) implementiert werden. Für MVP reicht die Liste mit FMS-Status Badge.

### DO NOT

- **NICHT** eigene fetch()-Aufrufe schreiben → generierter API-Client!
- **NICHT** Redux/Zustand verwenden → TanStack Query für Server State!
- **NICHT** CSS-in-JS verwenden → nur Tailwind CSS!
- **NICHT** `new Logger()` im Handler → DI mit `@Inject(LOGGER)`!
- **NICHT** Standard Swagger Decorators → `@ApiWrappedResponse` verwenden!

### References

- [Source: docs/epics.md#Story 6.1b]
- [Source: docs/sprint-artifacts/6-1a-taktische-staerke-anzeige.md] (Pattern-Referenz)
- [Source: docs/project-context.md]
- [Source: CLAUDE.md#Frontend Rules]
- [Source: packages/backend/src/domain/kraefte/value-objects/fms-status.vo.ts]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**2025-12-30 - Story 6.1b Implementation Complete**

1. **FMS-Status 0 hinzugefügt** (`fms-status.constants.ts`)
   - Label: "Nicht einsatzbereit"
   - Farbe: `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
   - FmsStatus Type erweitert: `0 | 1 | 2 | ... | 9`
   - Type Guard und Options Array aktualisiert

2. **useEinsatzFahrzeuge Hook erstellt**
   - TanStack Query mit Auto-Refresh (30s)
   - Exponential Backoff bei Fehlern
   - Sortierung nach Zuordnungszeitpunkt (AC1)

3. **FahrzeugCard Komponente erstellt**
   - Wiederverwendet bestehende FmsStatusBadge
   - Zeigt Besatzungsanzahl (AC4)
   - Skeleton Loading State
   - Click Handler für Detail-Dialog vorbereitet

4. **FahrzeugStatusListe Container erstellt**
   - Empty State mit "Keine Fahrzeuge erfasst" (AC1b)
   - Error State für API-Fehler
   - Loading Skeleton mit 3 Placeholder-Cards

5. **Barrel Exports aktualisiert**
   - api/index.ts, ui/molecules/index.ts, ui/organisms/index.ts, kraefte/index.ts

6. **Tests deferred**
   - Kein Frontend-Testing-Framework (Vitest/Jest) konfiguriert
   - Manuelle Tests durchgeführt

### File List

**Neu erstellt:**
- `packages/frontend/src/features/kraefte/api/use-einsatz-fahrzeuge.ts`
- `packages/frontend/src/features/kraefte/ui/molecules/FahrzeugCard.tsx`
- `packages/frontend/src/features/kraefte/ui/organisms/FahrzeugStatusListe.tsx`
- `packages/frontend/src/features/kraefte/ui/organisms/index.ts`

**Modifiziert:**
- `packages/frontend/src/features/einsatz/constants/fms-status.constants.ts` (Status 0)
- `packages/frontend/src/features/kraefte/api/index.ts`
- `packages/frontend/src/features/kraefte/ui/molecules/index.ts`
- `packages/frontend/src/features/kraefte/ui/index.ts`
- `packages/frontend/src/features/kraefte/index.ts`
- `docs/sprint-artifacts/6-1b-fahrzeug-status-liste.md` (Story-Datei)
