# 14. Testing Strategy

## 14.1 Unit Tests (Backend)

**Test-Files:**
```
packages/backend/src/lagekarte/
├── lagekarte.service.spec.ts
├── poi.service.spec.ts
├── geocoding.service.spec.ts
├── file-upload.service.spec.ts
├── lagekarte.repository.spec.ts
└── poi.repository.spec.ts
```

**Example Test:**
```typescript
// poi.service.spec.ts
describe('PoiService', () => {
  it('should auto-geocode POI when address provided', async () => {
    const dto = { type: PoiType.EINSATZORT, adresse: 'Berlin, Brandenburger Tor' };
    jest.spyOn(geocodingService, 'geocodeAddress').mockResolvedValue({
      latitude: 52.5163, longitude: 13.3777,
    });

    const result = await poiService.createPoi('einsatz-id', dto);

    expect(result.latitude).toBe(52.5163);
    expect(result.longitude).toBe(13.3777);
  });
});
```

---

## 14.2 Integration Tests (Backend)

**Test with Testcontainers:**
```typescript
describe('Lagekarte Integration Tests', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSQLContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSQLContainer().start();
    // Setup app with test database...
  });

  it('should create lagekarte and POI via API', async () => {
    const response = await request(app.getHttpServer())
      .post('/einsatz/test-id/lagekarte/pois')
      .send({ type: 'EINSATZORT', adresse: 'Berlin' })
      .expect(201);

    expect(response.body).toHaveProperty('latitude');
  });
});
```

---

## 14.3 Frontend Tests (Vitest + Testing Library)

**Test-Files:**
```
packages/frontend/src/
├── components/organisms/lagekarte/LagekarteMap.test.tsx
├── hooks/lagekarte/useLagekarteData.test.ts
└── stores/lagekarteStore.test.ts
```

**Example Test:**
```typescript
describe('LagekarteMap', () => {
  it('should render POI markers', () => {
    const pois = [{ id: '1', type: 'EINSATZORT', latitude: 52.52, longitude: 13.4 }];
    render(<LagekarteMap einsatzId="test-id" />);

    waitFor(() => {
      expect(screen.getByTestId('poi-marker-1')).toBeInTheDocument();
    });
  });
});
```

---

## 14.4 E2E Tests (Skipped for MVP)

**Rationale:** E2E-Tests mit Playwright/Cypress werden temporär übersprungen (laut CLAUDE.md).

**Future E2E Test-Scenarios:**
- User erstellt POI → POI erscheint auf Karte
- User zeichnet Polygon → Backend speichert GeoJSON
- User exportiert Screenshot → ETB-Eintrag vorhanden

---
