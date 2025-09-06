# E2E Tests für Einsatz-Workflow

## Übersicht

Umfassende End-to-End Tests für die kritische User Journey der minimalen Einsatz-Erstellung und -Bearbeitung mit Playwright.

## Test-Struktur

```
e2e/
├── fixtures/          # Wiederverwendbare Test-Fixtures und Daten
├── pages/            # Page Object Models
├── setup/            # Global Setup/Teardown
└── tests/            # Test-Spezifikationen
    ├── einsatz-workflow.spec.ts      # Haupt-Workflow Tests
    ├── einsatz-performance.spec.ts   # Performance Tests
    └── einsatz-accessibility.spec.ts # Accessibility Tests
```

## Verfügbare Tests

### 1. Workflow Tests (`einsatz-workflow.spec.ts`)
- **Test 1:** Minimale Einsatz-Erstellung (nur optionale Felder)
- **Test 2:** Inline-Editing in der DetailView
- **Test 3:** Kompletter Workflow (Erstellung → Bearbeitung → Vervollständigung)
- **Test 4:** Dashboard Navigation und Filterung
- **Test 5:** Error Handling bei Netzwerkfehlern
- **Test 6:** Responsive Design auf Mobile
- **Test 7:** Keyboard Navigation
- **Test 8:** Visual Regression Testing

### 2. Performance Tests (`einsatz-performance.spec.ts`)
- Dashboard-Performance mit 100+ Einträgen
- Such-Performance mit großen Datenmengen
- Filter-Operationen Optimierung
- DetailView Ladezeiten
- Optimistic Updates
- Memory Usage Monitoring
- Bundle Size Metrics

### 3. Accessibility Tests (`einsatz-accessibility.spec.ts`)
- WCAG Standards Compliance
- Screen Reader Support
- Keyboard Navigation
- Focus Management
- Color Contrast
- ARIA Labels und Landmarks
- Responsive Accessibility

## Ausführung

### Alle Einsatz-Tests ausführen
```bash
pnpm test:e2e:einsatz
```

### Performance-Tests
```bash
pnpm test:e2e:performance
```

### Accessibility-Tests
```bash
pnpm test:e2e:a11y
```

### Mit UI-Modus (interaktiv)
```bash
pnpm test:e2e:ui
```

### Debug-Modus
```bash
pnpm test:e2e:debug
```

### Visual Regression Snapshots aktualisieren
```bash
pnpm test:e2e:update-snapshots
```

## CI/CD Integration

Die Tests werden automatisch bei Pull Requests ausgeführt:

- **Parallelisierung:** 4 Shards für schnellere Ausführung
- **Browser:** Chromium, Firefox, Safari, Mobile
- **Retry:** 3 Versuche bei flaky Tests
- **Artifacts:** Screenshots und Videos bei Fehlern
- **Reports:** HTML-Reports als GitHub Actions Artifacts

## Page Objects

### EinsatzDashboardPage
- Navigation und Suche
- Filter-Operationen
- Einsatz-Erstellung
- Liste und Karten-Interaktion

### QuickCreateModalPage
- Minimale Erstellung
- Vollständige Erstellung
- Validierung
- Modal-Interaktionen

### EinsatzDetailPage
- Inline-Editing
- Status-Updates
- Vollständigkeits-Tracking
- Navigation

## Test-Daten

### Fixtures
```typescript
// Verwendung von Fixtures
import { test } from '../fixtures/einsatz.fixtures';

test('My test', async ({ dashboardPage, testEinsatzData }) => {
  // Fixtures sind automatisch verfügbar
  await dashboardPage.goto();
  await dashboardPage.openCreateModal();
});
```

### Seed-Funktionen
```typescript
// Große Datenmengen für Performance-Tests
await seedDatabase(page, 100); // Erstellt 100 Test-Einsätze
```

## Best Practices

1. **Page Objects verwenden:** Keine direkten Selektoren in Tests
2. **Fixtures nutzen:** Für konsistente Test-Daten
3. **Parallelisierung:** Tests sollten unabhängig laufen
4. **Cleanup:** Jeder Test räumt nach sich auf
5. **Timeouts:** Angemessene Timeouts für verschiedene Operationen
6. **Assertions:** Spezifische und aussagekräftige Assertions

## Troubleshooting

### Tests schlagen lokal fehl
1. Stelle sicher, dass Backend und Frontend laufen:
   ```bash
   pnpm dev
   ```
2. Prüfe die Test-User Credentials in `.env.test`
3. Lösche Test-Datenbank und starte neu

### Visual Regression Fehler
1. Prüfe ob UI-Änderungen beabsichtigt sind
2. Update Snapshots wenn Änderungen korrekt:
   ```bash
   pnpm test:e2e:update-snapshots
   ```

### Performance Tests zu langsam
1. Reduziere Datenmenge für lokale Tests
2. Nutze CI für vollständige Performance-Tests
3. Prüfe Database-Indizes

## Erweiterung

### Neue Tests hinzufügen
1. Erstelle neue Spec-Datei in `tests/`
2. Nutze existierende Page Objects oder erstelle neue
3. Verwende Fixtures für Test-Daten
4. Füge Script in `package.json` hinzu

### Page Objects erweitern
1. Füge neue Methoden zu existierenden Page Objects hinzu
2. Halte Methoden klein und fokussiert
3. Verwende aussagekräftige Namen
4. Dokumentiere komplexe Interaktionen

## Metriken

### Ziel-Metriken
- **Ladezeit Dashboard:** < 3s mit 100+ Einträgen
- **Suchlatenz:** < 1s
- **Inline-Edit Response:** < 100ms (optimistic)
- **Bundle Size:** < 500KB main bundle
- **Accessibility Score:** 100% WCAG AA

### Monitoring
- GitHub Actions Artifacts für Test-Reports
- Screenshots bei Fehlern
- Performance-Metriken in CI-Logs
- Visual Regression Diffs