# Validation Report

**Document:** docs/sprint-artifacts/6-1b-fahrzeug-status-liste.md
**Checklist:** .bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-30
**Validator:** Claude Opus 4.5 (Fresh Context)

## Summary

- **Overall:** 18/23 items passed (78%)
- **Critical Issues:** 2
- **Enhancement Opportunities:** 4
- **Optimizations:** 3

---

## Section Results

### 1. Story Structure & Metadata
**Pass Rate:** 5/5 (100%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Story follows User Story format | Lines 6-9: "As a Einsatzleiter (Thomas), I want..., so that..." |
| ✓ PASS | Status field present | Line 3: "Status: drafted" |
| ✓ PASS | Background/Context provided | Lines 11-17: Abhängigkeiten zu Epic 3 und Story 6.1a dokumentiert |
| ✓ PASS | Acceptance Criteria in BDD format | Lines 21-59: Given/When/Then für alle 5 ACs |
| ✓ PASS | Implementation Checklist present | Lines 61-121: Backend, Frontend, Integration, Testing Checklists |

### 2. Technical Specification Quality
**Pass Rate:** 4/6 (67%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Existing code correctly referenced | Lines 127-146: Alle Backend-Pfade korrekt (verifiziert via Subagent) |
| ✓ PASS | API endpoint documented | Lines 455-461: GET/POST/PATCH Endpoints mit Pfaden |
| ⚠ PARTIAL | DTO structure specified | Lines 67-71: Felder erwähnt, aber `personenCount` als "Optional erweitern" - sollte klarer sein ob benötigt |
| ✗ FAIL | **FMS-Status Farb-Mapping inkonsistent** | Lines 32-41 definiert Status 5=Blau, Status 0=Dunkelrot. **ABER:** Story 3.3 definiert Status 5=Orange, Status 0=Grau. Frontend-Konstanten haben andere Farben! |
| ✓ PASS | Hook Pattern mit Code-Beispiel | Lines 166-211: Vollständiges Hook-Beispiel mit calculateRetryDelay |
| ✓ PASS | Component Pattern mit Code-Beispiel | Lines 214-291, 294-361: FahrzeugCard und FmsStatusBadge vollständig |

### 3. Anti-Pattern Prevention (DO NOT Section)
**Pass Rate:** 5/5 (100%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Keine manuellen fetch() Aufrufe | Line 469: "NICHT eigene fetch()-Aufrufe schreiben" |
| ✓ PASS | Kein Redux/Zustand | Line 470: "NICHT Redux/Zustand verwenden" |
| ✓ PASS | Kein CSS-in-JS | Line 471: "NICHT CSS-in-JS verwenden" |
| ✓ PASS | DI Pattern korrekt | Line 472: "NICHT new Logger() → DI mit @Inject(LOGGER)" |
| ✓ PASS | Swagger Decorator Pattern | Line 473: "NICHT Standard Swagger Decorators → @ApiWrappedResponse" |

### 4. Previous Story Learnings Integration
**Pass Rate:** 2/4 (50%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Story 6.1a als Pattern-Referenz | Lines 15-17, 166, 214: Explizite Referenzen auf 6.1a Patterns |
| ⚠ PARTIAL | 2-Query-Ansatz erwähnt | Nicht dokumentiert! Story 6.1a nutzte 2-Query-Ansatz für N+1 Prevention, aber 6.1b erwähnt dies nicht |
| ✗ FAIL | Query Invalidation Pattern fehlt | Lines 433-452 zeigt Pattern, aber **keine Angabe welche Mutations 6.1b invalidieren sollen** |
| ✓ PASS | Test-Pattern dokumentiert | Lines 119-121: Unit Tests für alle Komponenten spezifiziert |

### 5. LLM Developer Agent Optimization
**Pass Rate:** 2/3 (67%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Klare Struktur mit Headings | Übersichtliche Gliederung: Story → ACs → Checklist → Dev Notes |
| ⚠ PARTIAL | Code-Beispiele actionable | Beispiele vorhanden, aber FmsStatusBadge nutzt hardcoded Farben die inkonsistent mit Backend sind |
| ✓ PASS | DO NOT Section klar | Lines 467-473: Explizite Verbote gut formuliert |

---

## Failed Items

### ✗ FAIL 1: FMS-Status Farb-Mapping Inkonsistenz (KRITISCH)

**Problem:** Story 6.1b definiert (Lines 32-41):
```
Status 5 (Sprechwunsch) = Blau (bg-blue-500)
Status 0 (Notruf) = Dunkelrot (bg-red-700)
```

**Aber:**
- Story 3.3 definiert: Status 5 = Orange, Status 0 = Grau
- Frontend-Konstanten (`fms-status.constants.ts`): Status 5 = Gelb, Status 0 = nicht definiert!

**Impact:** Developer implementiert falsche Farben, UI ist inkonsistent mit bestehendem Code.

**Recommendation:**
1. FMS-Status Farb-Standard in einem zentralen Dokument definieren
2. Story 6.1b an bestehende Frontend-Konstanten anpassen ODER Konstanten aktualisieren
3. Status 0 in Frontend-Konstanten hinzufügen

---

### ✗ FAIL 2: Query Invalidation nicht spezifiziert

**Problem:** Story 6.1b zeigt Query Invalidation Pattern (Lines 433-452) für `useUpdateFmsStatus`, aber:
- Welche anderen Mutations müssen `KRAEFTE_QUERY_KEYS.fahrzeuge()` invalidieren?
- Muss `useErfasseFahrzeug` auch die Stärke (6.1a) invalidieren?

**Impact:** Developer vergisst Invalidation, Dashboard zeigt veraltete Daten.

**Recommendation:** Explizite Liste hinzufügen:
```
Query Invalidation Requirements:
- useErfasseFahrzeugAusStammdaten → invalidate fahrzeuge, staerke
- useErfasseTemporalesFahrzeug → invalidate fahrzeuge, staerke
- useUpdateFmsStatus → invalidate fahrzeuge
- useAssignPersonToFahrzeug → invalidate fahrzeuge, staerke
```

---

## Partial Items

### ⚠ PARTIAL 1: `personenCount` Feld unklar

**Evidence:** Line 71: "Optional erweitern: personenCount Feld für Besatzungs-Preview (AC4)"

**Gap:** Ist `personenCount` ein Backend-Feld oder Frontend-Berechnung aus `besatzung.length`?

**Recommendation:** Klarstellen:
```
AC4 Implementation:
- Backend: EinsatzFahrzeugDto enthält bereits `besatzung: BesatzungMemberDto[]`
- Frontend: `personenCount = fahrzeug.besatzung?.length ?? 0`
- KEIN neues Backend-Feld nötig!
```

---

### ⚠ PARTIAL 2: 2-Query-Ansatz nicht dokumentiert

**Evidence:** Story 6.1a Completion Notes dokumentierten "2-Query-Ansatz statt N+1"

**Gap:** Story 6.1b erwähnt bestehenden `GetEinsatzFahrzeugeHandler` (Line 65), aber nicht dessen Query-Strategie.

**Recommendation:** Dev Notes ergänzen:
```
Backend Query-Strategie:
GetEinsatzFahrzeugeHandler lädt bereits:
1. Alle EinsatzFahrzeuge per findByEinsatzId()
2. Fahrzeugtypen mit Caching (Map<string, Fahrzeugtyp>)
3. Besatzung pro Fahrzeug (bereits optimiert)
→ Keine Backend-Änderung nötig für 6.1b!
```

---

### ⚠ PARTIAL 3: FmsStatusBadge Farben hardcoded

**Evidence:** Lines 307-318 definieren `FMS_STATUS_CONFIG` mit hardcoded Tailwind-Klassen.

**Gap:** Diese Farben stimmen nicht mit bestehenden Konstanten überein und sind nicht importiert.

**Recommendation:**
```typescript
// BESSER: Importiere bestehende Konstanten
import { FMS_STATUS_COLORS } from '@/shared/constants/fms-status.constants';

// ODER: Dokumentiere dass neue Konstanten erstellt werden
// Neue Datei: src/features/kraefte/constants/fms-status.ts
```

---

## Recommendations

### 1. Must Fix (Critical)

1. **FMS-Status Farb-Standard klären:**
   - Entscheiden: Story 6.1b Farben ODER bestehende Konstanten?
   - Status 0 (Notruf) in allen Dokumenten definieren
   - Zentrale Konstanten-Datei als Source of Truth festlegen

2. **Query Invalidation Requirements hinzufügen:**
   - Explizite Liste welche Mutations welche Query Keys invalidieren
   - Cross-Feature Invalidation dokumentieren (Fahrzeug → Stärke)

### 2. Should Improve (Important)

3. **`personenCount` Implementierung klarstellen:**
   - Frontend-Berechnung statt Backend-Feld
   - Code-Beispiel anpassen

4. **Backend Query-Strategie dokumentieren:**
   - Bestehende Optimierungen des Handlers erwähnen
   - Keine Backend-Änderung nötig bestätigen

5. **FmsStatusBadge Konstanten-Import:**
   - Entweder bestehende importieren oder neue Datei erstellen
   - Nicht inline hardcoden

### 3. Consider (Nice to Have)

6. **AC5 Performance-Test erweitern:**
   - Nicht nur Fahrzeuge, auch Besatzungs-Count messen
   - End-to-End Response Time dokumentieren

7. **AC3 Detail Dialog als separate Story:**
   - Aktuell als "Optional" markiert
   - Besser: Explizit auf Story 6.1d verschieben

8. **Empty State Illustration:**
   - AC1b definiert Text "Keine Fahrzeuge erfasst"
   - Truck-Icon im Code-Beispiel, aber nicht in AC spezifiziert

---

## LLM Optimization Improvements

| Current | Improved | Reason |
|---------|----------|--------|
| "Optional erweitern: personenCount" | "Frontend berechnet: `besatzung?.length ?? 0`" | Klare Anweisung statt Option |
| 10 Status-Codes in Prose | Tabelle mit Code/Label/Farbe/Tailwind | Schneller parsebar |
| Hook-Beispiel 45 Zeilen | Essential: queryKey, queryFn, enabled, staleTime | Token-effizient |
| "Referenz: 6.1a" | "KOPIERE Pattern aus: use-taktische-staerke.ts" | Actionable Anweisung |

---

## Validation Complete

**Report saved to:** `docs/sprint-artifacts/validation-report-6-1b-2025-12-30.md`

**Next Steps:**
1. Review critical issues with Product Owner
2. Apply accepted improvements to story file
3. Run `dev-story` for implementation
