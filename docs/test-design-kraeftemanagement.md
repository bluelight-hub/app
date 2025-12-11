# Test Design: Kräfte-Management-Modul

**Date:** 2025-12-10
**Author:** Murat (TEA) / Ruben
**Status:** Draft

---

## Executive Summary

**Scope:** Vollständiges Test-Design für das Kräfte-Management-Modul (8 Epics, 41 Functional Requirements, 22 NFRs)

**Risk Summary:**

- Total Risiken identifiziert: **53**
- High-Priority Risiken (≥6): **25**
- Kritische Risiken (Score=9): **7**
- Betroffene Kategorien: SEC (12), DATA (14), PERF (12), TECH (9), BUS (4), OPS (2)

**Coverage Summary:**

- P0 Szenarien: **21** (~84 Stunden)
- P1 Szenarien: **35** (~35 Stunden)
- P2/P3 Szenarien: **47** (~24 Stunden)
- **Total Effort:** ~143 Stunden (~18 Tage)

---

## Risk Assessment

### Kritische Risiken (Score = 9) - BLOCKER

| Risk ID | Epic | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|------|----------|-------------|-------------|--------|-------|------------|-------|
| R-E1-001 | 1 | SEC | **Fehlende RBAC für Admin-Funktionen**: AdminJwtAuthGuard existiert noch nicht, könnte zu unautorisierten Zugriffen führen | 3 | 3 | 9 | Implementierung AdminJwtAuthGuard + Unit Tests | Dev |
| R-E2-003 | 2 | TECH | **Fahrzeug-Status Business-Logik**: Fehlende Validation, dass archiviertes Fahrzeug nicht aktiven Einsätzen zugeordnet sein darf | 3 | 3 | 9 | Domain-Layer Validation Rules + Integration Tests | Dev |
| R-E3-001 | 3 | PERF | **Transaction Timeout ETB-Auto-Creation**: Bei langsamer DB (>1s) wird NFR4 (<1s bis ETB) verfehlt | 3 | 3 | 9 | Async Outbox + Performance-Test: 20 parallele Updates | QA |
| R-E5-001 | 5 | BUS | **Qualifikationsvalidierung M:N Race Condition**: Bei Rollenzuweisung nicht alle Qualifikationen validiert | 3 | 3 | 9 | DB Constraint + Optimistic Locking + Integration Test | Dev |
| R-E5-002 | 5 | DATA | **Inkonsistente Rollenzuweisung**: Zwei parallele Requests könnten beide Person A als LNA zuweisen | 3 | 3 | 9 | UNIQUE constraint (einsatz_id, rolle_typ) + Upsert | Dev |
| R-E6-001 | 6 | PERF | **Dashboard Initial Load Timeout**: Bei 20 Fahrzeugen/80 Personen NFR1 (<2s) gefährdet | 3 | 3 | 9 | Prisma select + Pagination + Performance Test | QA |
| R-E7-004 | 7 | DATA | **Qualifikations-Mapping Inkonsistenz**: HiOrg externe Namen vs. interne IDs → Duplikate | 3 | 3 | 9 | qualifikation_mapping Tabelle + Fuzzy Matching | Dev |
| R-E8-001 | 8 | TECH | **GeoJSON Koordinaten-Reihenfolge**: POINT(lat, lng) vs. GeoJSON [lng, lat] → falsche Positionen | 3 | 3 | 9 | toGeoJSON() Helper + Unit Tests | Dev |
| R-E8-002 | 8 | PERF | **Realtime Sync Strategy**: Polling alle 5s mit 50 Fahrzeugen → Connection Pool Exhaustion | 3 | 3 | 9 | Hybrid WebSocket + Polling + Pool Config | Dev |

### High-Priority Risiken (Score 6-8)

| Risk ID | Epic | Category | Description | Probability | Impact | Score | Mitigation |
|---------|------|----------|-------------|-------------|--------|-------|------------|
| R-E1-002 | 1 | DATA | M:N-Relationen Inkonsistenzen (RolleQualifikation) | 2 | 3 | 6 | Seed-Daten Validation + Transactional Seeds |
| R-E1-003 | 1 | TECH | Prisma Schema Migration Breaking Changes | 2 | 3 | 6 | Schema-Versionierung + Backward-Compatible Migrations |
| R-E1-004 | 1 | DATA | Audit-Trail Lücken (createdBy/updatedBy) | 3 | 2 | 6 | Request-Scoped User-Kontext Injection |
| R-E1-005 | 1 | TECH | OpenAPI Decorator Unvollständigkeit | 3 | 2 | 6 | Automated API Spec Validation (spectral) |
| R-E1-008 | 1 | OPS | Fehlende Soft-Delete Validation | 3 | 2 | 6 | Globaler Query-Filter archivedAt IS NULL |
| R-E2-001 | 2 | SEC | Ungeschützte Bulk-Operations | 2 | 3 | 6 | Soft-Delete Default + Rate-Limiting |
| R-E2-002 | 2 | DATA | M:N Cascade-Probleme (StammPersonQualifikation) | 3 | 2 | 6 | Explizite Cascade-Strategie + Validation |
| R-E2-006 | 2 | OPS | Frontend/Backend Validation Inkonsistenz | 3 | 2 | 6 | Shared Zod Schemas |
| R-E2-008 | 2 | SEC | Sensitive Daten in Audit-Logs (DSGVO) | 2 | 3 | 6 | Audit-Log Data Minimization |
| R-E3-002 | 3 | DATA | Outbox-Event-Reihenfolge falsch | 2 | 3 | 6 | Sequenznummer + Aggregate Version |
| R-E3-005 | 3 | DATA | ETB-Duplikat bei Outbox-Retry | 2 | 3 | 6 | Idempotency-Key + Unique-Constraint |
| R-E4-001 | 4 | PERF | QR-Code-Parse + DB-Lookup = NFR3 Verfehlung | 3 | 2 | 6 | DB-Index + Optimistic UI |
| R-E4-003 | 4 | DATA | DRK-Format unvollständig/fehlerhaft | 2 | 3 | 6 | Zod-Schema + Graceful Degradation |
| R-E4-009 | 4 | OPS | Tauri-Kamera-Permission fehlt im Produktiv-Build | 2 | 3 | 6 | tauri.conf.json permissions + Test auf Device |
| R-E5-004 | 5 | BUS | Fehlende Validierung bei Rollenwechsel | 2 | 3 | 6 | Cascade Logic + Warning Dialog |
| R-E5-007 | 5 | SEC | Autorisierung bei Rollenzuweisung | 2 | 3 | 6 | NestJS Guard für role assignment |
| R-E6-003 | 6 | PERF | Auto-Refresh Memory Leak | 2 | 3 | 6 | React useEffect cleanup + gcTime |
| R-E6-004 | 6 | DATA | Stale Dashboard bei Netzwerk-Partitionierung | 2 | 3 | 6 | onError Toast + "Last Updated" Timestamp |
| R-E6-006 | 6 | PERF | Re-Render Cascade bei Stärke-Update | 3 | 2 | 6 | React.memo + Selective invalidation |
| R-E7-001 | 7 | SEC | Credential Storage Exposure | 2 | 3 | 6 | Tauri Keychain API |
| R-E7-002 | 7 | SEC | Man-in-the-Middle bei HiOrg API | 2 | 3 | 6 | Certificate Pinning |
| R-E7-003 | 7 | TECH | API Authentication Failure Cascade | 3 | 2 | 6 | Exponential Backoff + UI-State-Machine |
| R-E7-005 | 7 | DATA | Duplikats-Erkennung Race Condition | 2 | 3 | 6 | Unique Constraint hiorg_external_id |
| R-E7-007 | 7 | BUS | Partial Import Rollback Failure | 2 | 3 | 6 | Micro-Batches + Error Recovery |
| R-E8-004 | 8 | TECH | GeoJSON Feature Collection Size Explosion | 2 | 3 | 6 | Lazy Loading + GeoJSON Simplification |
| R-E8-005 | 8 | SEC | Public API Exposure Without Auth | 2 | 3 | 6 | NestJS Guards + RBAC |
| R-CROSS-001 | 3-4 | PERF | ETB + Helfer-Scan teilen Connection-Pool | 2 | 3 | 6 | Separate Connection-Pools |

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround + Revenue/Security-critical

| ID | Requirement | Test Level | Risk Link | Test Count | Owner |
|----|-------------|------------|-----------|------------|-------|
| TC-P0-001 | AdminJwtAuthGuard für alle Admin-Endpoints | API | R-E1-001 | 3 | QA |
| TC-P0-002 | RBAC für Admin-Funktionen (403 bei unauthorized) | API | R-E1-001 | 4 | QA |
| TC-P0-003 | M:N-Relationen Referentielle Integrität | Integration | R-E1-002 | 5 | Dev |
| TC-P0-004 | Audit-Trail vollständig (createdBy, updatedBy) | Integration | R-E1-004 | 4 | Dev |
| TC-P0-005 | Soft-Delete Query-Filter funktioniert | Unit | R-E1-008 | 3 | Dev |
| TC-P0-006 | Fahrzeug-Archivierung blockiert bei aktivem Einsatz | Integration | R-E2-003 | 3 | QA |
| TC-P0-007 | TransactionalCommandHandler + Outbox atomare Events | Integration | R-E3-001 | 5 | Dev |
| TC-P0-008 | FMS-Status-Update bis ETB <1s (NFR4) | Performance | R-E3-001 | 3 | QA |
| TC-P0-009 | Event-Reihenfolge in Outbox korrekt | Integration | R-E3-002 | 4 | Dev |
| TC-P0-010 | ETB-Idempotenz bei Outbox-Retry | Integration | R-E3-005 | 3 | Dev |
| TC-P0-011 | QR-Code-Scan bis Erfassung <3s (NFR3) | E2E | R-E4-001 | 2 | QA |
| TC-P0-012 | DRK-QR-Format Parser mit realen Codes | Unit | R-E4-003 | 5 | Dev |
| TC-P0-013 | Qualifikationsvalidierung bei Rollenzuweisung | Integration | R-E5-001 | 5 | QA |
| TC-P0-014 | UNIQUE(einsatz_id, rolle_typ) Constraint | Integration | R-E5-002 | 3 | Dev |
| TC-P0-015 | Concurrent Role Assignment → Konflikt-Resolution | Integration | R-E5-002 | 3 | QA |
| TC-P0-016 | Dashboard Load <2s (20 Fahrzeuge, 80 Personen) | Performance | R-E6-001 | 3 | QA |
| TC-P0-017 | Stärke-Berechnung <500ms (NFR5) | Performance | R-E6-006 | 2 | QA |
| TC-P0-018 | qualifikation_mapping Tabelle + Import | Integration | R-E7-004 | 4 | Dev |
| TC-P0-019 | GeoJSON Koordinaten [lng, lat] korrekt | Unit | R-E8-001 | 5 | Dev |
| TC-P0-020 | Lagekarte API RBAC (403 unauthorized) | API | R-E8-005 | 3 | QA |
| TC-P0-021 | WebSocket Connection Handling | Integration | R-E8-002 | 4 | Dev |

**Total P0**: 21 Test-Szenarien, ~84 Stunden Entwicklung

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-5) + Common workflows

| ID | Requirement | Test Level | Risk Link | Test Count | Owner |
|----|-------------|------------|-----------|------------|-------|
| TC-P1-001 | Qualifikation CRUD vollständig | API | FR34 | 4 | QA |
| TC-P1-002 | Fahrzeugtyp CRUD + DIN EN 1789 Warning | API | FR35 | 4 | QA |
| TC-P1-003 | Rollen-Definition CRUD mit M:N-Qualifikationen | API | FR36 | 5 | QA |
| TC-P1-004 | Funkstatus 7-9 Inline-Editing | E2E | FR37 | 3 | QA |
| TC-P1-005 | Seed-Daten Validierung gegen BOS-Standards | Unit | R-E1-006 | 3 | Dev |
| TC-P1-006 | Stamm-Fahrzeug CRUD mit Validierung | API | FR32 | 5 | QA |
| TC-P1-007 | Stamm-Person CRUD mit Multi-Select Qualifikationen | API | FR33 | 5 | QA |
| TC-P1-008 | Concurrent Edit Optimistic Locking | Integration | R-E2-004 | 3 | Dev |
| TC-P1-009 | Fahrzeug aus Stammdaten erfassen + Event | Integration | FR1, FR29 | 4 | QA |
| TC-P1-010 | Temporäres Fahrzeug anlegen | API | FR2 | 3 | QA |
| TC-P1-011 | FMS-Status Dropdown mit Farben | E2E | FR3, FR4 | 3 | QA |
| TC-P1-012 | Optimistic Update Race Condition | E2E | R-E3-003 | 2 | QA |
| TC-P1-013 | Person manuell registrieren + Autocomplete | E2E | FR7 | 3 | QA |
| TC-P1-014 | Person zu Fahrzeug zuweisen | Integration | FR8 | 4 | QA |
| TC-P1-015 | Tauri Native Scanner vs html5-qrcode Fallback | E2E | R-E4-002 | 2 | QA |
| TC-P1-016 | Tauri Kamera-Permission Check | E2E | R-E4-009 | 2 | QA |
| TC-P1-017 | Rolle besetzen mit Qualifikationsfilter | E2E | FR11 | 4 | QA |
| TC-P1-018 | Rolle freigeben + ETB-Update | Integration | FR12, FR28 | 3 | QA |
| TC-P1-019 | Rollenwechsel mit Cascade-Warnung | E2E | R-E5-004 | 2 | QA |
| TC-P1-020 | Dashboard FullScreen Mode (3m lesbar) | E2E | FR20, NFR19 | 2 | QA |
| TC-P1-021 | Dashboard Compact Mode (Tablet) | E2E | FR21, NFR20 | 2 | QA |
| TC-P1-022 | Auto-Refresh ohne Memory Leak | E2E | R-E6-003 | 2 | QA |
| TC-P1-023 | Stale Data Warning bei Netzwerkausfall | E2E | R-E6-004 | 2 | QA |
| TC-P1-024 | HiOrg-Server Credentials verschlüsselt | Integration | R-E7-001 | 3 | Dev |
| TC-P1-025 | HiOrg-Server Verbindungstest | API | FR38 | 3 | QA |
| TC-P1-026 | Import-Auswahl + Duplikatserkennung | E2E | FR39, R-E7-005 | 4 | QA |
| TC-P1-027 | Qualifikations-Mapping UI | E2E | FR40 | 3 | QA |
| TC-P1-028 | Import Rollback bei Fehler (Micro-Batches) | Integration | R-E7-007 | 3 | Dev |
| TC-P1-029 | Fahrzeuge als POIs auf Lagekarte | E2E | FR25 | 3 | QA |
| TC-P1-030 | POI-Click öffnet Fahrzeug-Details | E2E | FR25 | 2 | QA |
| TC-P1-031 | Realtime-Update via Polling (30s) | E2E | FR26 | 2 | QA |
| TC-P1-032 | GeoJSON Lazy Loading für große Collections | API | R-E8-004 | 2 | Dev |
| TC-P1-033 | OpenAPI Spec Vollständigkeit (spectral lint) | Unit | R-E1-005 | 1 | Dev |
| TC-P1-034 | HTTPS TLS 1.2+ für HiOrg-Server | Integration | NFR8 | 2 | Dev |
| TC-P1-035 | Frontend/Backend Validation Konsistenz | Integration | R-E2-006 | 3 | Dev |

**Total P1**: 35 Test-Szenarien, ~35 Stunden Entwicklung

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-3) + Edge cases

| ID | Requirement | Test Level | Test Count | Owner |
|----|-------------|------------|------------|-------|
| TC-P2-001 | Qualifikation deaktivieren | API | 2 | QA |
| TC-P2-002 | Fahrzeugtyp Sollbesatzung JSONB | Unit | 2 | Dev |
| TC-P2-003 | Funkstatus Color-Picker | E2E | 1 | QA |
| TC-P2-004 | Archivierte Stammdaten Toggle | E2E | 2 | QA |
| TC-P2-005 | DB-Index Performance (>1000 Datensätze) | Performance | 2 | QA |
| TC-P2-006 | Duplikat-Validierung Funkrufname | API | 2 | QA |
| TC-P2-007 | FMS-Status Historie Tooltip | E2E | 1 | QA |
| TC-P2-008 | Fuzzy-Match für Personennamen | Unit | 3 | Dev |
| TC-P2-009 | QR-Code Injection Prevention | Unit | 2 | Dev |
| TC-P2-010 | Parallel Scan Race Condition | Integration | 2 | Dev |
| TC-P2-011 | ETB-Update bei Rollenwechsel | Integration | 2 | QA |
| TC-P2-012 | M:N Query Performance | Performance | 2 | Dev |
| TC-P2-013 | FullScreen API Browser Compatibility | E2E | 2 | QA |
| TC-P2-014 | Responsive Breakpoints 768px/1024px | E2E | 3 | QA |
| TC-P2-015 | Multi-Tab Dashboard Sync | E2E | 2 | QA |
| TC-P2-016 | Bulk Import Performance (500 Personen) | Performance | 2 | QA |
| TC-P2-017 | Certificate Pinning für HiOrg | Integration | 2 | Dev |
| TC-P2-018 | Coordinate Precision (7 Dezimalstellen) | Unit | 2 | Dev |
| TC-P2-019 | Stale Position Grayscale-Filter | E2E | 1 | QA |
| TC-P2-020 | Adapter Pattern Documentation | Manual | 1 | Dev |

**Total P2**: 20 Test-Szenarien, ~20 Stunden Entwicklung

### P3 (Low) - Run on-demand

| ID | Requirement | Test Level | Test Count | Owner |
|----|-------------|------------|------------|-------|
| TC-P3-001 | FMS-Semantik DRK vs THW | Manual | 1 | Domain |
| TC-P3-002 | Großschadenslage (50 Fahrzeuge, 150 Updates/min) | Load | 3 | QA |
| TC-P3-003 | 8h Session Memory Profiling | Performance | 2 | QA |
| TC-P3-004 | Connection Pool Exhaustion | Load | 2 | QA |
| TC-P3-005 | Outbox Worker Horizontal Scaling | Load | 2 | Ops |
| TC-P3-006 | iPad/Surface Real Device Testing | Manual | 2 | QA |
| TC-P3-007 | Signed Tauri Build auf Device | Manual | 1 | QA |

**Total P3**: 7 Test-Szenarien, ~4 Stunden

---

## Execution Order

### Smoke Tests (<5 min) - Pre-Commit Hook

- [ ] AdminJwtAuthGuard responds 401/403 (TC-P0-001)
- [ ] Dashboard loads within 2s (TC-P0-016)
- [ ] GeoJSON serialization correct (TC-P0-019)
- [ ] QR-Parser handles valid DRK format (TC-P0-012)

**Total**: 4 Szenarien, ~2 Minuten

### P0 Tests (<10 min) - CI Pipeline Main

- [ ] All 21 P0 scenarios
- [ ] Parallelized: Unit Tests + Integration Tests
- [ ] Sequential: Performance Tests (isolated environment)

**Total**: 21 Szenarien, ~8 Minuten (parallelized)

### P1 Tests (<30 min) - PR to main

- [ ] All 35 P1 scenarios
- [ ] Grouped by Epic for parallel execution
- [ ] E2E Tests nach API Tests

**Total**: 35 Szenarien, ~25 Minuten

### P2/P3 Tests (<60 min) - Nightly Build

- [ ] P2: 20 Szenarien
- [ ] P3: 7 Szenarien (optional, on-demand)

**Total**: 27 Szenarien, ~45 Minuten

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 21 | 4.0 | 84 | Complex setup, security, performance |
| P1 | 35 | 1.0 | 35 | Standard coverage |
| P2 | 20 | 1.0 | 20 | Simple scenarios |
| P3 | 7 | 0.5 | 4 | Exploratory/Manual |
| **Total** | **83** | **-** | **143** | **~18 Tage** |

### Prerequisites

**Test Data Factories:**
- `createQualifikation()` - Faker-based mit Auto-Cleanup
- `createFahrzeugtyp()` - DIN EN 1789 konforme Codes
- `createStammFahrzeug()` - Mit Fahrzeugtyp-Relation
- `createStammPerson()` - Mit M:N Qualifikationen
- `createEinsatzFahrzeug()` - Mit Outbox Event
- `createEinsatzPerson()` - Mit QR-Code-Daten
- `generateDrkQrCode()` - Reale DRK-Formate

**Tooling:**
- Jest für Unit/Integration Tests (bereits vorhanden)
- Playwright für E2E Tests
- k6 für Performance/Load Tests
- Tauri Test Utilities für Native Features

**Environment:**
- PostgreSQL Test-DB mit PostGIS Extension
- Tauri Development Build + Production Build
- HiOrg-Server Mock (WireMock/MSW)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80%
- **Security scenarios (SEC)**: 100%
- **Performance NFRs**: 100%
- **Business logic**: ≥70%
- **Edge cases**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No kritische Risiken (Score=9) unmitigated
- [ ] Security tests (R-E1-001, R-E2-001, R-E7-001, R-E8-005) pass 100%
- [ ] Performance targets met:
  - NFR1: Dashboard <2s
  - NFR3: QR-Scan <3s
  - NFR4: Status-Update <1s
  - NFR5: Stärke-Berechnung <500ms

---

## Mitigation Plans

### R-E1-001: Fehlende RBAC für Admin-Funktionen (Score: 9)

**Mitigation Strategy:**
```typescript
// packages/backend/src/common/guards/admin-jwt-auth.guard.ts
@Injectable()
export class AdminJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const isAuth = super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.roles?.includes('ADMIN')) {
      throw new ForbiddenException('Admin-Rechte erforderlich');
    }

    return isAuth;
  }
}
```

**Owner:** Dev Team
**Timeline:** Sprint 1, Story 1.1
**Status:** Planned
**Verification:** TC-P0-001, TC-P0-002

### R-E3-001: Transaction Timeout ETB-Auto-Creation (Score: 9)

**Mitigation Strategy:**
- Outbox-Event asynchron (außerhalb TX)
- ETB-Creation in separatem Worker
- Performance-Test: 20 parallele Status-Updates

**Owner:** Dev Team
**Timeline:** Sprint 1, Story 3.3
**Status:** Planned
**Verification:** TC-P0-007, TC-P0-008

### R-E5-002: Inkonsistente Rollenzuweisung (Score: 9)

**Mitigation Strategy:**
```sql
-- Migration: add unique constraint
ALTER TABLE einsatz_rollenbesetzung
ADD CONSTRAINT unique_rolle_per_einsatz
UNIQUE (einsatz_id, rollen_definition_id);
```

**Owner:** Dev Team
**Timeline:** Sprint 2, Story 5.1
**Status:** Planned
**Verification:** TC-P0-014, TC-P0-015

### R-E8-001: GeoJSON Koordinaten-Reihenfolge (Score: 9)

**Mitigation Strategy:**
```typescript
// packages/backend/src/application/lagekarte/mappers/poi.mapper.ts
toGeoJSON(poi: Poi): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      // WICHTIG: GeoJSON = [longitude, latitude], nicht [lat, lng]!
      coordinates: [poi.position.longitude, poi.position.latitude]
    },
    properties: { id: poi.id, name: poi.name, status: poi.status }
  };
}
```

**Owner:** Dev Team
**Timeline:** Sprint 3, Story 8.1
**Status:** Planned
**Verification:** TC-P0-019

---

## Test Strategy by Test Level

### Unit Tests (Target: 70% of tests)

**Focus Areas:**
- Domain Value Objects (FmsStatus, Qualifikation, GeoCoordinate)
- Business Logic (Stärke-Berechnung, Qualifikations-Matching)
- Parsers (DRK-QR-Format, GeoJSON Serialization)
- Validators (Zod Schemas, class-validator DTOs)

**Pattern:**
```typescript
describe('StaerkeBerechnung', () => {
  it('should calculate Führer/Unterführer/Helfer/Gesamt correctly', () => {
    // Given
    const personen = [
      createPerson({ funktion: 'Führer' }),
      createPerson({ funktion: 'Unterführer' }),
      createPerson({ funktion: 'Helfer' }),
      createPerson({ funktion: 'Helfer' }),
    ];

    // When
    const staerke = berechneStaerke(personen);

    // Then
    expect(staerke).toEqual({ fuehrer: 1, unterfuehrer: 1, helfer: 2, gesamt: 4 });
  });
});
```

### Integration Tests (Target: 20% of tests)

**Focus Areas:**
- TransactionalCommandHandler + Outbox Pattern
- M:N-Relationen (RolleQualifikation, StammPersonQualifikation)
- Event Handlers (EtbAutoCreationHandler)
- Prisma Queries + DB Constraints

**Pattern:**
```typescript
describe('TransactionalCommandHandler Integration', () => {
  it('should rollback both entity and outbox on failure', async () => {
    // Given
    const command = new ErfasseFahrzeugCommand({ /* invalid data */ });

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);

    // Verify no orphaned outbox events
    const outboxEvents = await prisma.outboxEvent.findMany({ where: { aggregateId: command.einsatzId } });
    expect(outboxEvents).toHaveLength(0);
  });
});
```

### E2E Tests (Target: 10% of tests)

**Focus Areas:**
- Critical User Journeys (QR-Scan, Rollenzuweisung, Dashboard)
- Performance NFRs (NFR1-5)
- FullScreen/Compact Mode
- Tauri Native Features (Kamera, Keychain)

**Pattern:**
```typescript
// tests/e2e/kraefte/qr-scan.spec.ts
test.describe('QR-Code Helfer-Registrierung', () => {
  test('NFR3: QR-Scan bis Erfassung <3s @p0 @performance', async ({ page }) => {
    const qrData = generateDrkQrCode({ vorname: 'Max', nachname: 'Mustermann' });

    const start = Date.now();

    // Scan QR-Code (mocked in E2E)
    await page.evaluate((data) => window.__TEST_QR_SCAN__(data), qrData);

    // Wait for registration confirmation
    await expect(page.getByText('Person registriert')).toBeVisible();

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000); // NFR3
  });
});
```

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: `docs/prd.md`
- Epic: `docs/epics.md`
- Architecture: `docs/architecture-kraefte.md`
- UX Design: `docs/ux-design-specification.md`

### FR-to-Epic Coverage Map

| FR | Epic | Covered by Test |
|----|------|-----------------|
| FR1 | 3 | TC-P1-009 |
| FR2 | 3 | TC-P1-010 |
| FR3 | 3 | TC-P1-011 |
| FR4 | 3 | TC-P1-011 |
| FR5 | 3 | TC-P1-009 |
| FR6 | 4 | TC-P0-011 |
| FR7 | 4 | TC-P1-013 |
| FR8 | 4 | TC-P1-014 |
| FR9 | 4 | TC-P0-012 |
| FR10 | 4 | TC-P0-011 |
| FR11 | 5 | TC-P1-017 |
| FR12 | 5 | TC-P1-018 |
| FR13 | 5 | TC-P0-013 |
| FR14 | 5 | TC-P1-017 |
| FR15 | 6 | TC-P0-017 |
| FR16-18 | 6 | TC-P0-017 |
| FR19-24 | 6 | TC-P0-016, TC-P1-020, TC-P1-021 |
| FR25-26 | 8 | TC-P1-029, TC-P1-030, TC-P1-031 |
| FR27-31 | 3-5 | TC-P0-007, TC-P0-008, TC-P0-009 |
| FR32-33 | 2 | TC-P1-006, TC-P1-007 |
| FR34-37 | 1 | TC-P1-001, TC-P1-002, TC-P1-003, TC-P1-004 |
| FR38-40 | 7 | TC-P1-025, TC-P1-026, TC-P1-027 |
| FR41 | 4 | TC-P0-012 |

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `.bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
