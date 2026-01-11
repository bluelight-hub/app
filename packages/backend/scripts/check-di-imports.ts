#!/usr/bin/env ts-node-dev

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * DI Import Pattern Validator
 *
 * Überprüft, dass `import type` NICHT für Classes mit @Injectable() Decorator
 * verwendet werden, da TypeScript dies zur Compile-Zeit entfernt und NestJS DI
 * das Runtime-Symbol nicht mehr findet.
 *
 * Regel: Injectable Classes MÜSSEN mit `import` (nicht `import type`) importiert werden.
 */

interface DiImportViolation {
  filePath: string;
  line: number;
  column: number;
  importName: string;
  suggestion: string;
}

const violations: DiImportViolation[] = [];

/**
 * Checkt ob eine bestimmte Klasse den @Injectable() Decorator hat
 */
function hasInjectableDecorator(sourceFile: ts.SourceFile, className: string): boolean {
  let foundClass = false;

  const visit = (node: ts.Node): void => {
    // Suche nach Class Declaration
    if (ts.isClassDeclaration(node) && node.name?.getText(sourceFile) === className) {
      foundClass = true;

      // Prüfe ob @Injectable() Decorator vorhanden ist
      if (node.decorators) {
        for (const decorator of node.decorators) {
          const decoratorText = decorator.getText(sourceFile);
          if (decoratorText.includes('@Injectable') || decoratorText.includes('Injectable()')) {
            return; // Hat @Injectable, ignore diese Klasse
          }
        }
      }

      // Hat KEINE @Injectable - das ist auch ok (kann normale Klasse sein)
      foundClass = false;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return foundClass;
}

/**
 * Analysiert eine Datei auf `import type` Statements für Injectable Classes
 */
function analyzeFile(filePath: string): void {
  if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node): void => {
      // Suche nach `import type` Statements
      if (ts.isImportDeclaration(node)) {
        const isTypeImport = node.importClause?.isTypeOnly === true;

        if (!isTypeImport) {
          ts.forEachChild(node, visit);
          return;
        }

        // Es ist ein `import type` Statement
        const moduleSpecifier = node.moduleSpecifier;
        if (!ts.isStringLiteral(moduleSpecifier)) {
          ts.forEachChild(node, visit);
          return;
        }

        const importPath = moduleSpecifier.text;

        // Importierte Namen sammeln
        const importedNames: string[] = [];
        if (node.importClause?.namedBindings) {
          const namedBindings = node.importClause.namedBindings;
          if (ts.isNamedImports(namedBindings)) {
            namedBindings.elements.forEach((element) => {
              importedNames.push(element.name.getText(sourceFile));
            });
          }
        } else if (node.importClause?.name) {
          importedNames.push(node.importClause.name.getText(sourceFile));
        }

        // Prüfe ob die importierte Klasse vom @Injectable() ist
        // Dies erfordert, dass wir die Definitions-Datei überprüfen
        importedNames.forEach((importName) => {
          // Versuche die Import-Quelle zu lokalisieren
          try {
            const resolvedPath = resolveImportPath(importPath, path.dirname(filePath));

            if (
              resolvedPath &&
              fs.existsSync(resolvedPath) &&
              hasInjectableDecorator(ts.createSourceFile(resolvedPath, fs.readFileSync(resolvedPath, 'utf8'), ts.ScriptTarget.Latest, true), importName)
            ) {
              const lineInfo = sourceFile.getLineAndCharacterOfPosition(node.getStart());

              violations.push({
                filePath,
                line: lineInfo.line + 1,
                column: lineInfo.character + 1,
                importName,
                suggestion: `Change "import type { ${importName} }" to "import { ${importName} }"`,
              });
            }
          } catch (_e) {
            // Stille Fehler bei Import-Auflösung (ist ok, könnte externe Library sein)
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  } catch (_error) {
    // Fehler beim Lesen/Parsen ignorieren
  }
}

/**
 * Versucht einen Import-Pfad aufzulösen
 */
function resolveImportPath(importPath: string, fromDir: string): string | null {
  // Ignoriere externe Dependencies
  if (importPath.startsWith('@') && !importPath.includes('/')) {
    return null;
  }

  // Relative Imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(fromDir, importPath);

    // Versuche verschiedene Dateitypen
    for (const ext of ['.ts', '/index.ts', '.js', '/index.js']) {
      const fullPath = resolved + (ext.startsWith('/') ? '' : '') + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Versuche als Verzeichnis mit index.ts
    if (fs.existsSync(resolved)) {
      const indexFile = path.join(resolved, 'index.ts');
      if (fs.existsSync(indexFile)) {
        return indexFile;
      }
    }
  }

  return null;
}

/**
 * Hauptfunktion: Scanne Backend src Verzeichnis
 */
function main(): void {
  const backendSrcPath = path.resolve(__dirname, '../src');

  console.log('🔍 Checking DI Import Patterns...\n');

  // Rekursiv alle TypeScript Dateien scannen
  function scanDirectory(dir: string): void {
    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
          analyzeFile(filePath);
        }
      }
    } catch (_e) {
      // Directory Fehler ignorieren
    }
  }

  scanDirectory(backendSrcPath);

  // Ergebnisse ausgeben
  if (violations.length > 0) {
    console.error(`❌ COMMIT BLOCKED: ${violations.length} DI Import Pattern Violation(s) found!\n`);
    console.error('Rule AC1: Injectable Classes müssen mit "import" importiert werden, nicht "import type"\n');

    violations.forEach((violation) => {
      console.error(`  ${violation.filePath}:${violation.line}:${violation.column}`);
      console.error(`  ❌ ${violation.importName}`);
      console.error(`  💡 ${violation.suggestion}\n`);
    });

    console.error('Why? TypeScript removes "import type" at compile time.');
    console.error('NestJS DI requires the runtime symbol to be available.\n');

    console.error('Reference: CLAUDE.md → Code Review Checklist → AC1 (DI Import Check)\n');

    process.exit(1);
  }

  console.log('✅ All DI imports are correctly typed!\n');
}

main();
