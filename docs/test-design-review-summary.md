# Test Design Review Summary - Kräfte-Management-Modul

**Datum:** 2025-12-10
**Für:** Team Review Meeting
**Status:** Zur Freigabe vorgelegt

---

## 1. Executive Overview (2 Min)

### Was wurde analysiert?
- **8 Epics** des Kräfte-Management-Moduls
- **41 Functional Requirements** (FR1-FR41)
- **22 Non-Functional Requirements** (NFR1-NFR22)

### Kernergebnisse

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| **Identifizierte Risiken** | 53 | Umfassende Analyse |
| **Kritische Risiken (Score=9)** | 9 | ⚠️ Sofortige Maßnahmen erforderlich |
| **Hohe Risiken (Score≥6)** | 25 | Sprint-Planung berücksichtigen |
| **Geplante Test-Szenarien** | 83 | Vollständige Abdeckung |
| **Geschätzter Aufwand** | ~143h (~18 Tage) | Realistisch für MVP |

---

## 2. Kritische Risiken - BLOCKER (5 Min)

Diese 9 Risiken mit **Score=9** müssen vor Go-Live mitigiert werden:

### 🔴 Security (2 Risiken)

| ID | Beschreibung | Epic | Auswirkung |
|----|--------------|------|------------|
| **R-E1-001** | Fehlende RBAC für Admin-Funktionen | 1 | Unautorisierter Zugriff auf Stammdaten-Verwaltung |
| **R-E8-005** | Public API Exposure ohne Auth | 8 | Lagekarte-Daten öffentlich einsehbar |

**Empfehlung:** AdminJwtAuthGuard implementieren + API Guards für alle Endpoints

### 🟠 Data Integrity (3 Risiken)

| ID | Beschreibung | Epic | Auswirkung |
|----|--------------|------|------------|
| **R-E5-002** | Race Condition bei Rollenzuweisung | 5 | Doppelte LNA-Besetzung möglich |
| **R-E7-004** | HiOrg Qualifikations-Mapping fehlerhaft | 7 | Duplikate bei Import |
| **R-E8-001** | GeoJSON Koordinaten vertauscht | 8 | Fahrzeuge auf falscher Position |

**Empfehlung:** DB Constraints + Mapping-Tabelle + Unit Tests für GeoJSON

### 🟡 Performance (2 Risiken)

| ID | Beschreibung | Epic | NFR | Auswirkung |
|----|--------------|------|-----|------------|
| **R-E3-001** | Transaction Timeout bei ETB-Creation | 3 | NFR4 (<1s) | Status-Update verzögert |
| **R-E6-001** | Dashboard Load >2s | 6 | NFR1 (<2s) | Schlechte UX bei Großlage |

**Empfehlung:** Async Outbox + Prisma select Optimierung

### 🟣 Business Logic (2 Risiken)

| ID | Beschreibung | Epic | Auswirkung |
|----|--------------|------|------------|
| **R-E2-003** | Archiviertes Fahrzeug in aktivem Einsatz | 2 | Inkonsistente Daten |
| **R-E5-001** | Qualifikations-Validierung Race Condition | 5 | Unqualifizierte Person auf Rolle |

**Empfehlung:** Domain-Layer Validation + Optimistic Locking

---

## 3. Test-Strategie auf einen Blick (3 Min)

### Prioritäten-Verteilung

```
P0 (Critical)  ████████████████████░░░░ 21 Tests (25%)  → Jeder Commit
P1 (High)      █████████████████████████████████████░░░ 35 Tests (42%)  → PR to main
P2 (Medium)    ████████████████████░░░░ 20 Tests (24%)  → Nightly
P3 (Low)       ████████░░░░░░░░░░░░░░░░  7 Tests (9%)   → On-Demand
```

### Test-Level-Verteilung

```
Unit Tests         ████████████████████████████████████████████████████████████████████░░░░░ 70%
Integration Tests  ██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20%
E2E Tests          ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10%
```

### NFR-Validierung

| NFR | Ziel | Test Coverage |
|-----|------|---------------|
| NFR1 | Dashboard <2s | TC-P0-016 |
| NFR3 | QR-Scan <3s | TC-P0-011 |
| NFR4 | Status-Update <1s | TC-P0-008 |
| NFR5 | Stärke-Berechnung <500ms | TC-P0-017 |

---

## 4. Aufwand nach Epic (2 Min)

| Epic | Fokus | P0 | P1 | P2+ | Gesamt | Aufwand |
|------|-------|----|----|-----|--------|---------|
| Epic 1 | Admin Config | 5 | 5 | 2 | 12 | ~20h |
| Epic 2 | Stammdaten | 1 | 6 | 3 | 10 | ~14h |
| Epic 3 | Fahrzeuge | 4 | 4 | 2 | 10 | ~22h |
| Epic 4 | Helfer | 2 | 4 | 3 | 9 | ~14h |
| Epic 5 | Rollen | 3 | 4 | 2 | 9 | ~18h |
| Epic 6 | Dashboard | 2 | 6 | 4 | 12 | ~16h |
| Epic 7 | HiOrg | 1 | 5 | 2 | 8 | ~14h |
| Epic 8 | Lagekarte | 3 | 5 | 5 | 13 | ~25h |

---

## 5. Quality Gates (1 Min)

### Go/No-Go Kriterien

- ✅ **P0 Tests**: 100% Pass (keine Ausnahmen)
- ✅ **P1 Tests**: ≥95% Pass (Waiver bei begründeten Failures)
- ✅ **Security Tests**: 100% Pass
- ✅ **NFR1-5**: Alle Performance-Ziele erreicht
- ✅ **Kritische Risiken**: 100% mitigiert oder mit Waiver

### Nicht verhandelbar

1. AdminJwtAuthGuard funktioniert (R-E1-001)
2. Keine doppelten Rollenbesetzungen möglich (R-E5-002)
3. GeoJSON-Koordinaten korrekt (R-E8-001)
4. Dashboard lädt in <2s (NFR1)

---

## 6. Offene Entscheidungen

### Zur Team-Diskussion:

1. **HiOrg-Integration (Epic 7)**
   - WireMock vs. MSW für API-Mocking?
   - Testdaten von echtem HiOrg-Server verfügbar?

2. **Performance-Tests (P0)**
   - k6 Cloud oder Self-Hosted?
   - CI-Integration oder separate Pipeline?

3. **E2E-Framework**
   - Playwright (empfohlen) vs. Cypress?
   - Tauri E2E Test Utilities bereits evaluiert?

4. **Test-Daten**
   - Faker-basierte Factories ausreichend?
   - Anonymisierte Produktionsdaten für Lasttests?

---

## 7. Nächste Schritte

### Diese Woche

- [ ] Review dieses Dokuments mit Team
- [ ] Kritische Risiken (Score=9) in Sprint Backlog
- [ ] Test-Framework Setup (Jest + Playwright)

### Sprint 1

- [ ] AdminJwtAuthGuard implementieren (R-E1-001)
- [ ] UNIQUE Constraint für Rollenbesetzung (R-E5-002)
- [ ] P0-Tests für Epic 1 schreiben

### Sprint 2

- [ ] Performance-Tests für NFR1-5 implementieren
- [ ] GeoJSON Unit Tests (R-E8-001)
- [ ] Integration Tests für Outbox Pattern

---

## Anhänge

- **Vollständiges Test Design:** `docs/test-design-kraeftemanagement.md`
- **Epics & Requirements:** `docs/epics.md`
- **Architektur:** `docs/architecture-kraefte.md`

---

*Erstellt mit BMad TEA Agent | Version 4.0*
