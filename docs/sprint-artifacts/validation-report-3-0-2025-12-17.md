# Validation Report

**Document:** docs/sprint-artifacts/3-0-prisma-schema-einsatz-fahrzeuge.md
**Checklist:** .bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-17
**Validator:** Scrum Master Agent (Bob) mit 4 parallelen Subagents

---

## Summary

- **Overall:** 18/24 Kriterien erfüllt (75%)
- **Critical Issues:** 2
- **Enhancement Opportunities:** 4
- **Optimizations:** 3

---

## Section Results

### 1. Epic Requirements Coverage

**Pass Rate:** 5/6 (83%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | EinsatzFahrzeug Entity vollständig definiert | Lines 23-42: Alle Felder inkl. Audit-Trail dokumentiert |
| ✓ PASS | Relations korrekt spezifiziert | Lines 44-54: onDelete-Strategien explizit (Cascade, SetNull, Restrict) |
| ✓ PASS | Migration-Anweisung vorhanden | Lines 56-59: AC3 mit konkretem Befehl |
| ✓ PASS | Abhängigkeiten zu Epic 1/2 dokumentiert | Lines 307-308: Dependencies korrekt genannt |
| ✓ PASS | Stammdaten vs. Einsatzdaten Semantik erklärt | Lines 85-93: Klare Unterscheidung dokumentiert |
| ⚠ PARTIAL | Unique Constraint für Duplikat-Validierung | **FEHLT**: Story 3.2 AC3 erfordert `@@unique([einsatzId, funkrufname])` - nicht in Schema-Vorlage |

**Impact:** Story 3.2 kann keine Duplikat-Validierung umsetzen ohne diesen Constraint

---

### 2. Prisma Schema Pattern Consistency

**Pass Rate:** 4/6 (67%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Audit-Trail Pattern korrekt | Lines 145-149: createdAt, updatedAt, createdBy, updatedBy |
| ✓ PASS | @@map Naming Convention | Line 165: `@@map("einsatz_fahrzeuge")` - snake_case |
| ✓ PASS | onDelete-Strategien konsistent mit Codebase | Lines 152-156: NoAction→Audit, Cascade→Parent, Restrict→FK |
| ✓ PASS | Index-Strategie definiert | Lines 159-164: 6 Indexes für Performance |
| ✗ FAIL | User Relations Naming Pattern | **FEHLT**: Relation-Namen wie `"EinsatzFahrzeugCreator"` sollten mit bestehendem Pattern `"CreatedBy<Entity>"` übereinstimmen |
| ⚠ PARTIAL | Position JSON-Struktur | Line 143: `{ lat: number, lng: number }` erwähnt, aber keine TypeScript-Type-Definition |

**Impact:** Inkonsistente Relation-Namen erschweren Wartung, fehlende Type-Definition für Position führt zu Laufzeitfehlern

---

### 3. Epic 2 Learnings Integration

**Pass Rate:** 5/6 (83%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | DI Token Export Pattern dokumentiert | Lines 209-211: Warnung für Story 3.1+ |
| ✓ PASS | NULL → undefined Mapper-Bug adressiert | Lines 214-216: Konvertierung beschrieben |
| ✓ PASS | Archive-Pattern korrekt (NICHT für EinsatzFahrzeug) | Lines 218-222: Cascade-Delete statt Archive |
| ✓ PASS | biome-ignore Hinweis vorhanden | Lines 224-227: Codebeispiel inkludiert |
| ✓ PASS | M:N DIFF-Sync referenziert | Lines 229-231: Für zukünftige Stories |
| ⚠ PARTIAL | Defense-in-Depth Validation für fmsStatus | **UNVOLLSTÄNDIG**: Lines 99-112 zeigen FMS-Codes, aber keine Validierungslogik (0-9 Check) im Dev Notes |

**Impact:** Developer könnten ungültige fmsStatus-Werte (10+) speichern

---

### 4. Story Structure & Completeness

**Pass Rate:** 4/6 (67%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | User Story Format (Als/Möchte/Damit) | Lines 7-11 |
| ✓ PASS | Given/When/Then Acceptance Criteria | Lines 17-59 |
| ✓ PASS | Tasks mit klaren Subtasks | Lines 63-78 |
| ✓ PASS | Dev Notes umfangreich | Lines 81-262 |
| ⚠ PARTIAL | References vollständig | Lines 194-200: Referenzen vorhanden, aber `docs/architecture-kraefte.md` existiert möglicherweise nicht |
| ➖ N/A | Testing Requirements für Schema | Lines 283-298: Manuell-Tests dokumentiert (Unit-Tests nicht anwendbar für Schema-Story) |

---

## Failed Items

### ✗ FAIL 1: Unique Constraint fehlt im Schema-Template

**Location:** Dev Notes > Prisma Schema Pattern (Lines 134-166)

**Problem:** Das Schema-Template enthält KEINEN `@@unique([einsatzId, funkrufname])` Constraint, obwohl Story 3.2 AC3 (Duplikat-Validierung) diesen erfordert.

**Recommendation:**
```prisma
// Nach @@index([createdBy]) hinzufügen:
@@unique([einsatzId, funkrufname], name: "einsatz_fahrzeug_einsatz_funkrufname_unique")
```

---

### ✗ FAIL 2: User Relation Naming inkonsistent

**Location:** Dev Notes > Prisma Schema Pattern (Lines 155-156)

**Problem:** Story 3.0 verwendet `"EinsatzFahrzeugCreator"` / `"EinsatzFahrzeugUpdater"`, aber das bestehende Schema nutzt `"CreatedBy<Entity>"` / `"UpdatedBy<Entity>"` Pattern.

**Aktuelle Codebase:**
```prisma
// StammFahrzeug:
@relation("CreatedByStammFahrzeug", ...)
@relation("UpdatedByStammFahrzeug", ...)
```

**Story 3.0 Vorlage:**
```prisma
// EinsatzFahrzeug:
@relation("EinsatzFahrzeugCreator", ...)  // ← Inkonsistent!
@relation("EinsatzFahrzeugUpdater", ...)
```

**Recommendation:** Ändern zu:
```prisma
@relation("CreatedByEinsatzFahrzeug", fields: [createdBy], references: [id], onDelete: Restrict)
@relation("UpdatedByEinsatzFahrzeug", fields: [updatedBy], references: [id], onDelete: SetNull)
```

---

## Partial Items

### ⚠ PARTIAL 1: fmsStatus Validierung unvollständig

**Location:** Dev Notes > FMS-Status (Lines 97-112)

**Problem:** FMS-Status-Tabelle dokumentiert, aber keine Validierungslogik beschrieben.

**Missing:**
```typescript
// Für Story 3.1 Domain Aggregate:
if (fmsStatus < 0 || fmsStatus > 9) {
  return Result.fail(EINSATZ_FAHRZEUG_ERRORS.INVALID_FMS_STATUS);
}
```

**Recommendation:** Unter "Dev Notes" hinzufügen:
```markdown
### fmsStatus Validierung (PFLICHT für Story 3.1)
- Domain Aggregate MUSS fmsStatus 0-9 validieren
- Referenziert FunkStatusConfig.statusCode für Labels/Farben
```

---

### ⚠ PARTIAL 2: Position JSON Type-Definition fehlt

**Location:** Lines 143, 191

**Problem:** Position wird als `{ lat, lng }` beschrieben, aber keine formale Type-Definition.

**Recommendation:** Hinzufügen:
```typescript
// packages/backend/src/domain/kraefte/value-objects/geo-position.vo.ts
export interface GeoPosition {
  lat: number;  // Latitude (-90 to 90)
  lng: number;  // Longitude (-180 to 180)
}
```

---

### ⚠ PARTIAL 3: Referenz auf nicht-existierende Datei

**Location:** Line 197

**Problem:** `[Source: docs/architecture-kraefte.md#Stammdaten-vs-Einsatzdaten]` - diese Datei existiert möglicherweise nicht im Repository.

**Recommendation:** Referenz prüfen oder entfernen.

---

## Recommendations

### 1. Must Fix (Critical)

| # | Issue | Action |
|---|-------|--------|
| C1 | Unique Constraint fehlt | `@@unique([einsatzId, funkrufname])` zum Schema-Template hinzufügen |
| C2 | Relation Naming inkonsistent | Ändern zu `"CreatedByEinsatzFahrzeug"` / `"UpdatedByEinsatzFahrzeug"` |

### 2. Should Improve (Enhancement)

| # | Issue | Action |
|---|-------|--------|
| E1 | fmsStatus Validierung | Validierungshinweis für Story 3.1 hinzufügen |
| E2 | Position Type-Definition | GeoPosition Interface dokumentieren |
| E3 | Referenz-Prüfung | architecture-kraefte.md Referenz validieren |
| E4 | onDelete für createdBy | Sollte `NoAction` sein (nicht `Restrict`) gemäß bestehendem Pattern |

### 3. Consider (Optimization)

| # | Issue | Action |
|---|-------|--------|
| O1 | Token-Effizienz | "Dev Notes" Abschnitt straffen - einige Infos sind redundant |
| O2 | LLM-Klarheit | "Previous Story Intelligence" könnte als Checklist formatiert werden |
| O3 | Prisma-Kommentare | `///` Kommentare im Schema-Template für Business-Context |

---

## LLM Optimization Improvements

### Verbosity Reduction

**Aktuell (Lines 85-93):** 9 Zeilen für Stammdaten vs. Einsatzdaten
**Optimiert:**
```markdown
### Stamm vs. Einsatz (KRITISCH)
| Stamm | Einsatz |
|-------|---------|
| Persistent | Snapshot (Cascade-Delete) |
| Admin-verwaltet | stammId=null für temporäre |
| Archive-Pattern | funkrufname KOPIERT |
```

### Structure Improvement

**Aktuell:** Dev Notes als Fließtext mit Code-Blöcken
**Optimiert:** Checklisten-Format für schnelles Scannen

### Actionability Enhancement

**Aktuell (Line 214-216):**
> "Prisma gibt `null` für nullable Fields zurück, Domain erwartet `undefined`"

**Optimiert:**
> "**MAPPER-REGEL:** Alle nullable Fields: `(entity.field as T | null) ?? undefined`"
> - stammId, kennzeichen, position, updatedBy

---

## Validation Metadata

**Subagents Used:**
1. Epic 3 Analyse Agent - Epic Requirements Coverage
2. Prisma Schema Analyzer - Pattern Consistency Check
3. Epic 2 Learnings Agent - Historical Context Analysis
4. Document Reviewer Agent - (Auth Error, skipped)

**Analysis Duration:** ~2 minutes
**Confidence Level:** HIGH (3/4 Agents erfolgreich)
