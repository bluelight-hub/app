# Validation Report: TD1.4 Biome Logger Rule

**Document:** `docs/sprint-artifacts/td1-biome-logger-rule.md`
**Checklist:** `bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-28
**Validator:** SM Agent mit 4 parallelen Subagents

---

## Summary

- **Overall:** 14/19 passed (74%)
- **Critical Issues:** 2
- **Enhancements:** 4
- **LLM Optimizations:** 3

---

## Section Results

### 1. Technical Requirements Analysis
**Pass Rate: 4/6 (67%)**

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Logger Infrastruktur dokumentiert | Lines 34-52: ILogger Port, NestLoggerAdapter, LOGGER Token korrekt referenziert |
| ✓ PASS | Anti-Pattern korrekt beschrieben | Lines 15-29: `new Logger()` Problem mit 4 Gründen erklärt |
| ✓ PASS | Korrektes Pattern gezeigt | Lines 39-47: `@Inject(LOGGER)` Beispiel vorhanden |
| ⚠ PARTIAL | Biome Syntax für importNames | Lines 168-180: **Falsche Syntax** - `importNames` gehört zu `paths`, nicht `patterns` |
| ✗ FAIL | Bestehende Override-Struktur ignoriert | Story zeigt nicht, dass Application Layer Override bereits existiert (biome.json:113-148) |
| ⚠ PARTIAL | Layer-Coverage unvollständig | @infrastructure/kraefte/* fehlt in bestehender Blacklist (biome.json:122-134) |

**Impact:** Dev Agent könnte falsche Biome-Konfiguration erstellen, die nicht funktioniert.

---

### 2. Acceptance Criteria Quality
**Pass Rate: 5/6 (83%)**

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | AC1 Application Layer Rule | Lines 55-60: Pattern, Error-Level, Message definiert |
| ✓ PASS | AC2 Infrastructure mit Ausnahmen | Lines 62-67: Adapter-Ausnahme dokumentiert |
| ✓ PASS | AC3 Module Layer Rule | Lines 69-73: Pattern definiert |
| ✓ PASS | AC4 Ausnahmen | Lines 75-80: main.ts, CLI, Tests, Adapters |
| ✓ PASS | AC5 Dokumentation | Lines 82-86: Deutsche Messages, DI-Token Referenz |
| ⚠ PARTIAL | AC6 Lint Integration | Lines 88-92: `lint:check` erwähnt, aber **keine Erwartung wie viele Violations** |

---

### 3. Task Breakdown Quality
**Pass Rate: 3/5 (60%)**

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Task 1 Override-Analyse | Lines 96-99: Strukturiert nach Layer |
| ✗ FAIL | Task 2 Pattern Konfiguration | Lines 101-104: **Falsche Biome 2.x Syntax** (`patterns` statt `paths`) |
| ✓ PASS | Task 3 Ausnahmen | Lines 106-110: Alle Ausnahmen gelistet |
| ⚠ PARTIAL | Task 4 Lint Verification | Lines 112-115: Keine **erwartete Violation-Anzahl** pro Layer |
| ✓ PASS | Task 5 Dokumentation | Lines 117-119: CLAUDE.md Update erwähnt |

---

### 4. Dev Notes Completeness
**Pass Rate: 2/2 (100%)**

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Bestehende biome.json Struktur | Lines 123-151: Override-Beispiel gezeigt |
| ✓ PASS | Violations-Übersicht | Lines 201-211: Tabelle mit Layer-Aufschlüsselung |

---

### 5. LLM Developer Agent Optimization
**Pass Rate: 0/3 (0%)**

| Mark | Item | Evidence |
|------|------|----------|
| ✗ FAIL | Biome 2.x Syntax-Korrektheit | Story verwendet falsche Syntax die nicht funktioniert |
| ⚠ PARTIAL | Merge-Strategie mit bestehenden Overrides | Keine Anleitung wie neue Rule mit bestehendem Override 7 merged wird |
| ⚠ PARTIAL | Copy-Paste-Ready Config | Config-Beispiel ist syntaktisch falsch |

---

## 🚨 Critical Issues (Must Fix)

### Issue 1: Falsche Biome 2.x Syntax für importNames

**Problem:** Die Story verwendet `importNames` innerhalb von `patterns` (Lines 168-180), aber Biome 2.x erwartet `importNames` innerhalb von `paths`:

```json
// ❌ FALSCH (Story Lines 168-180)
{
  "patterns": [
    {
      "group": ["@nestjs/common"],
      "importNames": ["Logger"],  // FUNKTIONIERT NICHT in patterns!
      "message": "..."
    }
  ]
}

// ✅ RICHTIG (Biome 2.x Syntax)
{
  "paths": {
    "@nestjs/common": {
      "importNames": ["Logger"],
      "message": "❌ Logger via DI injizieren mit @Inject(LOGGER)"
    }
  }
}
```

**Quelle:** [Biome noRestrictedImports Docs](https://biomejs.dev/linter/rules/no-restricted-imports/), [GitHub PR #4596](https://github.com/biomejs/biome/pull/4596)

**Fix Required:** Komplettes Umschreiben der Config-Beispiele in Dev Notes.

---

### Issue 2: Bestehende Override-Struktur nicht berücksichtigt

**Problem:** Die Story ignoriert, dass bereits ein Application Layer Override existiert (biome.json:112-148). Der Dev Agent muss die neue Logger-Rule **in das bestehende Override mergen**, nicht ein neues erstellen.

**Aktueller Override 7:**
```json
{
  "includes": ["src/application/**/*.handler.ts", ...],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          // BEREITS 2 patterns vorhanden!
        }
      }
    }
  }
}
```

**Fix Required:** Anleitung für Merge-Strategie hinzufügen.

---

## ⚡ Enhancement Opportunities (Should Add)

### Enhancement 1: Korrekte Biome 2.x Config-Vorlage

Ersetze Dev Notes Config durch funktionierende Syntax:

```json
{
  "paths": {
    "@nestjs/common": {
      "importNames": ["Logger"],
      "message": "❌ Application Layer: Logger via DI injizieren mit @Inject(LOGGER) aus @infrastructure/di-tokens"
    }
  }
}
```

### Enhancement 2: Merge-Strategie dokumentieren

Füge Task hinzu:
- [ ] Bestehenden Application Layer Override (biome.json:112-148) um `paths` erweitern
- [ ] NICHT neuen Override erstellen (würde überschrieben)

### Enhancement 3: Erwartete Violation-Anzahl pro Layer

| Layer | Erwartete Violations |
|-------|---------------------|
| Application | 71 |
| Infrastructure | 26 |
| Module | 21 |
| **Gesamt** | 118 (ohne Ausnahmen) |

### Enhancement 4: Fehlende @infrastructure/kraefte/* Pattern

Das bestehende Application Layer Override (biome.json:122-134) hat `@infrastructure/kraefte/*` nicht in der Blacklist. Dies sollte parallel gefixt werden oder als separater Task dokumentiert.

---

## 🤖 LLM Optimization Improvements

### Opt 1: Copy-Paste-Ready Config Block

Statt mehrstufige Erklärung, einen kompletten, funktionierenden Config-Block:

```json
// Füge zu Override 7 (biome.json:112-148) hinzu:
{
  "includes": ["src/application/**/*.handler.ts", "src/application/**/*.command.ts", ...],
  "linter": {
    "rules": {
      "style": {
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
              // ... bestehende patterns beibehalten
            ]
          }
        }
      }
    }
  }
}
```

### Opt 2: Explizite "DO NOT" Liste

```markdown
⛔ DO NOT:
- Neuen Override für Application Layer erstellen (Override 7 existiert bereits!)
- `importNames` in `patterns` Array verwenden (gehört zu `paths`)
- Tests oder Adapters in die Rule einschließen
```

### Opt 3: Verification Command mit erwarteter Ausgabe

```bash
# Erwartete Ausgabe nach Rule-Aktivierung:
$ pnpm --filter @bluelight-hub/backend lint:check 2>&1 | grep -c "Logger via DI"
# Erwartung: ~118 Violations (71 App + 26 Infra + 21 Module)
```

---

## Recommendations

### 1. Must Fix (Critical)
1. **Biome Syntax korrigieren**: `paths` statt `patterns` für `importNames`
2. **Merge-Strategie**: Override 7 erweitern, nicht ersetzen

### 2. Should Improve (Important)
3. **Erwartete Violations**: Konkrete Zahlen pro Layer angeben
4. **Copy-Paste Config**: Funktionierender Block statt Erklärung

### 3. Consider (Minor)
5. **@infrastructure/kraefte/***: In bestehende Blacklist aufnehmen
6. **Biome Version prüfen**: `importNames` benötigt Biome >= 2.0

---

## File References

- **Story:** `docs/sprint-artifacts/td1-biome-logger-rule.md`
- **Biome Config:** `packages/backend/biome.json` (Lines 112-148: Application Layer Override)
- **Biome Docs:** https://biomejs.dev/linter/rules/no-restricted-imports/
- **Logger Port:** `packages/backend/src/domain/ports/i-logger.port.ts`
- **DI Token:** `packages/backend/src/infrastructure/di-tokens.ts` (LOGGER Symbol)
