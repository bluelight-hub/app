## 📋 Beschreibung

Update und Re-aktivierung aller deaktivierten Audit Logging Tests für die neue AuditInterceptor API mit Decorator-Support und erweiterte Konfiguration.

## 🎯 Ziel

- **Hauptfunktion:** Vollständige Funktionsfähigkeit der Test-Suite wiederherstellen
- **Sekundärfunktion:** Integration der neuen AuditInterceptor API testen
- **Qualitätssicherung:** 100% Pass-Rate für alle Audit-Tests erreichen

## 📝 Requirements

### Funktionale Anforderungen:

- [ ] E2E Tests (audit-logging.e2e-spec.ts) aktualisieren
- [ ] Integration Tests (audit-integration.spec.ts) migrieren
- [ ] Performance Tests (audit-performance.spec.ts) stabilisieren
- [ ] Decorator-basierte Tests (@AuditSkip, @AuditTag) hinzufügen
- [ ] Test Utils (auditTestUtils.ts) implementieren

### Technische Anforderungen:

- [ ] AuditLogInterceptor → AuditInterceptor Migration
- [ ] Neue Konfigurationsprovider (AuditConfigService) integrieren
- [ ] Performance-Schwellenwerte konfigurierbar machen
- [ ] CI-Integration ohne Flaky-Tests
- [ ] Test Coverage ≥ 90% für Audit Interceptor

## 🔗 API Integration

- Neue AuditInterceptor Constructor API
- Decorator-Support (@AuditSkip, @AuditTag)
- Erweiterte Audit Record Shape (metadata, correlationId)
- Konfigurierbare Exclusion Paths

## 📚 Dokumentation

- [ ] TESTING.md um "Audit Tests" Sektion erweitern
- [ ] Threshold-Konfiguration dokumentieren
- [ ] Decorator-Verwendung in Test Stubs beschreiben

## 🚫 Out of Scope

- Neue Audit-Features implementieren
- Audit-Interceptor-Logik selbst ändern
- Performance-Optimierungen am Interceptor

## ✅ Definition of Done

### Unit Tests

- [ ] `npm run test:audit` läuft mit 100% Pass-Rate
- [ ] Alle `describe.skip` und `it.skip` Marker entfernt

### E2E Tests

- [ ] `npm run test:e2e -- audit-logging` erfolgreich
- [ ] Exakt ein Audit-Eintrag pro Request (außer bei @AuditSkip)
- [ ] Audit_logs Tabelle korrekt befüllt

### Performance Tests

- [ ] audit-performance.spec.ts läuft 3 Iterationen erfolgreich
- [ ] P95 Execution Time < AUDIT_PERF_BUDGET
- [ ] Keine hängenden Handles nach Refactor

### CI Integration

- [ ] GitHub Actions ohne Skip-Marker erfolgreich
- [ ] Matrix ubuntu-latest/node-18 und node-20 bestanden
- [ ] Keine Flaky-Retries notwendig

### Code Quality

- [ ] `npm run lint -- --fix` ohne Errors
- [ ] Test Coverage ≥ 90% für Audit Interceptor
- [ ] Obsolete Mocks/Helper entfernt

## 📋 Tasks/Subtasks

### 1. API-Analyse

- [ ] Neue AuditInterceptor Constructor Signature analysieren
- [ ] Decorator-Namen und Konfiguration verstehen
- [ ] Neue Audit Record Felder identifizieren

### 2. E2E Tests Migration

- [ ] AuditLogInterceptor → AuditInterceptor ersetzen
- [ ] TestAppModule Konfiguration aktualisieren
- [ ] Skip-Marker entfernen und Assertions anpassen
- [ ] @AuditSkip und @AuditTag Test Cases hinzufügen

### 3. Integration Tests Update

- [ ] AuditService Mocks erweitern
- [ ] createTestModule Helper aktualisieren
- [ ] Dynamic Matchers (expect.objectContaining) implementieren

### 4. Performance Tests Stabilisierung

- [ ] Deterministic Seeding hinzufügen
- [ ] performance.mark/measure implementieren
- [ ] Jest globalSetup für DB-Prep konfigurieren
- [ ] AUDIT_PERF_BUDGET Environment Variable

### 5. Test Utils Entwicklung

- [ ] auditTestUtils.ts erstellen
- [ ] buildAuditEntryMatcher() implementieren
- [ ] tsconfig.json für Decorator-Helpers erweitern

### 6. Clean-up

- [ ] Obsolete Mocks/Helper löschen
- [ ] Lint-Fixes anwenden
- [ ] Unused Variables entfernen

### 7. CI Integration

- [ ] `CI=true jest --maxWorkers=1` Override entfernen
- [ ] Code-Owners Review konfigurieren

### 8. Dokumentation

- [ ] TESTING.md "Audit Tests" Sektion
- [ ] Threshold-Konfiguration dokumentieren
- [ ] Decorator-Usage-Beispiele
