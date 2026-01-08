# DI Import Pattern Validator (AC1 Rule)

## Überblick

Dieser Validator überprüft, dass `import type` **NICHT** für Classes mit `@Injectable()` Decorator verwendet wird. Dies ist eine kritische Architektur-Regel (AC1), da TypeScript `import type` zur Compile-Zeit entfernt und NestJS Dependency Injection das Runtime-Symbol benötigt.

## Problem

### Fehler-Szenario

```typescript
// ❌ FALSCH: import type entfernt das Runtime-Symbol
import type { MyService } from './my.service';

@Injectable()
export class MyHandler {
  constructor(private readonly service: MyService) {} // 💥 NestJS kann MyService nicht injizieren!
}
```

TypeScript entfernt `import type` Deklarationen während der Kompilation:

```typescript
// Nach TypeScript Compilation (in dist/):
// import type { MyService } wird GELÖSCHT

@Injectable()
export class MyHandler {
  constructor(private readonly service: MyService) {} // ❌ MyService existiert nicht mehr!
}
```

### Korrekte Implementierung

```typescript
// ✅ RICHTIG: import behält das Runtime-Symbol
import { MyService } from './my.service';

@Injectable()
export class MyHandler {
  constructor(private readonly service: MyService) {} // ✅ NestJS kann MyService injizieren
}
```

## Wie der Validator funktioniert

Der Validator (`check-di-imports-simple.ts`) arbeitet in mehreren Schritten:

### 1. Datei-Scanning

Scannt alle TypeScript Dateien im `src/` Verzeichnis (außer `.spec.ts`):

```typescript
const files = await glob(srcPath, {
  ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.d.ts'],
});
```

### 2. Import-Analyse

Findet alle `import type` Statements mit Regex:

```regex
/^\s*import\s+type\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/
```

Beispiele:
- `import type { MyService } from './my.service'`
- `import type { A, B, C } from '@domain/services'`
- `import type MyService from './my.service'`

### 3. Path-Auflösung

Löst relative und aliased Imports auf:

```typescript
// Unterstützt path aliases aus tsconfig.json:
// @/ → src/
// @domain/ → src/domain/
// @application/ → src/application/
// @infrastructure/ → src/infrastructure/
```

### 4. @Injectable() Überprüfung

Prüft die Ziel-Datei auf `@Injectable()` Decorator:

```typescript
const injectablePattern = /@Injectable\s*\(/;
const hasInjectable = injectablePattern.test(fileContent);
```

### 5. Fehlerausgabe

Bei Violations wird eine hilfreiche Fehlermeldung ausgegeben:

```
❌ COMMIT BLOCKED: 2 DI Import Pattern Violation(s) found!

AC1 Violation: Injectable Classes must use "import", not "import type"

  📄 src/application/einsatz/commands/create-einsatz.handler.ts:5
     import type { IEinsatzRepository } from '@domain/repositories/i-einsatz.repository';
  ❌ Class "IEinsatzRepository" has @Injectable()
  💡 Change "import type { IEinsatzRepository }" to "import { IEinsatzRepository }"

  📄 src/application/auth/commands/login.handler.ts:3
     import type { IUserRepository } from '@/domain/repositories/i-user.repository';
  ❌ Class "IUserRepository" has @Injectable()
  💡 Change "import type { IUserRepository }" to "import { IUserRepository }"
```

## Verwendung

### Manuell prüfen

```bash
# Im Backend-Paket
cd packages/backend
pnpm check:di:imports
```

### Automatisch vor jedem Commit

Der Validator ist in `.husky/pre-commit` integriert:

```bash
# Wird automatisch ausgeführt vor jedem Commit
git commit -m "Add feature"
# → Lädt den DI Import Validator automatisch
```

## Integration in Pre-Commit Hook

`.husky/pre-commit`:

```bash
# DI Import Pattern Check (AC1)
# Story 5-7 (AC1): Ensures Injectable Classes use "import" not "import type"
# "import type" is removed at compile-time, breaking NestJS Dependency Injection
echo "🔍 Checking DI Import Patterns (AC1 Rule)..."
pnpm --filter @bluelight-hub/backend check:di:imports || {
  echo ""
  echo "❌ COMMIT BLOCKED: DI Import Pattern Violations found!"
  echo ""
  exit 1
}
```

## Limitationen & Bekannte Probleme

### 1. Externe Dependencies werden ignoriert

Imports von npm-Packages mit `@` Prefix werden übersprungen:

```typescript
// ✅ OK: Externe Package (wird nicht geprüft)
import type { SomeService } from '@external-package/service';
```

Dies ist gewünscht, da externe Packages nicht unter unserer Kontrolle sind.

### 2. Komplexe Path-Alias-Patterns

Der Validator nutzt eine feste Liste aus `tsconfig.json`:

```typescript
const pathAliases: Record<string, string> = {
  '@/': 'src/',
  '@domain/': 'src/domain/',
  '@application/': 'src/application/',
  '@infrastructure/': 'src/infrastructure/',
};
```

Bei neuen Aliases in `tsconfig.json` müssen diese manuell hinzugefügt werden.

### 3. Indirekte Injectable-Klassen

Der Validator prüft nur die direkt importierte Datei:

```typescript
// ❌ Könnte nicht erkannt werden:
import type { ServiceFactory } from './factory';
// wenn ServiceFactory ein Interface ist, das aber
// von einer Injectable-Klasse implementiert wird
```

Dies ist selten und kann manuell überprüft werden.

## Technische Details

### Dateistruktur

```
packages/backend/scripts/
├── check-di-imports-simple.ts    # Main Validator
└── check-di-imports.ts           # Alternative (TypeScript AST-basiert)
```

### Dependencies

Der Validator nutzt nur Node.js Built-ins:
- `fs` (Datei-IO)
- `path` (Pfad-Auflösung)
- `glob` (Datei-Pattern-Matching)

### Performance

- Durchschnittliche Laufzeit: ~100-200ms (je nach Projekt-Größe)
- Keine Kompilation erforderlich (Regex-basiert)
- Wird als Pre-commit Hook ausgeführt (blockiert nach Bedarf)

## Best Practices

### 1. Interfaces vs. Implementierungen

```typescript
// ✅ RICHTIG: Interface kann import type sein
import type { IRepository } from '@domain/repositories';

// Aber die Implementierung MUSS import sein:
import { PrismaRepository } from '@infrastructure/repositories';
```

### 2. Domain Entities

```typescript
// ✅ RICHTIG: Value Objects und Entities können import type sein
import type { UserId } from '@domain/value-objects';

// Aber Observable Aggregates müssen import sein:
import { User } from '@domain/aggregates';
```

### 3. Domain Services

```typescript
// ✅ RICHTIG: Service-Interfaces können import type sein
import type { IEmailService } from '@domain/services';

// Aber die konkrete Implementierung muss import sein:
import { SmtpEmailService } from '@infrastructure/email';
```

## Fehlerbehandlung

Falls der Validator auf Fehler stößt:

1. **FileNotFoundError**: Import konnte nicht aufgelöst werden (Skip)
2. **ParseError**: Datei konnte nicht gelesen werden (Skip)
3. **PatternError**: Regex-Matching fehlgeschlagen (Skip)

Diese Fehler sind **nicht kritisch** - der Validator läuft weiter.

## Wartung

### Neue Path-Aliases hinzufügen

Wenn `tsconfig.json` neue Aliases hat:

```typescript
// In check-di-imports-simple.ts
const pathAliases: Record<string, string> = {
  '@/': 'src/',
  '@domain/': 'src/domain/',
  '@application/': 'src/application/',
  '@infrastructure/': 'src/infrastructure/',
  '@new-alias/': 'src/path/to/new', // Neue Alias
};
```

### Performance-Optimierung

Falls die Laufzeit zu lange wird, kann gefiltert werden:

```typescript
// Nur Application Layer prüfen
const srcPath = path.join(baseSrcDir, 'application/**/*.ts');
```

## Referenzen

- **CLAUDE.md**: AC1 (DI Import Check) Regel
- **Story 5-7**: Architektur-Validierung
- **NestJS Docs**: [Dependency Injection](https://docs.nestjs.com/providers)
- **TypeScript Docs**: [Type-only imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports)
