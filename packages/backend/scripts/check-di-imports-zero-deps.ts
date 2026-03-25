#!/usr/bin/env ts-node

/**
 * Ultra-einfacher DI Import Pattern Validator (Zero Dependencies)
 *
 * Nutzt nur Node.js Built-ins: fs, path, readdirSync
 * Keine externe Abhängigkeit auf 'glob' - deshalb zuverlässiger & schneller
 */

import fs from 'node:fs';
import path from 'node:path';

interface DiImportViolation {
  filePath: string;
  lineNumber: number;
  importStatement: string;
  importedName: string;
}

const violations: DiImportViolation[] = [];

// Path aliases aus tsconfig.json
const pathAliases: Record<string, string> = {
  '@/': 'src/',
  '@domain/': 'src/domain/',
  '@application/': 'src/application/',
  '@infrastructure/': 'src/infrastructure/',
};

/**
 * Rekursiv alle .ts Dateien im Verzeichnis finden
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, dist, spec, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || fullPath.includes('.spec.ts') || fullPath.includes('.d.ts')) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...findTypeScriptFiles(fullPath));
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (_e) {
    // Skip auf Fehler
  }

  return files;
}

/**
 * Prüft ob ein spezifischer Export im File ein Injectable Class ist
 * (nicht nur ob das File irgendwo @Injectable hat)
 */
function isInjectableExport(filePath: string, exportName: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Suche nach Pattern: @Injectable() direkt vor der Class-Deklaration
    // Matches: @Injectable()\nexport class MyService ...
    // Matches: @Injectable({ ... })\nexport class MyService ...
    const injectableClassPattern = new RegExp(`@Injectable\\s*\\([^)]*\\)\\s*(?:\\/\\/[^\\n]*\\n|\\s)*export\\s+class\\s+${exportName}\\b`, 's');

    return injectableClassPattern.test(content);
  } catch (_e) {
    return false;
  }
}

/**
 * Resolve einen Import-Pfad
 */
function resolveImportPath(importPath: string, fromDir: string, baseSrcDir: string): string | null {
  // Externe Dependencies ignorieren
  if (importPath.startsWith('@') && !Object.keys(pathAliases).some((k) => importPath.startsWith(k))) {
    return null;
  }

  let resolvedPath = importPath;

  // Path aliases ersetzen
  for (const [alias, replacement] of Object.entries(pathAliases)) {
    if (importPath.startsWith(alias)) {
      resolvedPath = importPath.replace(alias, replacement);
      break;
    }
  }

  // Relative Imports
  if (importPath.startsWith('.')) {
    const basePath = path.resolve(fromDir, importPath);
    if (fs.existsSync(`${basePath}.ts`)) return `${basePath}.ts`;
    if (fs.existsSync(`${basePath}/index.ts`)) return `${basePath}/index.ts`;
    if (fs.existsSync(basePath)) {
      const indexFile = path.join(basePath, 'index.ts');
      if (fs.existsSync(indexFile)) return indexFile;
    }
  } else if (importPath) {
    // Absolute/alias Imports
    const candidate1 = path.join(baseSrcDir, `${resolvedPath}.ts`);
    if (fs.existsSync(candidate1)) return candidate1;

    const candidate2 = path.join(baseSrcDir, resolvedPath, 'index.ts');
    if (fs.existsSync(candidate2)) return candidate2;
  }

  return null;
}

/**
 * Analyisiert eine Datei auf `import type` Violations
 */
function analyzeFile(filePath: string, baseSrcDir: string): void {
  if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Pattern: import type { X, Y } from '...'
    const importTypePattern = /^\s*import\s+type\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/;

    lines.forEach((line, index) => {
      const match = line.match(importTypePattern);

      if (!match) return;

      // Extract importierte Namen
      const namedImports = match[1];
      const defaultImport = match[2];
      const importPath = match[3];

      // Validiere dass importPath existiert
      if (!importPath) return;

      const importedNames = namedImports
        ? namedImports
            .split(',')
            .map((n) => n.trim().split(' ')[0])
            .filter((n): n is string => !!n)
        : defaultImport
          ? [defaultImport]
          : [];

      // Resolve Import Path
      const resolvedPath = resolveImportPath(importPath, path.dirname(filePath), baseSrcDir);

      // Check für @Injectable() - prüfe jedes importierte Symbol einzeln
      if (resolvedPath) {
        importedNames.forEach((importName) => {
          if (isInjectableExport(resolvedPath, importName)) {
            violations.push({
              filePath,
              lineNumber: index + 1,
              importStatement: line.trim(),
              importedName: importName,
            });
          }
        });
      }
    });
  } catch (_e) {
    // Fehler bei Dateiverarbeitung ignorieren
  }
}

/**
 * Hauptfunktion
 */
function main(): void {
  const baseSrcDir = path.resolve(__dirname, '../src');

  console.log('🔍 Checking DI Import Patterns (AC1 Rule)...\n');

  // Finde alle TypeScript Dateien
  const tsFiles = findTypeScriptFiles(baseSrcDir);

  // Analysiere Dateien
  for (const filePath of tsFiles) {
    analyzeFile(filePath, baseSrcDir);
  }

  // Fehlerausgabe
  if (violations.length > 0) {
    console.error(`❌ COMMIT BLOCKED: ${violations.length} DI Import Pattern Violation(s) found!\n`);
    console.error('AC1 Violation: Injectable Classes must use "import", not "import type"\n');

    violations.forEach((violation) => {
      console.error(`  📄 ${path.relative(baseSrcDir, violation.filePath)}:${violation.lineNumber}`);
      console.error(`     ${violation.importStatement}`);
      console.error(`  ❌ Class "${violation.importedName}" has @Injectable()`);
      console.error(`  💡 Change "import type { ${violation.importedName} }" to "import { ${violation.importedName} }"\n`);
    });

    console.error('Why? TypeScript removes "import type" declarations at compile time.');
    console.error('NestJS Dependency Injection requires the runtime symbol to inject.\n');
    console.error('Reference: CLAUDE.md → Code Review Checklist → AC1 (DI Import Check)\n');

    process.exit(1);
  }

  console.log(`✅ All DI imports follow the correct pattern! (Checked ${tsFiles.length} files)\n`);
  process.exit(0);
}

main();
