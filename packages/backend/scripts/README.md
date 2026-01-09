# Backend Scripts Documentation

## Übersicht

Dieses Verzeichnis enthält verschiedene Validierungs- und Hilfs-Scripts für das Backend-Projekt.

## Scripts

### DI Import Validator

**Datei:** `check-di-imports-zero-deps.ts` (Hauptdatei)

**Zweck:** Überprüft AC1-Rule: Injectable Classes müssen mit `import` importiert werden, nicht `import type`.

**Verwendung:**
```bash
# Manuell
ts-node -r tsconfig-paths/register scripts/check-di-imports-zero-deps.ts

# Via npm script
pnpm check:di:imports

# Automatisch im Pre-Commit Hook
git commit -m "..."
```

**Dokumentation:**
- [DI_IMPORT_VALIDATION.md](./DI_IMPORT_VALIDATION.md) - Technische Details
- [CLAUDE.md](../../CLAUDE.md) - AC1 Rule Erklärung
- [test-di-imports-example.ts](./test-di-imports-example.ts) - Test Cases

**Features:**
- ✅ Ultra-schnell (nur Node.js Built-ins)
- ✅ Path-Alias Support (@/, @domain/, etc.)
- ✅ Aussagekräftige Error-Messages
- ✅ Auto-Fix-Vorschläge
- ✅ Pre-Commit Hook Integration

**Status:** ✅ Produktiv

---

### JSDoc Validator

**Datei:** `find-missing-jsdoc.ts`

**Zweck:** Überprüft ob public APIs deutsche JSDoc-Kommentare haben.

**Verwendung:**
```bash
pnpm check:jsdoc           # Alle fehlenden JSDoc
pnpm check:jsdoc:public    # Nur public APIs
pnpm check:jsdoc:json      # JSON Report
```

**Status:** ✅ Produktiv

---

### Test Cases

**Datei:** `test-di-imports-example.ts`

**Zweck:** Zeigt 6 Beispiel-Szenarien für DI Import Pattern.

**Verwendung:**
```bash
ts-node scripts/test-di-imports-example.ts
```

**Output:**
- ❌ CASE 1: import type für @Injectable() (VIOLATION)
- ✅ CASE 2: import für @Injectable() (OK)
- ✅ CASE 3: import type für Interface (OK)
- ✅ CASE 4: import type für externe Package (OK)
- 🔍 CASE 5: Path-Alias Auflösung
- ❌ CASE 6: Mehrere Violations

**Status:** 📚 Dokumentation/Referenz

---

### Alternative Implementierungen

Die folgenden Dateien sind NICHT aktiv, aber dokumentieren alternative Ansätze:

**`check-di-imports-simple.ts`** (mit `glob` dependency)
- Zu langsam für Pre-Commit Hook
- Archiviert als Referenz

**`check-di-imports.ts`** (TypeScript AST-basiert)
- Zu komplex für den Use-Case
- Archiviert als Referenz

---

## Integration in Development Workflow

### Pre-Commit Hook Ablauf

```
git commit -m "..."
  ↓
.husky/pre-commit
  ├─ tsc --noEmit              (TypeScript Type Check)
  ├─ check:di:imports          (DI Import Pattern) ← NEU
  ├─ lint:deps:core            (Circular Dependencies)
  └─ lint-staged               (Biome Format/Lint)
```

### NPM Scripts

```bash
# Code Quality
pnpm lint                         # Biome lint + fix
pnpm lint:check                   # Biome check ohne fix

# Architecture
pnpm check:arch                   # Circular deps + Biome check
pnpm check:di:imports             # DI Import Pattern ← NEU
pnpm check:jsdoc                  # JSDoc Comments
pnpm lint:arch                    # Architecture Lint

# Documentation
pnpm docs:generate                # Compodoc generieren
```

---

## Konfiguration

### Path Aliases

DI Validator unterstützt diese Path-Aliases (aus `tsconfig.json`):

```typescript
@/ → src/
@domain/ → src/domain/
@application/ → src/application/
@infrastructure/ → src/infrastructure/
```

**Neue Aliases hinzufügen:**
Bearbeite `check-di-imports-zero-deps.ts`:

```typescript
const pathAliases: Record<string, string> = {
  '@/': 'src/',
  '@domain/': 'src/domain/',
  '@new-alias/': 'src/path/to/new', // ← NEU
};
```

---

## Troubleshooting

### "Command not found: ts-node"

Stelle sicher, dass ts-node installiert ist:
```bash
pnpm install
```

### "Module not found"

Nutze `-r tsconfig-paths/register` für Path-Aliases:
```bash
ts-node -r tsconfig-paths/register scripts/check-di-imports-zero-deps.ts
```

### Pre-Commit Hook läuft nicht

Stelle sicher, dass Husky initialisiert ist:
```bash
npm run prepare
```

---

## Performance

| Script | Laufzeit | Dependencies |
|--------|----------|--------------|
| check-di-imports-zero-deps.ts | 100-200ms | Nur Node.js Built-ins |
| check-di-imports-simple.ts | 200-400ms | glob package |
| check-di-imports.ts | 300-500ms | TypeScript AST |
| check:jsdoc | 500-1000ms | TypeScript Compiler |

---

## Best Practices

### 1. Regelmäßig ausführen

Vor jedem Commit:
```bash
pnpm check:di:imports    # Lokale Überprüfung
git commit -m "..."      # Automatisch im Hook
```

### 2. Custom Config

Falls Anpassungen nötig:

```bash
# Nur spezifisches Layer prüfen
grep -r "import type" src/application/ | grep @Injectable

# Mit More Context
grep -B2 -A2 "import type.*from" src/application/ | grep -v node_modules
```

### 3. Team-Kommunikation

AC1 Rule erklären:
- Zeige [DI_IMPORT_VALIDATION.md](./DI_IMPORT_VALIDATION.md)
- Referenziere [CLAUDE.md](../../CLAUDE.md) AC1 Section
- Nutze `test-di-imports-example.ts` für Beispiele

---

## Referenzen

- **Main Doc:** [DI_IMPORT_VALIDATION.md](./DI_IMPORT_VALIDATION.md)
- **Project Guide:** [CLAUDE.md](../../CLAUDE.md) - AC1 (DI Import Check)
- **Test Cases:** [test-di-imports-example.ts](./test-di-imports-example.ts)
- **NestJS Docs:** [Dependency Injection](https://docs.nestjs.com/providers)
- **TypeScript Docs:** [Type-only imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports)

---

## Maintenance

### Update Checklist

- [ ] Neue path aliases in `tsconfig.json` hinzugefügt?
  → Datei `check-di-imports-zero-deps.ts` aktualisieren
- [ ] AC1 Rule geändert?
  → Dokumentation in [CLAUDE.md](../../CLAUDE.md) aktualisieren
- [ ] Performance Problem mit Pre-Commit Hook?
  → Check [Performance](#performance) Section

---

**Letzte Aktualisierung:** 2026-01-08
**Status:** ✅ Produktiv (Story 5-7 - AC1 Rule Implementation)
