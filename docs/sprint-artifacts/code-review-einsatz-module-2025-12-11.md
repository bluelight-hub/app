# Code Review: Einsatz Module

**Datum:** 2025-12-11
**Reviewer:** Amelia (Dev Agent)
**Scope:** einsatz.controller.ts, einsatz.module.ts, completeness.util.ts, name-generator.util.ts

---

## Review Follow-ups (AI)

### 🔴 CRITICAL (Muss behoben werden)

- [ ] [AI-Review][CRITICAL] CQRS Handler Registration fehlt - CqrsModule in EinsatzApplicationModule importieren [einsatz-application.module.ts:67]
- [ ] [AI-Review][CRITICAL] DI Import Violation (AC1) - `import type` für IEinsatzRepository entfernen, normales `import` nutzen [alle Handler]
- [ ] [AI-Review][CRITICAL] Security: User-Ownership Check implementieren für update/start/complete/archive [einsatz.controller.ts:252,274,293,318]
- [ ] [AI-Review][CRITICAL] Architecture Violation: Address Value Object Import aus Controller entfernen, Konvertierung in Command/DTO verschieben [einsatz.controller.ts:2,87,254]
- [ ] [AI-Review][CRITICAL] Result Pattern: Redundante `!result.value` Checks entfernen nach `isFailure` Prüfung [einsatz.controller.ts:90-94]
- [ ] [AI-Review][CRITICAL] Unit Tests für EinsatzCompletenessCalculator erstellen (AC6) [completeness.util.ts]
- [ ] [AI-Review][CRITICAL] Type Safety: Date-Handling fixen - `instanceof Date` ist unzuverlässig für Prisma Daten [completeness.util.ts:38]
- [ ] [AI-Review][CRITICAL] Unit Tests für EinsatzNameGenerator erstellen (AC6) [name-generator.util.ts]
- [ ] [AI-Review][CRITICAL] Prisma Coupling entfernen: Domain Aggregate statt `@prisma/client` Type nutzen [name-generator.util.ts:2]
- [ ] [AI-Review][CRITICAL] Invalid Date Handling: Validierung für `new Date(alarmierungszeit)` hinzufügen [name-generator.util.ts:20,25,30]

### 🟡 MEDIUM (Sollte behoben werden)

- [ ] [AI-Review][MEDIUM] N+1 Query: Handler sollte aktualisierte Entity direkt zurückgeben statt separater loadEinsatzById() [einsatz.controller.ts:347]
- [ ] [AI-Review][MEDIUM] String-basierte Error Detection ersetzen durch strukturierte Error-Types oder Error-Codes [einsatz.controller.ts:151,167,300]
- [ ] [AI-Review][MEDIUM] CUID Format Validation: Custom Pipe oder DTO Validator für `:id` Parameter [einsatz.controller.ts:148,164,181,223]
- [ ] [AI-Review][MEDIUM] Code Duplication: Private Helper `executeCommandAndReload()` extrahieren [einsatz.controller.ts]
- [ ] [AI-Review][MEDIUM] Domain Services exportieren: EinsatzCompletenessService, EinsatzArchivalPolicy [einsatz-application.module.ts:109-134]
- [ ] [AI-Review][MEDIUM] Redundante PrismaModule Imports entfernen (transitiv verfügbar) [einsatz.module.ts:28]
- [ ] [AI-Review][MEDIUM] Result Pattern: `Result<EinsatzCompleteness>` Return Type einführen [completeness.util.ts:15]
- [ ] [AI-Review][MEDIUM] FIELD_WEIGHTS erweitern: Alle 11+ Einsatz-Felder aufnehmen [completeness.util.ts:9-13]
- [ ] [AI-Review][MEDIUM] Edge Case: `totalWeight === 0` sollte 0% zurückgeben, nicht 100% [completeness.util.ts:51]
- [ ] [AI-Review][MEDIUM] Code Duplication: Generische Field-Validation-Loop statt Copy-Paste [completeness.util.ts:20-48]
- [ ] [AI-Review][MEDIUM] Prisma Coupling entfernen: Domain Aggregate Type nutzen [completeness.util.ts:1]
- [ ] [AI-Review][MEDIUM] Date Fallback Logik vereinheitlichen zwischen generate() und getNameComponents() [name-generator.util.ts:38-39]
- [ ] [AI-Review][MEDIUM] Duplicate Date Formatting konsolidieren: formatNatoDateTime() konsistent nutzen [name-generator.util.ts:47-56]
- [ ] [AI-Review][MEDIUM] Magic String Separator als Constant definieren [name-generator.util.ts:34]
- [ ] [AI-Review][MEDIUM] TypeSafety: `?? undefined` statt `|| undefined` für null-safety [name-generator.util.ts:42]

### 🟢 LOW (Nice to have)

- [ ] [AI-Review][LOW] JSDoc für private loadEinsatzById() mit "warum" Erklärung [einsatz.controller.ts:347]
- [ ] [AI-Review][LOW] Magic String URL in Error Message durch generierte URL ersetzen [einsatz.controller.ts:340]
- [ ] [AI-Review][LOW] `_user` Parameter Name korrigieren wo User tatsächlich benötigt wird [einsatz.controller.ts:252]
- [ ] [AI-Review][LOW] Unit Tests für EinsatzController erstellen [einsatz.controller.ts]
- [ ] [AI-Review][LOW] Query DTO Handling vereinheitlichen (ganzes DTO vs. Field-Extraktion) [einsatz.controller.ts:106,122]
- [ ] [AI-Review][LOW] Module-Naming Convention dokumentieren oder vereinheitlichen [einsatz.module.ts]
- [ ] [AI-Review][LOW] JSDoc erweitern: "Warum" statt "Was" erklären [einsatz.module.ts:8-26]
- [ ] [AI-Review][LOW] Tests für Module Configuration erstellen (Handler Registration) [einsatz.module.ts]
- [ ] [AI-Review][LOW] Hexagonal Architecture: Application Layer sollte nicht Infrastructure importieren [einsatz-application.module.ts:68-78]
- [ ] [AI-Review][LOW] Redundanten EinsatzInfrastructureModule Import in app.module.ts entfernen [app.module.ts:71-75]
- [ ] [AI-Review][LOW] Magic Number 100 als MAX_COMPLETENESS_SCORE Constant definieren [completeness.util.ts:51-52]
- [ ] [AI-Review][LOW] Fehler-Messages konsistent deutsch oder englisch [completeness.util.ts:28,43]
- [ ] [AI-Review][LOW] JSDoc für public calculate() Method hinzufügen [completeness.util.ts:15]
- [ ] [AI-Review][LOW] Input-Validierung: Guard Clause für null/undefined einsatz [completeness.util.ts:15]
- [ ] [AI-Review][LOW] JSDoc für public generate() und getNameComponents() Methods [name-generator.util.ts:10,37]

---

## Statistik

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| MEDIUM | 15 |
| LOW | 15 |
| **TOTAL** | **40** |

---

## Empfohlene Priorisierung

### Sprint 1 (Sofort)
1. CQRS Handler Registration (CRIT-1, CRIT-3) - System-kritisch
2. DI Import Violation fixen (CRIT-2) - Compile/Runtime Fehler
3. Security: User-Ownership Check (CR-001)

### Sprint 2 (Nächste Iteration)
1. Unit Tests für Utilities (AC6 Compliance)
2. Prisma Coupling entfernen (Hexagonal Architecture)
3. Result Pattern konsequent anwenden

### Backlog
1. Code Duplication Refactoring
2. JSDoc Verbesserungen
3. Magic Numbers/Strings als Constants

---

_Generiert von Amelia (Dev Agent) am 2025-12-11_
