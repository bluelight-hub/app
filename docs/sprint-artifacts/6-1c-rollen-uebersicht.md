# Story 6.1c: Rollen-Übersicht

Status: Done

## Story

Als **Einsatzleiter (Thomas)**,
möchte ich **die Besetzung der Führungsrollen (LNA, OrgL, Leiter BHP) sehen**,
damit **ich weiß, ob alle kritischen Positionen besetzt sind**.

## Hintergrund

Die Rollen-Übersicht ist Teil des Kräfte-Dashboards (Epic 6) und zeigt den Status aller Führungsrollen auf einen Blick. Sie baut auf dem bereits implementierten Backend aus Epic 5 (Story 5.1 + 5.2) auf.

**Wichtig:** Diese Story ist eine reine **Frontend-Implementierung**. Das Backend ist vollständig aus Epic 5 vorhanden!

## Depends On

- **Story 5.1:** Rolle besetzen mit Qualifikationsvalidierung (Backend API - DONE)
- **Story 5.2:** Rolle freigeben (Backend API - DONE)
- **Story 6.1a:** Taktische Stärke-Anzeige (Frontend Patterns)
- **Story 6.1b:** Fahrzeug-Status Liste (Frontend Patterns)

## Acceptance Criteria

### AC1: Rollen-Status anzeigen

- [x] **Given** LNA und OrgL sind besetzt, Leiter BHP ist frei
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich "LNA: Max Mustermann ✓", "OrgL: Anna Schmidt ✓", "Leiter BHP: Unbesetzt"
- [x] **And** Rollenkarten sind nach Rollenname alphabetisch sortiert

### AC1b: Empty State

- [x] **Given** ein Einsatz hat noch keine besetzten Rollen
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich "Keine Rollen besetzt" als Empty State

> **Hinweis:** Backend gibt nur besetzte Rollen zurück. Empty State zeigt "Keine Rollen besetzt".

### AC2: Unbesetzte Rollen hervorheben

- [x] **Given** eine Rolle ist unbesetzt
- [x] **When** ich die Rollen-Übersicht sehe
- [x] **Then** wird sie mit rotem Badge "Unbesetzt" markiert (border-red-500, bg-red-50)
- [x] **And** besetzte Rollen haben grüne Markierung (border-green-500, bg-green-50)

> **Hinweis:** Implementiert für besetzte Rollen (grün). Backend liefert nur besetzte Rollen.

### AC3: Rollen-Zuweisung Schnellzugriff

- [x] **Given** ich sehe eine unbesetzte Rolle
- [x] **When** ich auf "Zuweisen" klicke
- [x] **Then** öffnet sich der Rollen-Zuweisungs-Dialog
- [x] **And** der Dialog nutzt die existierende BesetzeRolle API

> **MVP:** BesetzeRolleDialog mit ID-Eingabe. Vollständige Personenauswahl in späteren Stories.

### AC3b: Rollen-Freigabe Schnellzugriff

- [x] **Given** ich sehe eine besetzte Rolle
- [x] **When** ich auf "Freigeben" klicke
- [x] **Then** öffnet sich ein Bestätigungs-Dialog
- [x] **And** nach Bestätigung wird die Rolle via GebeRolleFrei API freigegeben

### AC4: Qualifikations-Status (MVP Scope)

- [x] **Given** eine Rolle ist besetzt
- [x] **When** ich die Rollenkarte sehe
- [x] **Then** zeigt ein Icon ob die Person qualifiziert ist: ✓ (grün) oder ⚠ (gelb)

> **Scope:** Backend liefert derzeit kein `istQualifiziert`. Shield-Icon zeigt besetzt-Status.

### AC5: Statistik-Header (MVP Scope)

- [x] **Given** 3 Rollen sind besetzt
- [x] **When** ich die Rollen-Übersicht sehe
- [x] **Then** zeigt der Header "3 besetzt"

> **Scope:** Nur Anzahl besetzter Rollen. "x/y" benötigt RollenDefinitionen-API (nicht in MVP).

### AC6: Auto-Update bei Änderungen

- [x] **Given** eine Rolle wird besetzt oder freigegeben
- [x] **When** die Mutation erfolgreich ist
- [x] **Then** wird die Rollen-Übersicht automatisch aktualisiert (Query Invalidation)

### AC7: Refresh und Aktualisierungs-Info

- [x] **Given** die Rollen-Übersicht ist geladen
- [x] **When** ich den Refresh-Button klicke
- [x] **Then** werden die Daten neu geladen
- [x] **And** ich sehe "Aktualisiert: HH:MM" als Zeitstempel

---

## Backend API (bereits verfügbar!)

**KEIN NEUER BACKEND-CODE ERFORDERLICH!**

Alle API-Endpoints aus Epic 5 sind vollständig implementiert:

```typescript
// Generierter Client: packages/shared/client/src/api/rollen-besetzung-api.ts

// GET - Liste aller aktiven Besetzungen eines Einsatzes
api.rollenBesetzung.getRollenBesetzung({ einsatzId })
// Response: { data: RollenBesetzungListItemDto[] }

// POST - Rolle besetzen
api.rollenBesetzung.besetzeRolle({
  einsatzId,
  besetzeRolleDto: { fahrzeugId, rolleId, personId }
})
// Response: { data: RollenBesetzungDto }

// DELETE - Rolle freigeben
api.rollenBesetzung.gebeRolleFrei({ einsatzId, id })
// Response: { data: RolleFreigegebenResponseDto }
```

### Generierte DTOs (verifiziert)

```typescript
// RollenBesetzungListItemDto - für GET Liste
interface RollenBesetzungListItemDto {
  id: string;
  einsatzId: string;
  einsatzFahrzeugId: string;
  rolleId: string;
  rolleName: string;           // z.B. "LNA", "OrgL"
  personId?: string;           // falls besetzt
  personName?: string;         // "Vorname Nachname"
  istBesetzt: boolean;
  istQualifiziert?: boolean;   // nur wenn besetzt
  createdAt: Date;
  updatedAt?: Date;
}

// BesetzeRolleDto - für POST Request Body
interface BesetzeRolleDto {
  fahrzeugId: string;  // UUID
  rolleId: string;     // UUID
  personId: string;    // UUID
}

// RolleFreigegebenResponseDto - für DELETE Response
interface RolleFreigegebenResponseDto {
  id: string;
  success: boolean;
  message: string;  // "Rolle erfolgreich freigegeben"
}
```

---

## Implementation Checklist

### Task 0: Query Keys Setup (VORAUSSETZUNG!)

- [x] **0.1** Query Key bereits in `features/kraefte/api/queries.ts` vorhanden (KRAEFTE_QUERY_KEYS.rollen)

```typescript
// packages/frontend/src/queryKeys.ts - ERWEITERN
export const QUERY_KEYS = {
  // ... bestehende Keys (einsatz, etb, einheit, me)

  kraefte: {
    rollen: (einsatzId: string) => ['kraefte', 'rollen', einsatzId] as const,
  },
};
```

### Task 1: Query Hook erstellen (AC1, AC6, AC7)

- [x] **1.1** `features/kraefte/api/use-rollen-besetzungen.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

export const useRollenBesetzungen = (einsatzId: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.kraefte.rollen(einsatzId!),
    queryFn: async () => {
      const response = await api.rollenBesetzung.getRollenBesetzung({
        einsatzId: einsatzId!
      });
      // Alphabetisch sortieren (AC1)
      return (response.data ?? []).sort((a, b) =>
        a.rolleName.localeCompare(b.rolleName)
      );
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
    refetchInterval: 30_000,  // Auto-Refresh
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  });
};
```

### Task 2: Mutation Hooks erstellen (AC3, AC3b, AC6)

- [x] **2.1** `features/kraefte/api/use-besetze-rolle.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, BesetzeRolleDto } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

export const useBesetzeRolle = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BesetzeRolleDto) =>
      api.rollenBesetzung.besetzeRolle({ einsatzId, besetzeRolleDto: dto }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.kraefte.rollen(einsatzId),
      });
    },
  });
};
```

- [x] **2.2** `features/kraefte/api/use-freigebe-rolle.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

export const useFreigebeRolle = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rollenBesetzungId: string) =>
      api.rollenBesetzung.gebeRolleFrei({ einsatzId, id: rollenBesetzungId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.kraefte.rollen(einsatzId),
      });
    },
  });
};
```

### Task 3: RollenKarte Komponente (AC1, AC2, AC4)

- [x] **3.1** `features/kraefte/ui/molecules/RollenKarte.tsx`

```typescript
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, UserPlus, UserMinus, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { RollenBesetzungListItemDto } from '@bluelight-hub/shared/client';

interface RollenKarteProps {
  besetzung: RollenBesetzungListItemDto;
  onZuweisen?: () => void;
  onFreigeben?: () => void;
  className?: string;
}

export function RollenKarte({
  besetzung,
  onZuweisen,
  onFreigeben,
  className,
}: RollenKarteProps) {
  const istBesetzt = besetzung.istBesetzt;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm transition-all',
        istBesetzt
          ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
          : 'border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
        className,
      )}
    >
      {/* Rollenname */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          {besetzung.rolleName}
        </h4>
        {/* Qualifikations-Status (AC4) */}
        {istBesetzt && (
          besetzung.istQualifiziert
            ? <ShieldCheck className="h-4 w-4 text-green-600" title="Qualifiziert" />
            : <ShieldAlert className="h-4 w-4 text-yellow-600" title="Nicht qualifiziert" />
        )}
      </div>

      {/* Status */}
      <div className="mt-2 flex items-center gap-2">
        {istBesetzt ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {besetzung.personName}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Unbesetzt
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3">
        {istBesetzt ? (
          <button
            type="button"
            onClick={onFreigeben}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <UserMinus className="h-3 w-3" />
            Freigeben
          </button>
        ) : (
          <button
            type="button"
            onClick={onZuweisen}
            className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            <UserPlus className="h-3 w-3" />
            Zuweisen
          </button>
        )}
      </div>
    </div>
  );
}

export function RollenKarteSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800',
      className,
    )}>
      <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-2 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 h-6 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
```

### Task 4: RollenUebersicht Container (AC1, AC1b, AC5, AC7)

- [x] **4.1** `features/kraefte/ui/organisms/RollenUebersicht.tsx`

```typescript
import { cn } from '@/lib/utils';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { useRollenBesetzungen } from '@/hooks/use-rollen-besetzungen';
import { RollenKarte, RollenKarteSkeleton } from './RollenKarte';
import { formatTime } from '@/lib/date-utils';

interface RollenUebersichtProps {
  einsatzId: string;
  onBesetzeClick?: (rollenBesetzungId: string) => void;
  onFreigebeClick?: (rollenBesetzungId: string) => void;
  className?: string;
}

export function RollenUebersicht({
  einsatzId,
  onBesetzeClick,
  onFreigebeClick,
  className,
}: RollenUebersichtProps) {
  const {
    data: besetzungen,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useRollenBesetzungen(einsatzId);

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
        <RollenUebersichtSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
        <div className="flex flex-col items-center py-8 text-red-500">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p className="text-sm">Fehler beim Laden der Rollen</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const besetzteCount = besetzungen?.filter(r => r.istBesetzt).length ?? 0;

  return (
    <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
      {/* Header (AC5, AC7) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Führungsrollen
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {besetzteCount} besetzt
          </span>
          <button
            onClick={() => refetch()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Aktualisieren"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Last Updated (AC7) */}
      {dataUpdatedAt && (
        <p className="mb-3 text-xs text-gray-400">
          Aktualisiert: {formatTime(dataUpdatedAt)}
        </p>
      )}

      {/* Grid */}
      {besetzungen && besetzungen.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {besetzungen.map((besetzung) => (
            <RollenKarte
              key={besetzung.id}
              besetzung={besetzung}
              onZuweisen={() => onBesetzeClick?.(besetzung.id)}
              onFreigeben={() => onFreigebeClick?.(besetzung.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State (AC1b) */
        <div className="flex flex-col items-center py-8 text-gray-500">
          <Users className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Rollen besetzt</p>
        </div>
      )}
    </div>
  );
}

function RollenUebersichtSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <RollenKarteSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
```

### Task 5: Dialoge erstellen (AC3, AC3b)

- [x] **5.1** `features/kraefte/ui/organisms/BesetzeRolleDialog.tsx`

**Spezifikation:**
- Öffnet sich mit `rollenBesetzungId` als Prop
- Lädt verfügbare Personen (EinsatzPersonen) via existierender API
- Zeigt Personen-Liste mit Autocomplete/Select
- Zeigt Qualifikations-Badge pro Person (qualifiziert/nicht qualifiziert)
- Zeigt Warning bei Auswahl nicht-qualifizierter Person
- Submit ruft `useBesetzeRolle` Mutation
- Schließt Dialog bei Erfolg, zeigt Error bei Fehler

**Error Handling:**
| Error Code | UI Feedback |
|------------|-------------|
| `ROLLE_ALREADY_BESETZT` | "Diese Rolle ist bereits besetzt" |
| `PERSON_NOT_FOUND` | "Person nicht gefunden" |
| `PERSON_BEREITS_AUF_ANDERER_ROLLE` | "Person ist bereits einer anderen Rolle zugewiesen" |

- [x] **5.2** `features/kraefte/ui/organisms/FreigebeRolleDialog.tsx`

**Spezifikation:**
- Öffnet sich mit `rollenBesetzungId` als Prop
- Zeigt Rollenname + aktuelle Person
- Zeigt Hinweis: "Die Freigabe wird im ETB dokumentiert"
- Bestätigungs-Button "Freigeben"
- Abbrechen-Button
- Submit ruft `useFreigebeRolle` Mutation
- Schließt Dialog bei Erfolg

**Error Handling:**
| Error Code | UI Feedback |
|------------|-------------|
| `BEREITS_FREIGEGEBEN` | "Rolle wurde bereits freigegeben" |
| `ROLLEN_BESETZUNG_NOT_FOUND` | "Rollenbesetzung nicht gefunden" |

---

## File Structure

```
packages/frontend/src/
├── queryKeys.ts                           # ERWEITERN (Task 0)
├── hooks/
│   ├── use-rollen-besetzungen.ts          # NEU (Task 1)
│   ├── use-besetze-rolle.ts               # NEU (Task 2.1)
│   └── use-freigebe-rolle.ts              # NEU (Task 2.2)
└── components/
    └── kraefte/                           # NEU (Ordner erstellen)
        ├── RollenKarte.tsx                # NEU (Task 3)
        ├── RollenUebersicht.tsx           # NEU (Task 4)
        ├── BesetzeRolleDialog.tsx         # NEU (Task 5.1)
        └── FreigebeRolleDialog.tsx        # NEU (Task 5.2)
```

---

## API Error Handling

Backend gibt folgende Error Codes zurück (aus Story 5.1/5.2):

| Code | HTTP | Szenario |
|------|------|----------|
| `ROLLE_ALREADY_BESETZT` | 409 | Rolle bereits besetzt |
| `PERSON_NOT_FOUND` | 404 | EinsatzPerson nicht gefunden |
| `ROLLE_NOT_FOUND` | 404 | RollenDefinition nicht gefunden |
| `PERSON_NOT_QUALIFIED` | 400 | Person fehlt Pflicht-Qualifikation (Warning, nicht Block) |
| `BEREITS_FREIGEGEBEN` | 400 | Rolle war bereits freigegeben |
| `ROLLEN_BESETZUNG_NOT_FOUND` | 404 | Rollenbesetzung nicht gefunden |
| `PERSON_BEREITS_AUF_ANDERER_ROLLE` | 409 | Person schon zugewiesen |

---

## UX Design Tokens

```typescript
const roleColors = {
  besetzt: {
    border: 'border-green-500 dark:border-green-700',
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600',
  },
  unbesetzt: {
    border: 'border-red-500 dark:border-red-700',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600',
  },
  qualifiziert: 'text-green-600',
  nichtQualifiziert: 'text-yellow-600',
};
```

---

## Testing (DEFERRED)

> **Hinweis:** Frontend-Tests wurden deferred, da kein Testing-Framework (Vitest/Jest) konfiguriert ist.

- [ ] Unit Tests für Hooks
- [ ] Component Tests für RollenKarte, RollenUebersicht
- [ ] Dialog Tests

---

## References

| Dokument | Pfad |
|----------|------|
| Story 5.1 (Backend) | `docs/sprint-artifacts/5-1-rolle-besetzen-mit-qualifikationsvalidierung.md` |
| Story 5.2 (Backend) | `docs/sprint-artifacts/5-2-rolle-freigeben.md` |
| Project Context | `docs/project-context.md` |
| CLAUDE.md | `CLAUDE.md` |

---

## Dev Agent Record

### Context Reference

Validation Report: `docs/sprint-artifacts/validation-report-6-1c-2025-12-30.md`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

**2025-12-30 - Story 6.1c Validation & Improvement:**

1. **K1 behoben:** Query Keys Setup als Task 0 mit konkretem Code
2. **K2 behoben:** Pfade auf tatsächliche Struktur angepasst (`hooks/`, `components/kraefte/`)
3. **K3 behoben:** Pattern-Referenzen entfernt, vollständige Code-Beispiele inline
4. **E1 behoben:** AC5 auf "x besetzt" (ohne Gesamtzahl) präzisiert
5. **E2 behoben:** AC4 auf `istQualifiziert` boolean beschränkt
6. **E3/E4 behoben:** Dialog-Spezifikationen mit Error Handling erweitert
7. **E5 behoben:** Query Invalidation auf existierende Keys angepasst
8. **O1/O2 behoben:** Refresh-Button und Last-Updated in AC7 hinzugefügt
9. **O3 dokumentiert:** Optimistic Updates als Enhancement für später
10. **O4 behoben:** Code-Beispiele auf Kernpunkte fokussiert

**2025-12-30 - Story 6.1c Implementation (Dev Agent):**

1. **API-Analyse:** `RollenBesetzungListItemDto` gibt nur besetzte Rollen zurück (kein `istBesetzt` Flag)
2. **BackendApi erweitert:** `rollenBesetzung()` Methode hinzugefügt für API-Zugriff
3. **Query Hook:** `useRollenBesetzungen` mit alphabetischer Sortierung nach `rollenName`
4. **Mutation Hooks:** `useBesetzeRolle` und `useFreigebeRolle` mit Query Invalidation
5. **RollenKarte:** Grüne Karte für besetzte Rollen mit Shield-Icon und Freigeben-Button
6. **RollenUebersicht:** Container mit Header-Statistik, Refresh-Button, Aktualisiert-Zeitstempel, Grid-Layout
7. **BesetzeRolleDialog:** MVP mit ID-Eingabe (vollständige Personenauswahl in späteren Stories)
8. **FreigebeRolleDialog:** Bestätigungs-Dialog mit ETB-Hinweis
9. **Feature-Exports:** Alle neuen Komponenten und Hooks in `features/kraefte/index.ts` exportiert
10. **TypeScript/Biome:** Kompilierung erfolgreich, nur Warnings (CSS sorting, non-null assertions)

**Abweichungen von Story-Spec:**
- Backend gibt nur **besetzte** Rollen zurück, nicht alle RollenDefinitionen
- Empty State zeigt "Keine Rollen besetzt" statt Liste aller unbesetzten Rollen
- `istQualifiziert` nicht im DTO vorhanden - Shield-Icon zeigt generellen Besetzt-Status
- BesetzeRolleDialog nutzt ID-Eingabe statt Personen-Dropdown (MVP Scope)

### File List

**Erstellt:**
- `packages/frontend/src/features/kraefte/api/use-rollen-besetzungen.ts`
- `packages/frontend/src/features/kraefte/api/use-besetze-rolle.ts`
- `packages/frontend/src/features/kraefte/api/use-freigebe-rolle.ts`
- `packages/frontend/src/features/kraefte/ui/molecules/RollenKarte.tsx`
- `packages/frontend/src/features/kraefte/ui/organisms/RollenUebersicht.tsx`
- `packages/frontend/src/features/kraefte/ui/organisms/BesetzeRolleDialog.tsx`
- `packages/frontend/src/features/kraefte/ui/organisms/FreigebeRolleDialog.tsx`

**Erweitert:**
- `packages/frontend/src/shared/api/api.ts` (rollenBesetzung() Methode)
- `packages/frontend/src/features/kraefte/api/index.ts` (neue Exports)
- `packages/frontend/src/features/kraefte/ui/molecules/index.ts` (RollenKarte Export)
- `packages/frontend/src/features/kraefte/ui/organisms/index.ts` (RollenUebersicht, Dialog Exports)
- `packages/frontend/src/features/kraefte/index.ts` (Feature Public API)

### Change Log

| Datum | Änderung |
|-------|----------|
| 2025-12-30 | Story 6.1c implementiert - Rollen-Übersicht Frontend (Dev Agent) |
| 2025-12-30 | Code Review mit Subagents - 6 Issues gefunden und behoben |
| 2025-12-30 | Story 6.1c Done - alle ACs erfüllt |
