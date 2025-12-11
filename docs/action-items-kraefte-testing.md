# Action Items: Kräfte-Management Testing

**Datum:** 2025-12-10
**Priorität:** Sprint-Planung berücksichtigen

---

## Sofort-Maßnahmen (Diese Woche)

### 1. Team Review Meeting einberufen
- [ ] Review-Summary präsentieren (`docs/test-design-review-summary.md`)
- [ ] Kritische Risiken durchsprechen
- [ ] Offene Entscheidungen klären (HiOrg-Mock, E2E-Framework, Test-Daten)

### 2. Sprint Backlog vorbereiten
- [ ] 3 Stories für Sprint 1 kritische Risiken erstellen:
  - Story: AdminJwtAuthGuard implementieren (R-E1-001)
  - Story: UNIQUE Constraint Rollenbesetzung (R-E5-002)
  - Story: GeoCoordinate Value Object (R-E8-001)

---

## Sprint 1 - Kritische Security & Data Integrity

### Stories zu erstellen

| Story | Risiko | Aufwand | Acceptance Criteria |
|-------|--------|---------|---------------------|
| **Implementiere AdminJwtAuthGuard** | R-E1-001 | 4h | Admin-Endpoints geben 403 für Non-Admin |
| **UNIQUE Constraint Rollenbesetzung** | R-E5-002 | 6h | Concurrent Requests → genau 1 Eintrag |
| **GeoCoordinate Value Object** | R-E8-001 | 4h | toGeoJsonCoordinates() = [lng, lat] |

### Definition of Done
- [ ] Code implementiert nach Mitigation-Plan
- [ ] Unit Tests geschrieben (AAA Pattern)
- [ ] Integration Tests für kritische Pfade
- [ ] PR Review bestanden
- [ ] Biome lint check passed

---

## Sprint 2 - Performance & Business Logic

### Stories zu erstellen

| Story | Risiko | Aufwand | Acceptance Criteria |
|-------|--------|---------|---------------------|
| **ETB Auto-Creation Performance** | R-E3-001 | 6h | 20 parallele Updates <1s je |
| **Dashboard Query Optimierung** | R-E6-001 | 8h | Load <2s bei 20 Fahrzeuge/80 Personen |
| **Fahrzeug-Archivierung Validierung** | R-E2-003 | 4h | Archivierung blockiert bei aktivem Einsatz |
| **Qualifikations-Validierung Lock** | R-E5-001 | 6h | Optimistic Locking verhindert Race |

---

## Sprint 3 - Integration & Stabilität

### Stories zu erstellen

| Story | Risiko | Aufwand | Acceptance Criteria |
|-------|--------|---------|---------------------|
| **HiOrg Qualifikations-Mapping** | R-E7-004 | 8h | Fuzzy Match + manuelles Mapping UI |
| **WebSocket Lagekarte Integration** | R-E8-002 | 10h | 50 Connections ohne Pool Exhaustion |

---

## Test-Infrastruktur Setup

### Test Framework (parallel zu Sprint 1)
- [ ] Jest Konfiguration für Unit/Integration Tests prüfen
- [ ] Playwright Setup für E2E Tests
- [ ] k6 für Performance Tests evaluieren
- [ ] Test Data Factories implementieren:
  - `createQualifikation()`
  - `createFahrzeugtyp()`
  - `createStammFahrzeug()`
  - `createStammPerson()`
  - `createEinsatzFahrzeug()`
  - `createEinsatzPerson()`
  - `generateDrkQrCode()`

### CI Pipeline Anpassungen
- [ ] P0 Tests als Required Check für PRs
- [ ] Performance Tests in Nightly Build
- [ ] Test Coverage Reporting aktivieren

---

## Dokumente erstellt

| Dokument | Pfad | Zweck |
|----------|------|-------|
| **Test Design** | `docs/test-design-kraeftemanagement.md` | Vollständige Testplanung |
| **Review Summary** | `docs/test-design-review-summary.md` | Team-Präsentation |
| **Mitigation Plan** | `docs/mitigation-plan-kritische-risiken.md` | Implementierungsdetails |
| **Action Items** | `docs/action-items-kraefte-testing.md` | Dieses Dokument |

---

## Metriken für Erfolg

### Quality Gates
- P0 Tests: 100% Pass
- P1 Tests: ≥95% Pass
- Security Tests: 100% Pass
- NFR1-5 Performance: 100% erreicht

### Coverage Targets
- Critical Paths: ≥80%
- Business Logic: ≥70%
- Edge Cases: ≥50%

---

## Nächste Schritte Checkliste

### Heute
- [x] Test Design erstellt
- [x] Review Summary erstellt
- [x] Mitigation Plan erstellt
- [x] Action Items definiert
- [ ] Team über Ergebnisse informieren

### Diese Woche
- [ ] Review Meeting durchführen
- [ ] Sprint 1 Stories in Backlog
- [ ] Test Framework Setup starten

### Sprint 1
- [ ] 3 kritische Risiken mitigieren
- [ ] P0 Tests für Epic 1 implementieren
- [ ] Test Data Factories bereitstellen

---

*Erstellt mit BMad TEA Agent | Version 4.0*
