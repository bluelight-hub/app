# Story 6.1a: Taktische Stärke-Anzeige

Status: done

## Story

As a **Einsatzleiter (Thomas)**,
I want **die taktische Stärke (Führung/Unterführung/Mannschaft/Gesamt) zu sehen**,
so that **ich schnell die verfügbare Kapazität einschätzen kann**.

## Hintergrund

Die Taktische Stärke ist eine Kernfunktion des Kräfte-Management-Moduls. Sie zeigt dem Einsatzleiter auf einen Blick:
- **Führung:** Ärzte, Leitende Notärzte, Organisatorische Leiter
- **Unterführung:** Gruppenführer, Zugführer
- **Mannschaft:** Rettungshelfer, Sanitäter, sonstige Helfer
- **Gesamt:** Summe aller eingesetzten Kräfte

Format: `Führung/Unterführung/Mannschaft/Gesamt` (z.B. "2/4/18/24")

## Acceptance Criteria

### AC1: Stärke-Berechnung
- [x] **Given** ein Einsatz hat 3 Fahrzeuge mit insgesamt 12 Personen (davon 3 Führer, 1 Unterführer, 8 Helfer)
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich "3/1/8/12" (Führung/Unterführung/Mannschaft/Gesamt)
- [x] **And** Berechnung dauert <500ms (NFR5)

### AC1b: Empty State
- [x] **Given** ein Einsatz hat noch keine registrierten Personen
- [x] **When** ich das Dashboard öffne
- [x] **Then** sehe ich "0/0/0/0" (alle Kategorien auf Null)

### AC2: Stärke-Card Design
- [x] **Given** ich bin auf dem Dashboard
- [x] **When** ich die Stärke-Card sehe
- [x] **Then** sind die Zahlen prominent dargestellt (min. 24px font)
- [x] **And** Kategorien sind farblich unterschieden:
  - Führung = Blau (`text-blue-600`)
  - Unterführung = Grün (`text-green-600`)
  - Mannschaft = Grau (`text-gray-600`)
  - Gesamt = Schwarz/Bold

### AC3: Auto-Update bei Änderungen
- [x] **Given** eine Person wird einem Fahrzeug zugewiesen
- [x] **When** die Mutation erfolgreich ist
- [x] **Then** wird die Stärke automatisch neu berechnet (Query Invalidation)

### AC4: Kategorisierung nach Funktion
- [x] **Given** eine Person hat Qualifikation "Rettungssanitäter" aber Funktion "Gruppenführer"
- [x] **When** die Stärke berechnet wird
- [x] **Then** wird sie als Unterführung gezählt (Funktion > Qualifikation)

### AC5: Ärzte als Führung
- [x] **Given** eine Person hat Qualifikation "Arzt" oder "Notarzt"
- [x] **When** die Stärke berechnet wird
- [x] **Then** wird sie zur Kategorie "Führung" gezählt

## Implementation Checklist

### Backend
- [x] Query erstellen: `src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.query.ts`
- [x] Handler erstellen: `get-taktische-staerke.handler.ts` mit Kategorisierungslogik
- [x] DTO erstellen: `TaktischeStaerkeDto { fuehrung, unterfuehrung, mannschaft, gesamt }`
- [x] Eager-Loading für Qualifikationen (N+1 Prevention) - 2-Query-Ansatz
- [x] Handler registrieren in `einsatz-personen-application.module.ts`
- [x] Controller Endpoint: `GET /einsaetze/{einsatzId}/kraefte/staerke`
- [x] OpenAPI Decorator: `@ApiOkResponse({ type: TaktischeStaerkeDto })`
- [x] Unit Tests schreiben (20 Tests: AC1, AC1b, AC4, AC5 Szenarien)

### Frontend
- [x] Feature-Ordner anlegen: `src/features/kraefte/`
- [x] Query-Keys definieren: `src/features/kraefte/api/queries.ts`
- [x] Hook erstellen: `src/features/kraefte/api/use-taktische-staerke.ts`
- [x] Komponente erstellen: `src/features/kraefte/ui/molecules/StaerkeCard.tsx`
- [x] Skeleton Loading State implementieren
- [x] Query Invalidation in Person-Mutations hinzufügen
- [x] Barrel Export: `src/features/kraefte/index.ts`

### Integration
- [x] API-Client generieren: `pnpm run generate-api`
- [x] Verify: `TaktischeStaerkeDto` in `@bluelight-hub/shared/client`

## Dev Notes

### Kategorisierungs-Logik

**Priorität:** Funktion > Qualifikation

| Kategorie | Funktion-Match (Regex) | Qualifikation-Match |
|-----------|------------------------|---------------------|
| **Führung** | `/Leiter\|LNA\|OrgL\|Zugführer/i` | `/Arzt\|Notarzt/` |
| **Unterführung** | `/Gruppenführer\|GF\|Truppführer/i` | - |
| **Mannschaft** | (default) | (default) |

### Backend Handler (vollständig)

```typescript
// src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.handler.ts
import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { GetTaktischeStaerkeQuery } from './get-taktische-staerke.query';
import { TaktischeStaerkeDto } from '../../dto/taktische-staerke.dto';

@Injectable()
export class GetTaktischeStaerkeHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetTaktischeStaerkeQuery): Promise<Result<TaktischeStaerkeDto>> {
    this.logger.log(`Berechne taktische Stärke für Einsatz ${query.einsatzId}`);

    // Eager-Loading: Personen MIT Qualifikationen laden (N+1 Prevention)
    const persons = await this.personRepository.findByEinsatzIdWithQualifikationen(
      query.einsatzId
    );

    // Empty State: Kein Einsatz oder keine Personen
    if (!persons || persons.length === 0) {
      return Result.ok({ fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 });
    }

    const counts = this.categorize(persons);
    return Result.ok(counts);
  }

  private categorize(persons: EinsatzPerson[]): TaktischeStaerkeDto {
    let fuehrung = 0;
    let unterfuehrung = 0;
    let mannschaft = 0;

    for (const person of persons) {
      // 1. Funktion-basiert (höchste Priorität)
      if (/Leiter|LNA|OrgL|Zugführer/i.test(person.funktion)) {
        fuehrung++;
        continue;
      }
      if (/Gruppenführer|GF|Truppführer/i.test(person.funktion)) {
        unterfuehrung++;
        continue;
      }

      // 2. Qualifikation-basiert (Arzt-Override)
      const hasArztQualifikation = person.qualifikationen?.some(
        (q) => /Arzt|Notarzt/.test(q.name)
      );
      if (hasArztQualifikation) {
        fuehrung++;
        continue;
      }

      // 3. Default: Mannschaft
      mannschaft++;
    }

    return {
      fuehrung,
      unterfuehrung,
      mannschaft,
      gesamt: fuehrung + unterfuehrung + mannschaft,
    };
  }
}
```

### N+1 Query Prevention (Performance NFR5)

Repository-Methode mit Eager-Loading:
```typescript
// In PrismaEinsatzPersonRepository
async findByEinsatzIdWithQualifikationen(einsatzId: string): Promise<EinsatzPerson[]> {
  const records = await this.prisma.einsatzPerson.findMany({
    where: { einsatzId },
    include: {
      qualifikationen: {
        include: { qualifikation: true }  // Eager-load Qualifikation-Details
      }
    }
  });
  return records.map(EinsatzPersonMapper.toDomain);
}
```

**Performance-Ziel:** 1 Query statt N+1 Queries → garantiert <500ms

### Handler Module Registration

```typescript
// packages/backend/src/application/kraefte/kraefte-application.module.ts
import { GetTaktischeStaerkeHandler } from './queries/get-taktische-staerke/get-taktische-staerke.handler';

@Module({
  providers: [
    // ... existing handlers
    GetTaktischeStaerkeHandler,  // NEU: hier registrieren
  ],
  exports: [
    // ... existing exports
    GetTaktischeStaerkeHandler,
  ],
})
export class KraefteApplicationModule {}
```

### Unit Test Template

```typescript
// get-taktische-staerke.handler.spec.ts
import { GetTaktischeStaerkeHandler } from './get-taktische-staerke.handler';
import { GetTaktischeStaerkeQuery } from './get-taktische-staerke.query';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('GetTaktischeStaerkeHandler', () => {
  let handler: GetTaktischeStaerkeHandler;
  let mockRepository: jest.Mocked<IEinsatzPersonRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  const createMockPerson = (overrides: Partial<EinsatzPerson> = {}) => ({
    id: 'person-1',
    funktion: 'Helfer',
    qualifikationen: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findByEinsatzIdWithQualifikationen: jest.fn(),
    } as unknown as jest.Mocked<IEinsatzPersonRepository>;

    mockLogger = { log: jest.fn(), error: jest.fn() } as unknown as jest.Mocked<ILogger>;

    handler = new GetTaktischeStaerkeHandler(mockRepository, mockLogger);
  });

  describe('AC1: Stärke-Berechnung', () => {
    it('should calculate 3/1/8/12 for mixed personnel', async () => {
      // Given
      const persons = [
        createMockPerson({ funktion: 'Einsatzleiter' }),  // Führung
        createMockPerson({ funktion: 'LNA' }),            // Führung
        createMockPerson({ funktion: 'OrgL' }),           // Führung
        createMockPerson({ funktion: 'Gruppenführer' }),  // Unterführung
        ...Array(8).fill(null).map(() => createMockPerson({ funktion: 'Helfer' })),
      ];
      mockRepository.findByEinsatzIdWithQualifikationen.mockResolvedValue(persons);

      const query = GetTaktischeStaerkeQuery.create({ einsatzId: 'test-123' });

      // When
      const result = await handler.execute(query.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        fuehrung: 3,
        unterfuehrung: 1,
        mannschaft: 8,
        gesamt: 12,
      });
    });
  });

  describe('AC1b: Empty State', () => {
    it('should return 0/0/0/0 when no persons exist', async () => {
      // Given
      mockRepository.findByEinsatzIdWithQualifikationen.mockResolvedValue([]);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.value).toEqual({
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 0,
        gesamt: 0,
      });
    });
  });

  describe('AC4: Funktion > Qualifikation', () => {
    it('should count Gruppenführer as Unterführung despite Sanitäter qualification', async () => {
      // Given
      const person = createMockPerson({
        funktion: 'Gruppenführer',
        qualifikationen: [{ name: 'Rettungssanitäter' }],
      });
      mockRepository.findByEinsatzIdWithQualifikationen.mockResolvedValue([person]);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.value.unterfuehrung).toBe(1);
      expect(result.value.mannschaft).toBe(0);
    });
  });

  describe('AC5: Arzt → Führung', () => {
    it('should count person with Arzt qualification as Führung', async () => {
      // Given
      const person = createMockPerson({
        funktion: 'Helfer',
        qualifikationen: [{ name: 'Arzt' }],
      });
      mockRepository.findByEinsatzIdWithQualifikationen.mockResolvedValue([person]);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.value.fuehrung).toBe(1);
      expect(result.value.mannschaft).toBe(0);
    });
  });
});
```

### Frontend-Patterns

**Feature-Struktur (Atomic Design + TanStack):**
```
src/features/kraefte/
├── api/
│   ├── queries.ts                    # Query Keys
│   └── use-taktische-staerke.ts      # TanStack Query Hook
├── ui/
│   └── molecules/
│       └── StaerkeCard.tsx           # Card Komponente
└── index.ts                          # Barrel Export
```

**Query Keys:**
```typescript
// src/features/kraefte/api/queries.ts
export const KRAEFTE_QUERY_KEYS = {
  all: ['kraefte'] as const,
  byEinsatz: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.all, einsatzId] as const,
  staerke: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'staerke'] as const,
  fahrzeuge: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'fahrzeuge'] as const,
  personen: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'personen'] as const,
  rollen: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'rollen'] as const,
};
```

**Hook:**
```typescript
// src/features/kraefte/api/use-taktische-staerke.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { KRAEFTE_QUERY_KEYS } from './queries';

export const useTaktischeStaerke = (einsatzId: string | undefined) => {
  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId!),
    queryFn: () => api.kraefte().getTaktischeStaerkeVAlpha({ einsatzId: einsatzId! }),
    enabled: !!einsatzId,
    staleTime: 30_000,
    refetchInterval: 30_000, // Auto-Refresh für Dashboard (AC3)
  });
};
```

**StaerkeCard Komponente:**
```typescript
// src/features/kraefte/ui/molecules/StaerkeCard.tsx
import { Card, Heading, Text } from '@/shared/ui/atoms';
import { cn } from '@/shared/ui/cn';

interface StaerkeCardProps {
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  gesamt: number;
  isLoading?: boolean;
}

function StaerkeCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
      <div className="flex justify-between items-center gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-10 mx-auto mb-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StaerkeCard({ fuehrung, unterfuehrung, mannschaft, gesamt, isLoading }: StaerkeCardProps) {
  if (isLoading) return <StaerkeCardSkeleton />;

  return (
    <Card className="p-4">
      <Heading size="sm" className="mb-4 text-gray-900 dark:text-gray-100">
        Taktische Stärke
      </Heading>
      <div className="flex justify-between items-center gap-4">
        <div className="text-center">
          <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fuehrung}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">Führung</Text>
        </div>
        <Text className="text-xl text-gray-400 dark:text-gray-500">/</Text>
        <div className="text-center">
          <Text className="text-2xl font-bold text-green-600 dark:text-green-400">{unterfuehrung}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">Unterführung</Text>
        </div>
        <Text className="text-xl text-gray-400 dark:text-gray-500">/</Text>
        <div className="text-center">
          <Text className="text-2xl font-bold text-gray-600 dark:text-gray-300">{mannschaft}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">Mannschaft</Text>
        </div>
        <Text className="text-xl text-gray-400 dark:text-gray-500">/</Text>
        <div className="text-center">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{gesamt}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">Gesamt</Text>
        </div>
      </div>
    </Card>
  );
}
```

### Query Invalidation (AC3)

```typescript
// In useAssignPersonToFahrzeug oder useRegisterPerson
import { useQueryClient } from '@tanstack/react-query';
import { KRAEFTE_QUERY_KEYS } from '@/features/kraefte/api/queries';

export const useAssignPersonToFahrzeug = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => api.kraefte().assignPersonVAlpha(dto),
    onSuccess: () => {
      // Invalidiere Stärke-Query für automatisches Re-fetch
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId)
      });
    }
  });
};
```

### Bestehende API-Endpoints (zur Referenz)

```
GET /einsaetze/{einsatzId}/personen          → EinsatzPersonResponseDto[]
GET /einsaetze/{einsatzId}/fahrzeuge         → EinsatzFahrzeugDto[]
GET /einsaetze/{einsatzId}/rollen-besetzung  → RollenBesetzungListItemDto[]
```

**Neuer Endpoint:**
```
GET /einsaetze/{einsatzId}/kraefte/staerke   → TaktischeStaerkeDto
```

### ⛔ DO NOT

- **NICHT** eigene fetch()-Aufrufe schreiben → generierter API-Client!
- **NICHT** Redux/Zustand verwenden → TanStack Query für Server State!
- **NICHT** CSS-in-JS verwenden → nur Tailwind CSS!
- **NICHT** `new Logger()` im Handler → DI mit `@Inject(LOGGER)`!
- **NICHT** Repository direkt im Controller → Query Handler verwenden!
- **NICHT** N+1 Queries → Eager-Loading mit `include` in Prisma!

### References

- [Source: docs/epics.md#Story 6.1a]
- [Source: docs/prd.md#Taktische Stärke]
- [Source: docs/architecture/4-frontend-architecture.md]
- [Source: docs/architecture-kraefte.md#API Endpoints]
- [Source: CLAUDE.md#Frontend Rules]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- CUID2-Validierung: Test-IDs mussten auf valide CUID2-Format geändert werden (z.B. `z3h5idy36i9aqgkh7st81q57`)

### Completion Notes List

1. **2-Query-Ansatz statt N+1:** Anstelle von Eager-Loading im Repository werden Personen und Qualifikationen separat geladen und im Handler gemappt (effizienter für große Datenmengen)
2. **Controller in neuem KraefteDashboardController:** Neuer Controller für Dashboard-spezifische Endpoints unter `/einsaetze/:einsatzId/kraefte/`
3. **20 Unit Tests:** Umfassende Testabdeckung für alle ACs inkl. Edge Cases und Case-Insensitivity
4. **Query Invalidation:** In `useRegistrierePerson` und `useRegistrierePersonViaQr` hinzugefügt

### File List

**Backend (erstellt):**
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.query.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.handler.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/__tests__/get-taktische-staerke.handler.spec.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/__tests__/get-taktische-staerke.query.spec.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/index.ts`
- `packages/backend/src/application/kraefte/queries/index.ts`
- `packages/backend/src/application/kraefte/dto/taktische-staerke.dto.ts`
- `packages/backend/src/modules/kraefte/controllers/kraefte-dashboard.controller.ts`

**Backend (modifiziert):**
- `packages/backend/src/application/kraefte/einsatz-personen/einsatz-personen-application.module.ts` (Handler-Registration)
- `packages/backend/src/modules/kraefte/kraefte.module.ts` (Controller-Registration)

**Frontend (erstellt):**
- `packages/frontend/src/features/kraefte/api/queries.ts`
- `packages/frontend/src/features/kraefte/api/use-taktische-staerke.ts`
- `packages/frontend/src/features/kraefte/api/index.ts`
- `packages/frontend/src/features/kraefte/ui/molecules/StaerkeCard.tsx`
- `packages/frontend/src/features/kraefte/ui/molecules/index.ts`
- `packages/frontend/src/features/kraefte/ui/index.ts`
- `packages/frontend/src/features/kraefte/index.ts`

**Frontend (modifiziert):**
- `packages/frontend/src/features/einsatz/api/use-einsatz-personen.ts` (Query Invalidation)
- `packages/frontend/src/features/einsatz/api/use-registriere-person-qr.ts` (Query Invalidation)

**Generiert:**
- `packages/shared/client/apis/KraefteDashboardApi.ts`
- `packages/shared/client/models/TaktischeStaerkeDto.ts`
