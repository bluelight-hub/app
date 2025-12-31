# Story TD1.4: Biome Logger Rule

Status: Ready for Review

## Story

As a **Developer**,
I want **eine Biome Lint Rule, die direkte `new Logger()` Instanziierung verbietet**,
so that **Logger konsequent via Dependency Injection injiziert werden und Testbarkeit sowie Austauschbarkeit gewährleistet sind**.

## Hintergrund

### Problem

Das Backend enthält **126 Dateien** mit dem Anti-Pattern `new Logger()`:

| Layer | Violations | Details |
|-------|-----------|---------|
| Application | 71 | Handler, Commands, Queries |
| Infrastructure | 26 | Repositories, Services, Adapters |
| Module | 21 | Controller, Guards |
| **Gesamt** | **118** | Ohne berechtigte Ausnahmen |

```typescript
// ❌ ANTI-PATTERN
@Injectable()
export class CreateEinsatzHandler {
  private readonly logger = new Logger(CreateEinsatzHandler.name);
}
```

**Probleme:** Keine Testbarkeit, Tight Coupling, DI-Verletzung, kein zentrales Log Level Management.

### Korrektes Pattern

```typescript
// ✅ RICHTIG - via DI
@Injectable()
export class CreateEinsatzHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}
}
```

**Infrastruktur bereits vorhanden:**
- `ILogger` Port: `src/domain/ports/i-logger.port.ts`
- `NestLoggerAdapter`: `src/infrastructure/common/adapters/nest-logger.adapter.ts`
- `LOGGER` Token: `src/infrastructure/di-tokens.ts`

## Acceptance Criteria

### AC1: Application Layer Rule
- [x] `paths` Config mit `importNames: ["Logger"]` für `@nestjs/common`
- [x] **Merge in bestehenden Override 7** (biome.json:112-148)
- [x] Message: "❌ Logger via DI: @Inject(LOGGER) private readonly logger: ILogger"

### AC2: Infrastructure Layer Rule
- [x] Neuer Override für `src/infrastructure/**/*.ts`
- [x] Ausnahme: `src/infrastructure/common/adapters/**/*.ts`
- [x] Message: "❌ Infrastructure: Logger via DI, außer in Adapters"

### AC3: Module Layer Rule
- [x] Neuer Override für `src/modules/**/*.ts`
- [x] Message: "❌ Module Layer: Logger via DI mit @Inject(LOGGER)"

### AC4: Ausnahmen
- [x] `src/main.ts` - Bootstrap (kein DI verfügbar)
- [x] `src/cli/**/*.ts` - CLI vor App Init
- [x] `**/*.spec.ts`, `**/*.test.ts` - Tests
- [x] `src/infrastructure/common/adapters/**/*.ts` - Adapter

### AC5: Lint-Verification
- [x] `pnpm --filter @bluelight-hub/backend lint:check` meldet ~118 Violations (116 gefunden ✅)
- [x] Pre-commit Hook greift bei neuen Violations

## Tasks / Subtasks

- [x] Task 1: Override 7 erweitern (AC: 1)
  - [x] `paths` Block zu bestehendem noRestrictedImports hinzufügen
  - [x] NICHT neuen Override erstellen

- [x] Task 2: Infrastructure Override erstellen (AC: 2)
  - [x] Neuer Override mit Adapter-Ausnahme via `!includes`

- [x] Task 3: Module Override erstellen (AC: 3)
  - [x] Neuer Override für `src/modules/**/*.ts`

- [x] Task 4: Ausnahmen-Overrides (AC: 4)
  - [x] main.ts Override
  - [x] CLI Override (prüfen ob bereits vorhanden)

- [x] Task 5: Verification (AC: 5)
  - [x] Lint ausführen, Violations zählen
  - [x] Erwartung: Application=71, Infrastructure=26, Module=21

## Dev Notes

### ⛔ DO NOT

- **NICHT** neuen Override für Application Layer erstellen → Override 7 existiert bereits!
- **NICHT** `importNames` in `patterns` Array verwenden → gehört zu `paths`!
- **NICHT** Tests oder Adapters in die Rule einschließen

### Bestehender Application Layer Override (biome.json:112-148)

```json
{
  "includes": [
    "src/application/**/*.handler.ts",
    "src/application/**/*.command.ts",
    "src/application/**/*.query.ts",
    "src/application/**/*.service.ts",
    "src/application/**/common/**/*.ts"
  ],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "patterns": [
              // ... bestehende Infrastructure/Prisma Patterns
            ]
          }
        }
      }
    }
  }
}
```

### Biome 2.x Syntax: paths mit importNames

Biome 2.x verwendet `importNames` innerhalb von `paths` (NICHT `patterns`):

```json
{
  "noRestrictedImports": {
    "level": "error",
    "options": {
      "paths": {
        "@nestjs/common": {
          "importNames": ["Logger"],
          "message": "❌ Logger via DI: @Inject(LOGGER) private readonly logger: ILogger"
        }
      },
      "patterns": [
        // bestehende patterns bleiben unverändert
      ]
    }
  }
}
```

### Copy-Paste Config: Override 7 Erweiterung

**Füge `paths` Block zum bestehenden Override 7 hinzu (biome.json:119):**

```json
{
  "includes": [
    "src/application/**/*.handler.ts",
    "src/application/**/*.command.ts",
    "src/application/**/*.query.ts",
    "src/application/**/*.service.ts",
    "src/application/**/common/**/*.ts"
  ],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@nestjs/common": {
                "importNames": ["Logger"],
                "message": "❌ Application Layer: Logger via DI injizieren mit @Inject(LOGGER) aus @infrastructure/di-tokens"
              }
            },
            "patterns": [
              {
                "group": [
                  "@infrastructure/alert/*",
                  "@infrastructure/auth/*",
                  "@infrastructure/common/*",
                  "@infrastructure/einsatz/*",
                  "@infrastructure/etb/*",
                  "@infrastructure/events/*",
                  "@infrastructure/geocoding/*",
                  "@infrastructure/kraefte/*",
                  "@infrastructure/outbox/*",
                  "@infrastructure/repositories/*",
                  "@infrastructure/user/*",
                  "@infrastructure/index",
                  "@infrastructure/lagekarte-infrastructure.module"
                ],
                "message": "❌ Application layer MUST NOT import from Infrastructure layer (except @infrastructure/di-tokens, @infrastructure/database). Use DI via Repository interfaces."
              },
              {
                "group": ["@prisma/*"],
                "message": "❌ Application layer MUST NOT depend on Prisma directly (use Repository interfaces and DI instead)"
              }
            ]
          }
        }
      }
    }
  }
}
```

**Hinweis:** `@infrastructure/kraefte/*` wurde zur bestehenden Blacklist hinzugefügt (fehlte bisher).

### Neuer Override: Infrastructure Layer

```json
{
  "includes": [
    "src/infrastructure/**/*.ts",
    "!src/infrastructure/**/*.spec.ts",
    "!src/infrastructure/**/*.test.ts",
    "!src/infrastructure/common/adapters/**/*.ts"
  ],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@nestjs/common": {
                "importNames": ["Logger"],
                "message": "❌ Infrastructure Layer: Logger via DI injizieren mit @Inject(LOGGER), außer in Adapters"
              }
            }
          }
        }
      }
    }
  }
}
```

### Neuer Override: Module Layer

```json
{
  "includes": [
    "src/modules/**/*.ts",
    "!src/modules/**/*.spec.ts",
    "!src/modules/**/*.test.ts"
  ],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@nestjs/common": {
                "importNames": ["Logger"],
                "message": "❌ Module Layer: Logger via DI injizieren mit @Inject(LOGGER)"
              }
            }
          }
        }
      }
    }
  }
}
```

### Neuer Override: Ausnahmen (main.ts)

```json
{
  "includes": ["src/main.ts", "src/main-cli.ts", "src/main-cli-archive.ts"],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": "off"
      }
    }
  }
}
```

### Erwartete Violations nach Layer

| Layer | Dateien | Erwartete Violations |
|-------|---------|---------------------|
| Application | 71 | 71 (alle Handler) |
| Infrastructure | 26 | ~20 (ohne Adapter) |
| Module | 21 | 21 (Controller) |
| CLI | 5 | 0 (Ausnahme) |
| main.ts | 3 | 0 (Ausnahme) |
| Adapters | 1 | 0 (Ausnahme) |
| **Gesamt erwartet** | | **~112** |

### Verification Command

```bash
# Nach Rule-Aktivierung:
pnpm --filter @bluelight-hub/backend lint:check 2>&1 | grep -c "Logger via DI"

# Erwartung: ~112 Violations
# (Bestehende Violations bleiben - kein Fix in dieser Story)
```

### References

- [Biome noRestrictedImports Docs](https://biomejs.dev/linter/rules/no-restricted-imports/)
- [Biome PR #4596: importNames Feature](https://github.com/biomejs/biome/pull/4596)
- `packages/backend/biome.json` - Bestehende Konfiguration (Override 7: Lines 112-148)

## Scope-Hinweis

Diese Story fügt nur die Lint-Rule hinzu. Das Refactoring der bestehenden Violations ist ein separater Tech Debt Task.

### Completion Notes List

**Implementierung abgeschlossen am 2025-12-29:**

1. **Override 7 erweitert** (Application Layer):
   - `paths` Block mit `importNames: ["Logger"]` für `@nestjs/common` hinzugefügt
   - `@infrastructure/kraefte/*` zur bestehenden Blacklist ergänzt

2. **Neue Overrides hinzugefügt:**
   - Infrastructure Override (Lines 156-179): Erfasst `src/infrastructure/**/*.ts` mit Ausnahme für Adapters und Tests
   - Module Override (Lines 181-203): Erfasst `src/modules/**/*.ts` mit Test-Ausnahmen
   - Ausnahmen Override (Lines 205-214): `src/main.ts`, `src/main-cli.ts`, `src/main-cli-archive.ts`

3. **Verification:**
   - 116 Logger-Violations gefunden (erwartet: ~112-118) ✅
   - 126 `new Logger()` Vorkommen im Code (Differenz = berechtigte Ausnahmen)

### File List

**Geänderte Dateien:**
- `packages/backend/biome.json` (Override 7 erweitert + 3 neue Overrides hinzugefügt)

**Referenz-Dateien:**
- `packages/backend/src/domain/ports/i-logger.port.ts`
- `packages/backend/src/infrastructure/di-tokens.ts`
- `packages/backend/src/infrastructure/common/adapters/nest-logger.adapter.ts`
