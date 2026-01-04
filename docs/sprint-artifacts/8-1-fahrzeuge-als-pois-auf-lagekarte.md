# Story 8.1: Fahrzeuge als POIs auf Lagekarte

Status: Done

## Story

Als **Einsatzleiter**,
möchte ich **alle Fahrzeuge als Points of Interest auf der Lagekarte sehen**,
damit **ich die räumliche Verteilung der Kräfte erkenne**.

## Hintergrund

Diese Story verbindet das Kräftemanagement-Modul mit dem Lagekarte-Modul. Einsatzfahrzeuge werden automatisch als POIs visualisiert.

**Epic 8:** Lagekarte-Integration
**FRs:** FR25 (Kräfte als POIs), FR26 (Synchronisation)
**Dependencies:** Epic 7 (Kräfte-Management) - Fahrzeuge müssen existieren

---

## Existierende Komponenten (NICHT neu implementieren!)

### Backend - Bereits vorhanden

| Komponente | Pfad | Hinweis |
|------------|------|---------|
| `GeoPosition` VO | `domain/kraefte/value-objects/geo-position.vo.ts` | Hat `toGeoJSON()` Methode! |
| `EinsatzFahrzeug._position` | `domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts:118` | Position existiert bereits! |
| `IEinsatzFahrzeugRepository` | `domain/kraefte/repositories/` | `findByEinsatzId()` vorhanden |
| `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG` | `infrastructure/di-tokens.ts:77` | Symbol-basiert |
| `KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG` | `infrastructure/di-tokens.ts:71` | Für Farben/Labels |

### Frontend - Bereits vorhanden

| Komponente | Pfad | Hinweis |
|------------|------|---------|
| `KRAEFTE_QUERY_KEYS` | `features/kraefte/api/queries.ts` | Erweitern mit `.pois()` |
| `useEinsatzFahrzeuge` | `features/kraefte/api/use-einsatz-fahrzeuge.ts` | Pattern-Referenz |
| `api` Client | `@/shared/api/client` | NICHT `apiService`! |
| `ClusteredPoiLayer` | `features/lagekarte/ui/organisms/layers/` | Für >20 Fahrzeuge |

### Kritische Patterns

```typescript
// API Client (KORREKT):
import { api } from '@/shared/api/client';
const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerFindAllVAlpha({...});
const data = response.data;  // Wrapped Response!

// Query Keys (KORREKT - feature-basiert):
import { KRAEFTE_QUERY_KEYS } from '@/features/kraefte/api/queries';

// DI Tokens (KORREKT - Symbol-basiert):
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)

// API Decorator (KORREKT - AC7):
@ApiWrappedResponse(KraeftePoisFeatureCollectionDto, { description: '...' })
```

---

## Acceptance Criteria

### AC1: Fahrzeuge als GeoJSON exportieren
- [x] `GET /api/kraefte/pois?einsatzId=xyz` liefert GeoJSON FeatureCollection
- [x] Koordinaten RFC 7946 konform: `[longitude, latitude]`
- [x] Feature-ID auf Feature-Ebene (nicht in properties)
- [x] Nur Fahrzeuge MIT Position werden zurückgegeben

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "id": "fzg-123",
    "geometry": { "type": "Point", "coordinates": [7.123, 51.456] },
    "properties": {
      "name": "HLF 20",
      "status": 3,
      "statusLabel": "Einsatz übernommen",
      "statusFarbe": "#FFA500",
      "staerke": "1/2/6",
      "fahrzeugtypCode": "HLF",
      "positionTimestamp": "2026-01-04T10:30:00Z"
    }
  }]
}
```

### AC2: POI-Icons nach Status färben
- [x] Icons farbcodiert via `FunkStatusConfig.farbe`
- [x] Fallback-Farbe `#808080` wenn Config fehlt
- [x] Fahrzeugtyp-Symbol via `fahrzeugtypKategorie`

### AC3: POI-Click öffnet Details
- [x] Popup zeigt: Funkrufname, Status (Label + Farbe), Stärke
- [x] Link "Zum Fahrzeug" navigiert zu Detail-Ansicht
- [x] Positions-Aktualität anzeigen (positionTimestamp)

### AC4: Realtime-Update via Polling
- [x] TanStack Query Refetch-Interval: 30s
- [x] Exponential Backoff bei Fehlern (3 Retries)
- [x] Keine Page-Reload erforderlich

### AC5: Error Handling
- [x] Fahrzeuge ohne Koordinaten werden gefiltert (kein Fehler)
- [x] Ungültige EinsatzId → 400 Bad Request
- [x] FunkStatusConfig nicht gefunden → Fallback-Werte
- [x] API-Fehler → Logger + User-Feedback

---

## Tasks

### Task 1: Backend - Query Handler

**Datei:** `src/application/kraefte/queries/get-kraefte-pois/get-kraefte-pois.handler.ts`

```typescript
@Injectable()
export class GetKraeftePoisHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG)
    private readonly funkStatusRepository: IFunkStatusConfigRepository,
  ) {}

  async execute(query: GetKraeftePoisQuery): Promise<Result<KraeftePoisFeatureCollectionDto>> {
    // 1. EinsatzId validieren
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure) {
      return Result.fail('Ungültige Einsatz-ID');
    }

    // 2. Fahrzeuge laden (Repository, NICHT Prisma!)
    const fahrzeuge = await this.fahrzeugRepository.findByEinsatzId(einsatzIdResult.value);

    // 3. Nur Fahrzeuge MIT Position
    const mitPosition = fahrzeuge.filter(f => f.position !== undefined);

    // 4. Status-Configs laden
    const statusConfigs = await this.funkStatusRepository.findAll();
    const statusMap = new Map(statusConfigs.map(c => [c.code, c]));

    // 5. Mapping zu GeoJSON (RFC 7946)
    const features = mitPosition.map(f => this.toFeature(f, statusMap));

    return Result.ok({ type: 'FeatureCollection', features });
  }

  private toFeature(f: EinsatzFahrzeug, statusMap: Map<number, FunkStatusConfig>) {
    const config = statusMap.get(f.fmsStatus) ?? null;
    return {
      type: 'Feature' as const,
      id: f.id.value,  // ID auf Feature-Ebene (RFC 7946)!
      geometry: {
        type: 'Point' as const,
        coordinates: [f.position!.longitude, f.position!.latitude],
      },
      properties: {
        name: f.funkrufname,
        status: f.fmsStatus,
        statusLabel: config?.displayLabel ?? `Status ${f.fmsStatus}`,
        statusFarbe: config?.farbe ?? '#808080',
        staerke: this.formatStaerke(f),
        fahrzeugtypCode: f.fahrzeugtypSnapshot?.code ?? 'UNKNOWN',
        positionTimestamp: f.position!.timestamp?.toISOString(),
      },
    };
  }
}
```

### Task 2: Backend - Controller Endpoint

**Datei:** `src/modules/kraefte/controllers/kraefte.controller.ts`

```typescript
@Get('pois')
@ApiOperation({ summary: 'Fahrzeuge als POIs für Lagekarte' })
@ApiQuery({ name: 'einsatzId', required: true, type: String })
@ApiWrappedResponse(KraeftePoisFeatureCollectionDto, { description: 'GeoJSON FeatureCollection' })
@UseGuards(JwtAuthGuard)
async getKraeftePois(
  @Query('einsatzId', ParseCuidPipe) einsatzId: string,
): Promise<KraeftePoisFeatureCollectionDto> {
  const result = await this.kraeftePoisHandler.execute({ einsatzId });
  if (result.isFailure) {
    throw new BadRequestException(result.error);
  }
  return result.value;
}
```

### Task 3: Frontend - Query Keys erweitern

**Datei:** `features/kraefte/api/queries.ts`

```typescript
export const KRAEFTE_QUERY_KEYS = {
  // ... existierende Keys
  pois: (einsatzId: string) => [...KRAEFTE_QUERY_KEYS.byEinsatz(einsatzId), 'pois'] as const,
} as const;
```

### Task 4: Frontend - Hook erstellen

**Datei:** `features/kraefte/api/use-kraefte-pois.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

export const useKraeftePois = (einsatzId: string | undefined) => {
  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.pois(einsatzId!),
    queryFn: async () => {
      try {
        const response = await api.kraefte().kraefteControllerGetKraeftePoisVAlpha({
          einsatzId: einsatzId!,
        });
        return response.data;  // Extract from wrapped response!
      } catch (error) {
        logger.error('Fehler beim Laden der Kräfte-POIs', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
```

### Task 5: Frontend - FahrzeugPoiLayer

**Datei:** `features/lagekarte/ui/organisms/layers/FahrzeugPoiLayer.tsx`

```typescript
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useKraeftePois } from '@/features/kraefte/api/use-kraefte-pois';
import { createFahrzeugIcon } from '@/features/lagekarte/utils/poi-icons';

interface Props {
  einsatzId: string;
  onFahrzeugClick?: (id: string) => void;
}

export const FahrzeugPoiLayer: React.FC<Props> = ({ einsatzId, onFahrzeugClick }) => {
  const { data: geojson, isLoading } = useKraeftePois(einsatzId);

  if (isLoading || !geojson) return null;

  return (
    <>
      {geojson.features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const { name, statusLabel, statusFarbe, staerke, positionTimestamp } = feature.properties;

        return (
          <Marker
            key={feature.id}
            position={[lat, lng]}  // Leaflet: [lat, lng] - umgekehrt zu GeoJSON!
            icon={createFahrzeugIcon(feature.properties.fahrzeugtypCode, statusFarbe)}
          >
            <Popup>
              <div className="p-2 space-y-1">
                <h3 className="font-semibold">{name}</h3>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusFarbe }} />
                  <span className="text-sm">{statusLabel}</span>
                </div>
                <p className="text-sm text-gray-600">Stärke: {staerke}</p>
                {positionTimestamp && (
                  <p className="text-xs text-gray-400">
                    Position: {new Date(positionTimestamp).toLocaleTimeString()}
                  </p>
                )}
                <button
                  onClick={() => onFahrzeugClick?.(feature.id)}
                  className="mt-2 text-blue-600 hover:underline text-sm"
                >
                  Zum Fahrzeug →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
```

### Task 6: Tests

**Datei:** `get-kraefte-pois.handler.spec.ts`

```typescript
describe('GetKraeftePoisHandler', () => {
  let handler: GetKraeftePoisHandler;
  let mockFahrzeugRepo: jest.Mocked<IEinsatzFahrzeugRepository>;
  let mockStatusRepo: jest.Mocked<IFunkStatusConfigRepository>;

  beforeEach(() => {
    jest.clearAllMocks();  // WICHTIG!
    // Setup...
  });

  it('should return GeoJSON with [lng, lat] coordinates (RFC 7946)', async () => {
    // Given
    const fahrzeug = createMockFahrzeug({ position: { lat: 52.5, lng: 13.4 } });
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue([fahrzeug]);

    // When
    const result = await handler.execute({ einsatzId: 'valid-cuid' });

    // Then
    expect(result.value.features[0].geometry.coordinates).toEqual([13.4, 52.5]);
  });

  it('should place id on Feature level (RFC 7946)', async () => {
    // Given
    const fahrzeug = createMockFahrzeug({ id: 'fzg-123' });
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue([fahrzeug]);

    // When
    const result = await handler.execute({ einsatzId: 'valid-cuid' });

    // Then
    expect(result.value.features[0].id).toBe('fzg-123');
    expect(result.value.features[0].properties.id).toBeUndefined();
  });

  it('should filter fahrzeuge without position', async () => {
    // Given
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue([
      createMockFahrzeug({ position: undefined }),
      createMockFahrzeug({ position: { lat: 51.0, lng: 7.0 } }),
    ]);

    // When
    const result = await handler.execute({ einsatzId: 'valid-cuid' });

    // Then
    expect(result.value.features).toHaveLength(1);
  });
});
```

### Task 7: Verifikation

```bash
pnpm --filter @bluelight-hub/backend lint:check    # 0 Errors
pnpm --filter @bluelight-hub/backend build         # Success
pnpm run generate-api                              # API Client aktualisieren
pnpm --filter @bluelight-hub/frontend lint:check   # 0 Errors
pnpm --filter @bluelight-hub/frontend build        # Success
```

---

## Dateien

**Zu erstellen:**
- `packages/backend/src/application/kraefte/queries/get-kraefte-pois/get-kraefte-pois.query.ts`
- `packages/backend/src/application/kraefte/queries/get-kraefte-pois/get-kraefte-pois.handler.ts`
- `packages/backend/src/application/kraefte/queries/get-kraefte-pois/kraefte-pois.dto.ts`
- `packages/backend/src/application/kraefte/queries/get-kraefte-pois/index.ts`
- `packages/frontend/src/features/kraefte/api/use-kraefte-pois.ts`
- `packages/frontend/src/features/lagekarte/ui/organisms/layers/FahrzeugPoiLayer.tsx`
- `packages/frontend/src/features/lagekarte/utils/poi-icons.ts`

**Zu erweitern:**
- `packages/backend/src/modules/kraefte/controllers/kraefte.controller.ts`
- `packages/backend/src/modules/kraefte/kraefte.module.ts`
- `packages/frontend/src/features/kraefte/api/queries.ts`
- `packages/frontend/src/features/lagekarte/ui/organisms/MapContainer.tsx`

---

## Dev Agent Record

### Validation 2026-01-04 (SM Agent + 4 Subagents)

**Kritische Fixes angewendet:**
1. ✅ API Client: `api.*` statt `apiService.*`
2. ✅ Query Keys: Feature-basiert statt deprecated `queryKeys.ts`
3. ✅ API Decorator: `@ApiWrappedResponse` (AC7)
4. ✅ GeoJSON: Feature-ID auf Feature-Ebene (RFC 7946)
5. ✅ Wrapped Response: `response.data` extrahieren
6. ✅ Error Handling: Logger + Exponential Backoff
7. ✅ Position existiert bereits im Aggregate
8. ✅ Error States in ACs definiert

**Enhancements hinzugefügt:**
- positionTimestamp in Properties
- Exponential Backoff Retry
- Logging bei Fehlern
- ClusteredPoiLayer Referenz
- Fallback-Werte dokumentiert

**LLM Optimierungen:**
- Redundante Tabellen konsolidiert
- Code-Beispiele fokussiert
- Task-Granularität ausgeglichen

---

### Implementation 2026-01-04 (Dev Agent + Subagents)

**Backend Implementation:**
- GetKraeftePoisHandler mit Result Pattern + Symbol-basierte DI Tokens
- GeoJSON RFC 7946 konform: `[longitude, latitude]`, Feature-ID auf Feature-Ebene
- Automatisches Laden von FunkStatusConfig für Farben/Labels mit Fallback
- Stärke-Formatierung aus Sollbesatzung (F/T/M Format)
- Rate Limiting: 60 Requests/Minute auf POIs-Endpoint
- 20 Unit Tests mit AAA-Pattern (Given-When-Then)

**Frontend Implementation:**
- KRAEFTE_QUERY_KEYS.pois() hinzugefügt
- useKraeftePois Hook mit 30s Polling + Exponential Backoff
- FahrzeugPoiLayer mit React.memo() für Performance
- fahrzeug-icons.ts mit Emoji-basiertem Icon-System + Prefix-Matching
- Koordinaten-Umkehrung GeoJSON→Leaflet korrekt implementiert

**Verifikation:**
- Backend Lint: ✅ 0 Errors (nur Warnings in anderen Dateien)
- Backend Build: ✅ Success
- Backend Tests: ✅ 20/20 passed
- API Generation: ✅ Success
- Frontend Lint: 1 Error in QualifikationPicker.tsx (vorexistierend, NICHT Teil dieser Story)

**Integration:** FahrzeugPoiLayer in LagekarteView eingebunden mit Layer-Toggle.

---

### Code Review 2026-01-04 (Dev Agent + 5 Review Subagents)

**CLAUDE.md Compliance Check:**
- ✅ AC1 (DI Import) - `import` statt `import type` für DI-Injectable
- ✅ AC2 (DI Tokens) - Symbol-basiert `KRAEFTE_REPOSITORIES.*`
- ✅ AC3 (Framework-Agnostizität) - Nur `@Injectable`, `@Inject` im Handler
- ✅ AC4 (Result Pattern) - Konsistent `Result<T>` ohne Exceptions
- ✅ AC7 (Controller Decorators) - `@ApiWrappedResponse` korrekt
- ✅ RFC 7946 - Koordinaten `[lng, lat]`, Feature-ID auf Feature-Ebene
- ✅ Leaflet-Transformation - GeoJSON→Leaflet Umkehrung korrekt

**Fixes angewendet:**
1. `console.error` → `logger.error` in FahrzeugPoiLayer.tsx
2. Fallback-Farbe `#FF8C00` → `#808080` (AC5 konform)
3. Test-Kommentare vereinheitlicht (Given/When/Then)
4. 3 neue Test-Szenarien hinzugefügt (Repository-Fehler, Koordinaten-Grenzwerte)

**Finale Verifikation:**
- Backend Lint: ✅ 0 Errors in Story-Dateien
- Frontend Lint: ✅ 0 Errors in Story-Dateien
- Backend Tests: ✅ 23/23 passed
- API Generation: ✅ Success

---

## File List

**Erstellt (Backend):**
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/get-kraefte-pois.query.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/get-kraefte-pois.handler.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/kraefte-pois.dto.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/index.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/__tests__/get-kraefte-pois.handler.spec.ts`

**Erstellt (Frontend):**
- `packages/frontend/src/features/kraefte/api/use-kraefte-pois.ts`
- `packages/frontend/src/features/lagekarte/ui/organisms/layers/FahrzeugPoiLayer.tsx`
- `packages/frontend/src/features/lagekarte/utils/fahrzeug-icons.ts`

**Erweitert:**
- `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts` - POIs Endpoint hinzugefügt
- `packages/backend/src/modules/kraefte/kraefte.module.ts` - Handler registriert
- `packages/frontend/src/features/kraefte/api/queries.ts` - pois() Key hinzugefügt
- `packages/frontend/src/features/kraefte/api/index.ts` - useKraeftePois exportiert
- `packages/frontend/src/features/lagekarte/utils/index.ts` - fahrzeug-icons exportiert
- `packages/shared/client/` - API Client regeneriert
- `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` - FahrzeugPoiLayer integriert

---

## Change Log

| Datum | Änderung |
|-------|----------|
| 2026-01-04 | Story implementiert: Backend Query Handler + Controller, Frontend Hook + Layer, 20 Tests |
| 2026-01-04 | Code Review + Fixes: Logger, AC5 Fallback-Farbe, Test-Improvements (23 Tests), Status → Done |
| 2026-01-04 | FahrzeugPoiLayer in LagekarteView integriert mit Layer-Toggle |
