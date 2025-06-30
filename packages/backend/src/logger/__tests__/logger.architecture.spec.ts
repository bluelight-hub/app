import * as fs from 'fs';
import * as path from 'path';

/**
 * Rekursives Sammeln aller Dateien mit einer bestimmten Erweiterung in einem Verzeichnis
 *
 * @param dir Verzeichnis zum Durchsuchen
 * @param extension Dateierweiterung (z.B. '.ts')
 * @param ignoreDirs Array von Verzeichnisnamen, die ignoriert werden sollen
 * @returns Array von Dateipfaden, die die Kriterien erfüllen
 */
function getAllFiles(dir: string, extension: string, ignoreDirs: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    return files.reduce<string[]>((acc, file) => {
      // Überspringe zu ignorierende Verzeichnisse
      if (file.isDirectory() && ignoreDirs.includes(file.name)) {
        return acc;
      }

      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        return [...acc, ...getAllFiles(fullPath, extension, ignoreDirs)];
      }

      if (file.isFile() && fullPath.endsWith(extension)) {
        return [...acc, fullPath];
      }

      return acc;
    }, []);
  } catch (error) {
    console.error(`Fehler beim Lesen des Verzeichnisses ${dir}:`, error);
    return [];
  }
}

/**
 * Dieser Test stellt sicher, dass im gesamten Backend-Code nur der consola-Logger
 * verwendet wird und keine direkten console.* Aufrufe vorhanden sind.
 */
describe('Logger Architecture', () => {
  /**
   * Test prüft, dass keine console.* Aufrufe im Code vorhanden sind.
   * Ausgenommen sind Test-Dateien und potenzielle Ausnahmen in einer Whitelist.
   */
  it('should not use console.log, console.error etc. directly in code', () => {
    // Root-Verzeichnis des Backend-Pakets
    const backendRoot = path.resolve(__dirname, '../../../');

    // Verzeichnisse, die ignoriert werden sollen
    const ignoreDirs = ['node_modules', 'dist', '__mocks__', 'coverage'];

    // Sammle alle TypeScript-Dateien
    const files = getAllFiles(backendRoot, '.ts', ignoreDirs);

    // Dateien, die von der Regel ausgenommen sind
    const excludeFiles = [
      'jest.setup.ts',
      'main.ts', // main.ts darf console verwenden für Startup-Logs
      'consola.logger.ts', // Die Logger-Implementierung selbst darf console erwähnen
    ];

    // Filtere Testdateien und ausgenommene Dateien
    const filesToCheck = files.filter((file) => {
      const fileName = path.basename(file);
      const isTestFile = fileName.includes('.spec.ts') || fileName.includes('.test.ts');
      const isExcluded = excludeFiles.some((excludeFile) => fileName.includes(excludeFile));

      return !isTestFile && !isExcluded;
    });

    // Whitelist für Datei-Pfade, die console.* verwenden dürfen (falls nötig)
    const whitelistedFiles: string[] = [
      // Hier können bei Bedarf Ausnahmen definiert werden
      // Beispiel: 'environment.ts',
    ];

    // Verbotene Console-Methoden
    const forbiddenConsolePatterns = [
      /console\.log\(/,
      /console\.error\(/,
      /console\.warn\(/,
      /console\.info\(/,
      /console\.debug\(/,
      /console\.trace\(/,
      /console\.dir\(/,
      /console\.time\(/,
      /console\.timeEnd\(/,
    ];

    // Sammle Verstöße gegen die Architekturregeln
    const violations: string[] = [];

    // Prüfe jede Datei
    filesToCheck.forEach((file) => {
      const relativeFilePath = path.relative(backendRoot, file);

      // Überspringe Dateien aus der Whitelist
      if (whitelistedFiles.some((whitelisted) => relativeFilePath.includes(whitelisted))) {
        return;
      }

      // Lese Dateiinhalt
      const content = fs.readFileSync(file, 'utf-8');

      // Prüfe auf verbotene console.* Aufrufe
      forbiddenConsolePatterns.forEach((pattern) => {
        if (pattern.test(content)) {
          violations.push(`${relativeFilePath} verwendet ${pattern} statt des consola-Loggers`);
        }
      });
    });

    // Erwarte keine Verstöße gegen die Architekturregeln
    expect(violations).toEqual([]);
  });
});
