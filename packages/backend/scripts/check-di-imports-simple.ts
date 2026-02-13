#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

/**
 * Einfacherer DI Import Pattern Validator (ohne TypeScript AST)
 *
 * Überprüft mit Regex-Matching:
 * 1. `import type` Statements
 * 2. Importierte Klassen-Namen
 * 3. Ob die Ziel-Datei @Injectable() hat
 *
 * Löst path aliases auf (@/..., @domain/..., etc.)
 */

interface DiImportViolation {
  filePath: string;
  lineNumber: number;
  importStatement: string;
  importedName: string;
  suggestion: string;
}

const violations: DiImportViolation[] = [];

// Path aliases (aus tsconfig.json)
const pathAliases: Record<string, string> = {
  '@/': 'src/',
  '@domain/': 'src/domain/',
  '@application/': 'src/application/',
  '@infrastructure/': 'src/infrastructure/',
};

/**
 * Checkt ob eine Datei den @Injectable() Decorator entält
 */
function fileHasInjectableDecorator(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Suche nach @Injectable() Decorator
    // Pattern: @Injectable( ... ) und class SomeName
    const injectablePattern = /@Injectable\s*\(/;
    return injectablePattern.test(content);
  } catch (_e) {
    return false;
  }
}

/**
 * Versucht einen Import-Pfad aufzulösen
 */
function resolveImportPath(importPath: string, fromDir: string, baseSrcDir: string): string | null {
  let resolvedPath = importPath;

  // Ersetze path aliases
  for (const [alias, replacement] of Object.entries(pathAliases)) {
    if (importPath.startsWith(alias)) {
      resolvedPath = importPath.replace(alias, replacement);
      break;
    }
  }

  // Wenn noch immer mit @ beginnt, skip (externe dependency)
  if (resolvedPath.startsWith('@')) {
    return null;
  }

  // Relative imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(fromDir, importPath);

    // Try verschiedene Varianten
    for (const ext of ['.ts', '/index.ts']) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  } else if (!importPath.startsWith('.') && !importPath.startsWith('@')) {
    // Absolute imports (path alias)
    const fullPath = path.join(baseSrcDir, `${resolvedPath}.ts`);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    const indexPath = path.join(baseSrcDir, resolvedPath, 'index.ts');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Analysiert eine Datei auf `import type` Violations
 */
function analyzeFile(filePath: string, baseSrcDir: string): void {
  if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Pattern: import type { X, Y } from '...'
    // oder: import type X from '...'
    const importTypePattern = /^\s*import\s+type\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/;

    lines.forEach((line, index) => {
      const match = line.match(importTypePattern);

      if (match) {
        // Extrahiere importierte Namen
        const namedImports = match[1]; // { X, Y, Z }
        const defaultImport = match[2]; // X
        const importPath = match[3]; // './path' oder '@/path'

        const importedNames = namedImports
          ? namedImports.split(',').map((n) => n.trim().split(' ')[0]) // Ignoriere 'as' aliases
          : defaultImport
            ? [defaultImport]
            : [];

        // Versuche import path zu resolven
        const resolvedPath = resolveImportPath(importPath, path.dirname(filePath), baseSrcDir);

        // Prüfe ob die Ziel-Datei @Injectable() hat
        if (resolvedPath && fileHasInjectableDecorator(resolvedPath)) {
          importedNames.forEach((importName) => {
            violations.push({
              filePath,
              lineNumber: index + 1,
              importStatement: line.trim(),
              importedName: importName,
              suggestion: `Change "import type { ${importName} }" to "import { ${importName} }"`,
            });
          });
        }
      }
    });
  } catch (_error) {
    // Fehler bei Datei-Verarbeitung ignorieren
  }
}

/**
 * Hauptfunktion
 */
async function main(): Promise<void> {
  const baseSrcDir = path.resolve(__dirname, '../src');
  const srcPath = path.join(baseSrcDir, '**/*.ts');

  console.log('🔍 Checking DI Import Patterns (AC1 Rule)...\n');

  try {
    // Finde alle TypeScript Dateien
    const files = await glob(srcPath, {
      ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.d.ts'],
    });

    for (const filePath of files) {
      analyzeFile(filePath, baseSrcDir);
    }

    // Ergebnisse ausgeben
    if (violations.length > 0) {
      console.error(`❌ COMMIT BLOCKED: ${violations.length} DI Import Pattern Violation(s) found!\n`);
      console.error('AC1 Violation: Injectable Classes must use "import", not "import type"\n');

      violations.forEach((violation) => {
        console.error(`  📄 ${violation.filePath}:${violation.lineNumber}`);
        console.error(`     ${violation.importStatement}`);
        console.error(`  ❌ Class "${violation.importedName}" has @Injectable()`);
        console.error(`  💡 ${violation.suggestion}\n`);
      });

      console.error('Why? TypeScript removes "import type" declarations at compile time.');
      console.error('NestJS Dependency Injection requires the runtime symbol to inject.\n');
      console.error('Reference: CLAUDE.md → Code Review Checklist → AC1 (DI Import Check)\n');

      process.exit(1);
    }

    console.log('✅ All DI imports follow the correct pattern!\n');
  } catch (error) {
    console.error('Error during DI import check:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
