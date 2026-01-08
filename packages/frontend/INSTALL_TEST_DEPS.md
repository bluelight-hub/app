# Test Infrastructure Setup - Installation Instructions

## Installation

Um die Test-Infrastruktur zu aktivieren, führe folgenden Befehl aus:

```bash
cd /Users/rubeen/dev/personal/bluelight-hub/packages/frontend
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8
```

## Verifizierung

Nach der Installation verifiziere das Setup:

```bash
# Tests ausführen (sollte 7 Tests bestehen)
pnpm test --run

# Test UI öffnen
pnpm test:ui
```

## Erwartete Output

```
✓ src/test/setup.test.ts (5 tests)
✓ src/test/utils.test.tsx (2 tests)

Test Files  2 passed (2)
     Tests  7 passed (7)
```

## Erstelle Dateien

Die folgenden Dateien wurden bereits erstellt:

- ✅ `vitest.config.ts` - Vitest Konfiguration
- ✅ `src/test/setup.ts` - Test Setup (globals, mocks)
- ✅ `src/test/utils.tsx` - Test Utilities (renderWithProviders, etc.)
- ✅ `src/test/setup.test.ts` - Setup Verification Tests
- ✅ `src/test/utils.test.tsx` - Utils Verification Tests
- ✅ `src/test/README.md` - Test Documentation
- ✅ `package.json` - Scripts hinzugefügt (test, test:ui, test:coverage)

## Next Steps

Nach erfolgreicher Installation:

1. **Erste Component Tests schreiben** (siehe `src/test/README.md`)
2. **Query Hook Tests hinzufügen** für TanStack Query Hooks
3. **Coverage Thresholds konfigurieren** in `vitest.config.ts`
4. **CI/CD Integration** für automatisierte Tests

## Troubleshooting

### "Cannot find module '@testing-library/jest-dom/vitest'"

Falls dieser Fehler auftritt, stelle sicher dass `@testing-library/jest-dom` installiert ist:

```bash
pnpm add -D @testing-library/jest-dom
```

### "Cannot find module 'vitest'"

Falls dieser Fehler auftritt, stelle sicher dass alle Dependencies installiert sind:

```bash
pnpm install
```

### Tests laufen nicht

Prüfe ob Vitest korrekt konfiguriert ist:

```bash
# Zeige Vitest Config
cat vitest.config.ts

# Zeige installierte Dependencies
pnpm list vitest @testing-library/react
```
