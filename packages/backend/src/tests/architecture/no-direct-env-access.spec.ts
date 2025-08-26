import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Architecture Test: No Direct process.env Access', () => {
  const srcDir = path.join(__dirname, '../../');
  const allowedFiles = [
    'config/config.module.ts',
    'config/configuration.ts',
    'config/security.config.ts', // CORS-Konfiguration
    'cli/cli.module.ts', // CLI Module außerhalb der normalen App
    'main.ts', // Temporär erlaubt für Bootstrap
    'app.module.ts', // Temporär erlaubt für Module-Setup
  ];

  /**
   * Rekursiv alle TypeScript-Dateien im src-Verzeichnis finden
   */
  const getAllTypeScriptFiles = (dir: string, files: string[] = []): string[] => {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Ignoriere node_modules und dist
        if (!item.includes('node_modules') && item !== 'dist') {
          getAllTypeScriptFiles(fullPath, files);
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  /**
   * Prüft ob eine Datei direkte process.env Zugriffe enthält
   */
  const checkForDirectEnvAccess = (filePath: string): string[] => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];

    // Regex für process.env Zugriffe
    const processEnvRegex = /process\.env(?:\.\w+|\[['"`][\w]+['"`]\])/g;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Ignoriere Kommentare
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      const matches = line.match(processEnvRegex);
      if (matches) {
        violations.push(`Line ${index + 1}: ${line.trim()}`);
      }
    });

    return violations;
  };

  it('should not have direct process.env access in source files', () => {
    const allFiles = getAllTypeScriptFiles(srcDir);
    const violations: { file: string; violations: string[] }[] = [];

    for (const file of allFiles) {
      const relativePath = path.relative(srcDir, file);

      // Prüfe ob die Datei in der Whitelist ist
      const isAllowed = allowedFiles.some((allowed) => relativePath.includes(allowed));

      if (!isAllowed) {
        const fileViolations = checkForDirectEnvAccess(file);

        if (fileViolations.length > 0) {
          violations.push({
            file: relativePath,
            violations: fileViolations,
          });
        }
      }
    }

    if (violations.length > 0) {
      const errorMessage = violations
        .map((v) => `\nFile: ${v.file}\n${v.violations.join('\n')}`)
        .join('\n');

      throw new Error(
        `Found direct process.env access in the following files. ` +
          `Please use AppConfigService instead:\n${errorMessage}\n\n` +
          `Example fix:\n` +
          `  // Instead of:\n` +
          `  if (process.env.NODE_ENV === 'production') { ... }\n\n` +
          `  // Use:\n` +
          `  constructor(private readonly appConfig: AppConfigService) {}\n` +
          `  if (this.appConfig.isProduction()) { ... }\n`,
      );
    }
  });

  it('should use AppConfigService for environment checks', () => {
    // Dieser Test prüft, dass die erlaubten Dateien korrekt konfiguriert sind
    for (const allowedFile of allowedFiles) {
      const fullPath = path.join(srcDir, allowedFile);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Diese Dateien sollten entweder ConfigModule importieren, bootstrap oder config-bezogen sein
        const isValid =
          content.includes('ConfigModule') ||
          content.includes('bootstrap()') ||
          allowedFile.includes('configuration.ts') ||
          allowedFile.includes('security.config.ts') ||
          allowedFile.includes('cli.module.ts');

        if (!isValid) {
          throw new Error(
            `File ${allowedFile} is in whitelist but doesn't seem to be a valid config file`,
          );
        }
      }
    }
  });
});
