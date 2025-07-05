---
description: ENFORCE systematische Analyse und Verbesserung der Test-Coverage bei ungetesteten Codeteilen
globs:
- **/*.spec.ts
- **/*.test.ts
- **/*.spec.tsx
- **/*.test.tsx
- **/jest.config.js
- **/jest.config.ts
alwaysApply: false
---

# 910-test-coverage-analysis

## Context
Test-Coverage ist ein wichtiger Indikator für die Qualität und Robustheit des Codes. Ohne systematische Überwachung der Coverage bleiben kritische Codeteile möglicherweise ungetestet, was zu ungeplanten Fehlern und technischen Schulden führen kann.

## Requirements

1. **Coverage-Analyse**
   - Bei jedem größeren Feature oder nach einer Serie von Bugfixes MUSS eine Coverage-Analyse durchgeführt werden
   - NUTZE `pnpm test --coverage` zur Generierung von Coverage-Berichten

2. **Coverage-Ziele**
   - Frontend: 
     - Komponenten: 85% Coverage
     - Hooks: 90% Coverage
     - Utilities: 95% Coverage
   - Backend:
     - Services: 90% Coverage
     - Controller: 85% Coverage
     - Guards/Interceptors: 95% Coverage

3. **Identifikation ungetesteter Bereiche**
   - INTEGRIERE Coverage-Tools in CI/CD
   - PRIORISIERE untestete Codeteile nach folgenden Kriterien:
     - Kritikalität für Geschäftsprozesse
     - Komplexität (zyklomatische Komplexität > 10 priorisieren)
     - Häufigkeit der Änderungen (oft geänderte Dateien)

4. **Automatisierung**
   - ERSTELLE bei neu identifizierten untesteten kritischen Pfaden automatisch Issues mit "test-coverage" Label
   - ETABLIERE Coverage-Schwellenwerte als Teil der CI/CD-Pipeline

## Examples

### Good Example
```typescript
// In CI-Pipeline (z.B. GitHub Actions)
jobs:
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test --coverage
      - name: Generate Coverage Report
        run: pnpm coverage-report
      - name: Check Coverage Thresholds
        run: |
          if [ $(jq '.total.lines.pct' coverage/coverage-summary.json) -lt 85 ]; then
            echo "Line coverage below threshold!"
            exit 1
          fi
      - name: Flag Untested Areas
        run: node scripts/flag-untested-areas.js
```

### Bad Example
```typescript
// Manuelles und sporadisches Prüfen der Coverage
// Kein systematisches Tracking
// Keine Automatisierung
// Keine definierten Schwellenwerte

// Unzureichender Test
describe('UserService', () => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  // Keine weiteren Tests für Methoden und Edge Cases
});
```

## Related
- 900-test-execution
- 300-atomic-design-tests
- backend-architecture 