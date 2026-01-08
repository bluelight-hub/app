/**
 * Beispiel-Test für DI Import Validator
 *
 * Zeigt die erwarteten Fehlerfall und erfolgreiche Cases
 *
 * Hinweis: Dies ist ein Beispiel - führe aus mit:
 * ts-node scripts/test-di-imports-example.ts
 */

console.log('DI Import Validation - Test Cases\n');
console.log('==================================\n');

// ============================================
// CASE 1: Import type für @Injectable() Class
// ============================================
console.log('❌ CASE 1: import type für @Injectable() Class');
console.log('-'.repeat(50));
console.log(`
Datei: src/application/einsatz/handlers/create.handler.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zeile 3:
┌─────────────────────────────────────────────────
│ import type { IEinsatzRepository } from '@domain/repositories';
└─────────────────────────────────────────────────

Zielsdatei: src/domain/repositories/i-einsatz.repository.ts
┌─────────────────────────────────────────────────
│ import { Injectable } from '@nestjs/common';
│
│ @Injectable()
│ export class IEinsatzRepository { ... }
└─────────────────────────────────────────────────

ERGEBNIS: ❌ VIOLATION (AC1 Rule verletzt!)

FEHLER-MELDUNG:
❌ COMMIT BLOCKED: 1 DI Import Pattern Violation(s) found!

AC1 Violation: Injectable Classes must use "import", not "import type"

  📄 src/application/einsatz/handlers/create.handler.ts:3
     import type { IEinsatzRepository } from '@domain/repositories';
  ❌ Class "IEinsatzRepository" has @Injectable()
  💡 Change "import type { IEinsatzRepository }" to "import { IEinsatzRepository }"

FIX: Ersetze "import type" durch "import"
`);

// ============================================
// CASE 2: Korrekter Import (import nicht import type)
// ============================================
console.log('\n✅ CASE 2: Korrekter Import für @Injectable() Class');
console.log('-'.repeat(50));
console.log(`
Datei: src/application/einsatz/handlers/create.handler.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zeile 3:
┌─────────────────────────────────────────────────
│ import { IEinsatzRepository } from '@domain/repositories';
└─────────────────────────────────────────────────

Zielsdatei: src/domain/repositories/i-einsatz.repository.ts
┌─────────────────────────────────────────────────
│ import { Injectable } from '@nestjs/common';
│
│ @Injectable()
│ export class IEinsatzRepository { ... }
└─────────────────────────────────────────────────

ERGEBNIS: ✅ OK (AC1 Rule erfüllt!)

Das Runtime-Symbol existiert und NestJS kann korrekt injizieren.
`);

// ============================================
// CASE 3: import type für Interface
// ============================================
console.log('\n✅ CASE 3: import type für Interface (ERLAUBT)');
console.log('-'.repeat(50));
console.log(`
Datei: src/application/einsatz/handlers/create.handler.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zeile 5:
┌─────────────────────────────────────────────────
│ import type { ICreateEinsatzCommand } from '@application/contracts';
└─────────────────────────────────────────────────

Zielsdatei: src/application/contracts/i-create-einsatz.command.ts
┌─────────────────────────────────────────────────
│ export interface ICreateEinsatzCommand {
│   nummer: string;
│   stichwort: string;
│ }
└─────────────────────────────────────────────────

ERGEBNIS: ✅ OK (Kein @Injectable() Decorator!)

Interfaces können getrost mit "import type" importiert werden.
Sie sind reine Type-Definitionen und brauchen kein Runtime-Symbol.
`);

// ============================================
// CASE 4: import type für externe Package
// ============================================
console.log('\n✅ CASE 4: import type für externe Package (IGNORIERT)');
console.log('-'.repeat(50));
console.log(`
Datei: src/application/einsatz/handlers/create.handler.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zeile 1:
┌─────────────────────────────────────────────────
│ import type { Request, Response } from 'express';
└─────────────────────────────────────────────────

ERGEBNIS: ✅ OK (Externe Dependency - wird ignoriert!)

Der Validator überprüft nur interne Dateien (@/, @domain/, etc.).
Externe Packages sind nicht unter unserer Kontrolle.
`);

// ============================================
// CASE 5: Path-Alias Auflösung
// ============================================
console.log('\n🔍 CASE 5: Path-Alias Auflösung');
console.log('-'.repeat(50));
console.log(`
Der Validator unterstützt folgende Path-Aliases (aus tsconfig.json):

  @/                → src/
  @domain/          → src/domain/
  @application/     → src/application/
  @infrastructure/  → src/infrastructure/

Beispiele:
┌─────────────────────────────────────────────────
│ import type { X } from '@domain/repositories';
│ // wird aufgelöst zu: src/domain/repositories.ts
│
│ import type { Y } from '@/application/services';
│ // wird aufgelöst zu: src/application/services.ts
│
│ import type { Z } from './my-service';
│ // relative imports werden relativ zum aktuellen Verzeichnis aufgelöst
└─────────────────────────────────────────────────

Bei neuen Path-Aliases muss check-di-imports-zero-deps.ts aktualisiert werden.
`);

// ============================================
// CASE 6: Mehrere Violations
// ============================================
console.log('\n❌ CASE 6: Mehrere Violations in einer Datei');
console.log('-'.repeat(50));
console.log(`
Datei: src/application/kraefte/commands/assign-fahrzeug.handler.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zeile 1: import type { IKraefteRepository } from '@domain/repositories';
Zeile 2: import type { IFahrzeugRepository } from '@domain/repositories';
Zeile 3: import type { EventBus } from '@infrastructure/events';

ERGEBNIS: ❌ 3 VIOLATIONS GEFUNDEN

❌ COMMIT BLOCKED: 3 DI Import Pattern Violation(s) found!

AC1 Violation: Injectable Classes must use "import", not "import type"

  📄 src/application/kraefte/commands/assign-fahrzeug.handler.ts:1
     import type { IKraefteRepository } from '@domain/repositories';
  ❌ Class "IKraefteRepository" has @Injectable()
  💡 Change "import type { IKraefteRepository }" to "import { IKraefteRepository }"

  📄 src/application/kraefte/commands/assign-fahrzeug.handler.ts:2
     import type { IFahrzeugRepository } from '@domain/repositories';
  ❌ Class "IFahrzeugRepository" has @Injectable()
  💡 Change "import type { IFahrzeugRepository }" to "import { IFahrzeugRepository }"

  📄 src/application/kraefte/commands/assign-fahrzeug.handler.ts:3
     import type { EventBus } from '@infrastructure/events';
  ❌ Class "EventBus" has @Injectable()
  💡 Change "import type { EventBus }" to "import { EventBus }"

FIX: Ersetze alle "import type" durch "import" (3x)
`);

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log('ZUSAMMENFASSUNG');
console.log('='.repeat(50));
console.log(`
Regel AC1: Injectable Classes müssen mit "import" importiert werden

✅ OK:
  • import { MyService } from './my.service'         (wenn @Injectable())
  • import type { IInterface } from '@domain'        (wenn kein @Injectable())
  • import type { Request } from 'express'           (externe Packages)

❌ VIOLATION:
  • import type { MyService } from './my.service'    (wenn @Injectable()!)

Warum?
  TypeScript entfernt "import type" bei der Kompilation:

  TypeScript:       import type { MyService } from './my.service';
       ⬇️  (Compile)
  JavaScript:       (statement entfernt - existiert nicht mehr!)

  NestJS DI kann MyService nicht mehr injizieren → RuntimeError

Automatische Überprüfung:
  pnpm --filter @bluelight-hub/backend check:di:imports

Integration in Git:
  Wird automatisch VOR jedem Commit überprüft (.husky/pre-commit)
  Ein Commit mit DI Import Violations wird BLOCKIERT
`);

console.log('\nReferenzen:');
console.log('  • CLAUDE.md → Code Review Checklist → AC1 (DI Import Check)');
console.log('  • packages/backend/scripts/DI_IMPORT_VALIDATION.md');
console.log('  • TypeScript Docs: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports');
console.log('  • NestJS Docs: https://docs.nestjs.com/providers\n');
