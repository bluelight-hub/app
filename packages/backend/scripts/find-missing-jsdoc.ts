#!/usr/bin/env ts-node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface MethodInfo {
  fileName: string;
  line: number;
  column: number;
  methodName: string;
  className?: string;
  interfaceName?: string;
  isPrivate: boolean;
  isProtected: boolean;
  isStatic: boolean;
  methodType: 'method' | 'function' | 'arrow' | 'getter' | 'setter' | 'constructor';
  hasJsDoc: boolean;
}

interface Options {
  publicOnly: boolean;
  includeConstructors: boolean;
  jsonReport: boolean;
  verbose: boolean;
}

class JsDocChecker {
  private methods: MethodInfo[] = [];
  private options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  /**
   * Hauptmethode zum Scannen aller TypeScript-Dateien
   */
  async scan(rootDir: string): Promise<void> {
    console.log('🔍 Scanning for methods without JSDoc...\n');

    // Find all TypeScript files, excluding tests and mocks
    const files = this.findTypeScriptFiles(rootDir);

    console.log(`Found ${files.length} TypeScript files to analyze\n`);

    for (const file of files) {
      this.checkFile(file);
    }

    this.printReport();
  }

  /**
   * Findet alle TypeScript-Dateien rekursiv
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const scanDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (['node_modules', 'dist', 'coverage', '__tests__', '__mocks__'].includes(entry.name)) {
            continue;
          }

          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Skip test files
          if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
            continue;
          }

          files.push(fullPath);
        }
      }
    };

    scanDir(dir);
    return files;
  }

  /**
   * Prüft eine einzelne TypeScript-Datei
   */
  private checkFile(fileName: string): void {
    const sourceCode = fs.readFileSync(fileName, 'utf-8');
    const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);

    this.visitNode(sourceFile, sourceFile, fileName);
  }

  /**
   * Rekursiv durch den AST traversieren
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    fileName: string,
    className?: string,
    interfaceName?: string,
  ): void {
    // Check class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const currentClassName = node.name.text;
      node.forEachChild((child) =>
        this.visitNode(child, sourceFile, fileName, currentClassName, undefined),
      );
      return;
    }

    // Check interface declarations
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const currentInterfaceName = node.name.text;
      node.forEachChild((child) =>
        this.visitNode(child, sourceFile, fileName, undefined, currentInterfaceName),
      );
      return;
    }

    // Check methods and functions
    this.checkMethod(node, sourceFile, fileName, className, interfaceName);

    // Continue traversing
    node.forEachChild((child) =>
      this.visitNode(child, sourceFile, fileName, className, interfaceName),
    );
  }

  /**
   * Prüft, ob ein Knoten eine Methode ist und ob sie JSDoc hat
   */
  private checkMethod(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    fileName: string,
    className?: string,
    interfaceName?: string,
  ): void {
    let methodInfo: MethodInfo | null = null;

    // Method declaration in class
    if (ts.isMethodDeclaration(node)) {
      methodInfo = this.extractMethodInfo(
        node,
        sourceFile,
        fileName,
        'method',
        className,
        interfaceName,
      );
    }
    // Constructor
    else if (ts.isConstructorDeclaration(node)) {
      if (this.options.includeConstructors) {
        methodInfo = {
          fileName,
          ...this.getPosition(node, sourceFile),
          methodName: 'constructor',
          className,
          isPrivate: false,
          isProtected: false,
          isStatic: false,
          methodType: 'constructor',
          hasJsDoc: this.hasJsDoc(node, sourceFile),
        };
      }
    }
    // Getter
    else if (ts.isGetAccessorDeclaration(node)) {
      methodInfo = this.extractMethodInfo(
        node,
        sourceFile,
        fileName,
        'getter',
        className,
        interfaceName,
      );
    }
    // Setter
    else if (ts.isSetAccessorDeclaration(node)) {
      methodInfo = this.extractMethodInfo(
        node,
        sourceFile,
        fileName,
        'setter',
        className,
        interfaceName,
      );
    }
    // Arrow function property
    else if (
      ts.isPropertyDeclaration(node) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer)
    ) {
      methodInfo = this.extractMethodInfo(
        node,
        sourceFile,
        fileName,
        'arrow',
        className,
        interfaceName,
      );
    }
    // Function declaration
    else if (ts.isFunctionDeclaration(node) && node.name) {
      methodInfo = {
        fileName,
        ...this.getPosition(node, sourceFile),
        methodName: node.name.text,
        isPrivate: false,
        isProtected: false,
        isStatic: false,
        methodType: 'function',
        hasJsDoc: this.hasJsDoc(node, sourceFile),
      };
    }
    // Interface method signature
    else if (ts.isMethodSignature(node) && node.name && ts.isIdentifier(node.name)) {
      methodInfo = {
        fileName,
        ...this.getPosition(node, sourceFile),
        methodName: node.name.text,
        interfaceName,
        isPrivate: false,
        isProtected: false,
        isStatic: false,
        methodType: 'method',
        hasJsDoc: this.hasJsDoc(node, sourceFile),
      };
    }

    // Add to results if it matches our criteria
    if (methodInfo && this.shouldIncludeMethod(methodInfo)) {
      this.methods.push(methodInfo);
    }
  }

  /**
   * Extrahiert Informationen über eine Methode
   */
  private extractMethodInfo(
    node:
      | ts.MethodDeclaration
      | ts.GetAccessorDeclaration
      | ts.SetAccessorDeclaration
      | ts.PropertyDeclaration,
    sourceFile: ts.SourceFile,
    fileName: string,
    methodType: MethodInfo['methodType'],
    className?: string,
    interfaceName?: string,
  ): MethodInfo | null {
    const name = node.name;
    if (!name || !ts.isIdentifier(name)) return null;

    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isPrivate = !!modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword);
    const isProtected = !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword);
    const isStatic = !!modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);

    return {
      fileName,
      ...this.getPosition(node, sourceFile),
      methodName: name.text,
      className,
      interfaceName,
      isPrivate,
      isProtected,
      isStatic,
      methodType,
      hasJsDoc: this.hasJsDoc(node, sourceFile),
    };
  }

  /**
   * Prüft, ob ein Knoten einen JSDoc-Kommentar hat
   */
  private hasJsDoc(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();

    // Get the text before the node
    const textBeforeNode = fullText.substring(0, nodeStart);

    // Look for JSDoc pattern (/** ... */) immediately before the node
    const jsDocRegex = /\/\*\*[\s\S]*?\*\/\s*$/;

    return jsDocRegex.test(textBeforeNode);
  }

  /**
   * Holt die Position eines Knotens
   */
  private getPosition(node: ts.Node, sourceFile: ts.SourceFile): { line: number; column: number } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return { line: line + 1, column: character + 1 };
  }

  /**
   * Prüft, ob eine Methode in den Report aufgenommen werden soll
   */
  private shouldIncludeMethod(method: MethodInfo): boolean {
    // Skip methods that have JSDoc
    if (method.hasJsDoc) return false;

    // Apply visibility filter
    return !(this.options.publicOnly && (method.isPrivate || method.isProtected));
  }

  /**
   * Gibt den Report aus
   */
  private printReport(): void {
    const methodsWithoutJsDoc = this.methods;
    const totalMethods = this.methods.length;

    if (this.options.jsonReport) {
      console.log(JSON.stringify(methodsWithoutJsDoc, null, 2));
      return;
    }

    // Group by file
    const byFile = methodsWithoutJsDoc.reduce(
      (acc, method) => {
        if (!acc[method.fileName]) {
          acc[method.fileName] = [];
        }
        acc[method.fileName].push(method);
        return acc;
      },
      {} as Record<string, MethodInfo[]>,
    );

    // Print results
    console.log('📊 Methods without JSDoc:\n');

    Object.entries(byFile)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([fileName, methods]) => {
        const relativePath = path.relative(process.cwd(), fileName);
        console.log(`\n📄 ${relativePath}`);

        methods
          .sort((a, b) => a.line - b.line)
          .forEach((method) => {
            const location = `${method.className || method.interfaceName || 'global'}.${method.methodName}`;
            const visibility = method.isPrivate ? '🔒' : method.isProtected ? '🔐' : '🌐';
            const lineInfo = `${relativePath}:${method.line}`;

            console.log(`  ${visibility} ${location} (${method.methodType}) - ${lineInfo}`);

            if (this.options.verbose) {
              console.log(`     Line ${method.line}, Column ${method.column}`);
            }
          });
      });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log('='.repeat(60));
    console.log(`Total methods without JSDoc: ${totalMethods}`);
    console.log(`Files affected: ${Object.keys(byFile).length}`);

    // Breakdown by visibility
    const publicMethods = methodsWithoutJsDoc.filter((m) => !m.isPrivate && !m.isProtected).length;
    const privateMethods = methodsWithoutJsDoc.filter((m) => m.isPrivate).length;
    const protectedMethods = methodsWithoutJsDoc.filter((m) => m.isProtected).length;

    console.log(`\nBy visibility:`);
    console.log(`  🌐 Public: ${publicMethods}`);
    console.log(`  🔐 Protected: ${protectedMethods}`);
    console.log(`  🔒 Private: ${privateMethods}`);

    // Breakdown by type
    const methodTypes = methodsWithoutJsDoc.reduce(
      (acc, m) => {
        acc[m.methodType] = (acc[m.methodType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`\nBy type:`);
    Object.entries(methodTypes)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
  }
}

// Parse command line arguments
function parseArgs(): Options {
  const args = process.argv.slice(2);
  return {
    publicOnly: args.includes('--public-only'),
    includeConstructors: args.includes('--include-constructors'),
    jsonReport: args.includes('--json-report'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

// Main execution
async function main() {
  const options = parseArgs();
  const checker = new JsDocChecker(options);

  // Determine the root directory
  const rootDir = path.join(__dirname, '..', 'src');

  if (!fs.existsSync(rootDir)) {
    console.error(`❌ Source directory not found: ${rootDir}`);
    process.exit(1);
  }

  await checker.scan(rootDir);
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
