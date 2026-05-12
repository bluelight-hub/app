import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

/**
 * Story 7.10 AC1 — Bundle-Size-Gate für das Eigenschutz-Feature-Bundle.
 *
 * Misst die gzipped Größe der Chunks, die TanStack-Router-Auto-Code-Splitting
 * für die Eigenschutz-Route emittiert, und gated auf NFR-P7 ≤ 150 kB.
 *
 * Variante (b) — `node:zlib.gzipSync()` über `dist/assets/*.js`, kein
 * stdout-Parsing von `vite build`. Deterministischer und unabhängig vom
 * Vite-Output-Format.
 *
 * Vendor-Chunks werden anteilig **nicht** in den Eigenschutz-Bundle-Counter
 * eingerechnet (NFR-P7-Wortlaut: „zusätzliches JS-Bundle"), siehe
 * `classifyChunk`. Initiale Allow-List für dokumentierte Ausnahmen ist
 * leer (`DATA_BUNDLE_SIZE_ALLOW`).
 *
 * **Toleranz / Allow-List (`data-bundle-size-allow`-Konvention):** Analog zu
 * `axe-allow` aus Story 7.8 und `data-touch-target-allow` aus Story 7.7. Initial 0
 * Einträge. Wer einen Eintrag ergänzt, dokumentiert ihn im Audit-Bericht.
 *
 * **Build-Skipping:** `EIGENSCHUTZ_BUNDLE_TEST_SKIP_BUILD=1` lässt den Test ein
 * vorhandenes `dist/` wiederverwenden — CI-Beschleunigung mit Cache-Reuse.
 *
 * **Slow-Spec-Flag:** Standardmäßig wird der teure Build-+-Measure-Block per
 * `describe.runIf(...)` übersprungen. `RUN_BUNDLE_SIZE_SPEC=1` oder CI-Umgebung
 * aktiviert ihn. So bleibt `pnpm --filter @bluelight-hub/frontend test` schnell.
 */

const NFR_P7_GZIP_LIMIT_BYTES = 150 * 1024;
const FRONTEND_PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');
const DIST_DIR = path.join(FRONTEND_PACKAGE_ROOT, 'dist', 'assets');

const DATA_BUNDLE_SIZE_ALLOW: ReadonlyArray<{ chunkPattern: RegExp; reason: string }> = [];

interface ChunkInfo {
  filename: string;
  rawBytes: number;
  gzipBytes: number;
}

interface ChunkClassification extends ChunkInfo {
  countedAsEigenschutz: 'yes' | 'no' | 'partial';
  reason: string;
}

function shouldRunVitestSlowSpec(): boolean {
  return process.env.RUN_BUNDLE_SIZE_SPEC === '1' || process.env.CI === 'true';
}

function buildFrontendIfNeeded(): void {
  if (process.env.EIGENSCHUTZ_BUNDLE_TEST_SKIP_BUILD === '1' && existsSync(DIST_DIR)) {
    return;
  }
  execFileSync('pnpm', ['exec', 'vite', 'build', '--mode', 'production'], {
    cwd: FRONTEND_PACKAGE_ROOT,
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });
}

function loadDistChunks(): ChunkInfo[] {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`dist/assets nicht gefunden unter ${DIST_DIR}. Vite-Build ausführen oder EIGENSCHUTZ_BUNDLE_TEST_SKIP_BUILD entfernen.`);
  }
  const files = readdirSync(DIST_DIR).filter((file) => file.endsWith('.js'));
  return files.map((filename) => {
    const filePath = path.join(DIST_DIR, filename);
    const raw = readFileSync(filePath);
    return {
      filename,
      rawBytes: statSync(filePath).size,
      gzipBytes: gzipSync(raw, { level: 9 }).length,
    };
  });
}

/**
 * Heuristik: Chunks gelten als „Eigenschutz-zugehörig", wenn ihr Filename
 * `eigenschutz`, `gefaehrdung`, `psa-profil`, `sicherheitsregel`,
 * `sicherungsposten` oder `vorfall` enthält.
 *
 * Vendor-Chunks (`vendor`, `node_modules`) sowie `index-*.js` als App-Root
 * zählen **nicht** als Eigenschutz-spezifisch.
 */
function classifyChunk(chunk: ChunkInfo): ChunkClassification {
  const lower = chunk.filename.toLowerCase();
  const allowMatch = DATA_BUNDLE_SIZE_ALLOW.find((entry) => entry.chunkPattern.test(chunk.filename));
  if (allowMatch) {
    return { ...chunk, countedAsEigenschutz: 'no', reason: `allow: ${allowMatch.reason}` };
  }
  if (/(^|[\/\-])index-[a-z0-9]+\.js$/.test(chunk.filename)) {
    return { ...chunk, countedAsEigenschutz: 'no', reason: 'app-root index chunk (shared)' };
  }
  if (lower.includes('vendor') || lower.includes('node_modules')) {
    return { ...chunk, countedAsEigenschutz: 'no', reason: 'vendor / node_modules chunk (shared)' };
  }
  if (/eigenschutz/.test(lower)) {
    return { ...chunk, countedAsEigenschutz: 'yes', reason: 'eigenschutz route chunk' };
  }
  if (/(^|[\/\-_])(gefaehrdung|psa-profil|psaprofile|psa_profile|sicherheitsregel|sicherungsposten|sicherungspost|vorfall|vorfaell|sicherheit)/.test(lower)) {
    return { ...chunk, countedAsEigenschutz: 'yes', reason: 'eigenschutz child route chunk' };
  }
  // Underscore-/PascalCase-Komponenten-Chunks (z. B. `PsaProfilePage-<hash>.js`,
  // `_vorfallId-<hash>.js`): TanStack-Router emittiert Route-Param-Files mit
  // führendem Underscore, Komponenten-Chunks mit PascalCase ohne Trenner.
  if (/(^|[\/\-_])(PsaProfile|PsaBekanntgabe|Gefaehrdung|Sicherheitsregel|Sicherungsposten|Vorfall|Vorfaell|Ampel|Eigenschutz|_vorfall|_einheit|_psa|_gef)/i.test(chunk.filename)) {
    return { ...chunk, countedAsEigenschutz: 'yes', reason: 'eigenschutz component/param-route chunk' };
  }
  return { ...chunk, countedAsEigenschutz: 'no', reason: 'non-eigenschutz chunk' };
}

function formatTable(rows: ChunkClassification[]): string {
  const sorted = [...rows].sort((a, b) => b.gzipBytes - a.gzipBytes);
  const lines = ['Filename | gzip (B) | raw (B) | Counted | Reason', '---------|----------|---------|---------|-------'];
  for (const row of sorted) {
    lines.push(`${row.filename} | ${row.gzipBytes} | ${row.rawBytes} | ${row.countedAsEigenschutz} | ${row.reason}`);
  }
  return lines.join('\n');
}

describe.runIf(shouldRunVitestSlowSpec())('Story 7.10 AC1 — Eigenschutz-Bundle-Size-Gate (NFR-P7)', () => {
  let chunks: ChunkClassification[] = [];

  beforeAll(
    () => {
      buildFrontendIfNeeded();
      chunks = loadDistChunks().map(classifyChunk);
    },
    6 * 60 * 1000,
  );

  it(
    'hält die gzipped Summe der Eigenschutz-Chunks unter 150 kB (NFR-P7)',
    () => {
      const eigenschutzChunks = chunks.filter((chunk) => chunk.countedAsEigenschutz === 'yes');
      const totalGzip = eigenschutzChunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);

      if (totalGzip > NFR_P7_GZIP_LIMIT_BYTES) {
        const tableAll = formatTable(chunks);
        throw new Error(`NFR-P7-Verletzung: Eigenschutz-Bundle ${totalGzip} B gzipped, Limit ${NFR_P7_GZIP_LIMIT_BYTES} B (150 kB).\n\nAlle Chunks (sortiert nach gzip):\n${tableAll}`);
      }

      expect(totalGzip).toBeLessThanOrEqual(NFR_P7_GZIP_LIMIT_BYTES);
    },
    6 * 60 * 1000,
  );

  it('emittiert mindestens je 1 Code-Splitting-Chunk für Eigenschutz-Layout und nachgelagerte Routen', () => {
    const eigenschutzChunks = chunks.filter((chunk) => chunk.countedAsEigenschutz === 'yes');
    const expectedRoutePatterns: ReadonlyArray<{ name: string; pattern: RegExp }> = [
      { name: 'eigenschutz layout', pattern: /eigenschutz/i },
      { name: 'gefaehrdungen', pattern: /gefaehrdung/i },
      { name: 'psa-profile', pattern: /psa-profil/i },
      { name: 'sicherheitsregeln', pattern: /sicherheitsregel/i },
      { name: 'sicherungsposten', pattern: /sicherungsposten/i },
      { name: 'vorfaelle', pattern: /vorfall|vorfaell/i },
    ];

    const missing = expectedRoutePatterns.filter((entry) => !eigenschutzChunks.some((chunk) => entry.pattern.test(chunk.filename)));

    if (missing.length > 0) {
      throw new Error(
        `Code-Splitting-Regression: Erwartete eigenständige Chunks fehlen für: ${missing.map((m) => m.name).join(', ')}.\n\nGefundene Eigenschutz-Chunks:\n${formatTable(eigenschutzChunks)}`,
      );
    }

    expect(missing).toEqual([]);
  });

  it('dokumentiert die Chunk-Klassifikation als Test-Output (Audit-Trace)', () => {
    const table = formatTable(chunks);
    expect(table).toContain('Counted');
    expect(table.split('\n').length).toBeGreaterThan(2);
  });
});

describe('Story 7.10 AC1 — Bundle-Spec Self-Check (kein Build nötig)', () => {
  it('klassifiziert Vendor-Chunks korrekt als nicht-Eigenschutz', () => {
    const sample: ChunkInfo = { filename: 'vendor-react-DAbc123.js', rawBytes: 100, gzipBytes: 50 };
    expect(classifyChunk(sample).countedAsEigenschutz).toBe('no');
  });

  it('klassifiziert eigenschutz-Route-Chunk korrekt als Eigenschutz', () => {
    const sample: ChunkInfo = { filename: 'eigenschutz-DAbc123.js', rawBytes: 100, gzipBytes: 50 };
    expect(classifyChunk(sample).countedAsEigenschutz).toBe('yes');
  });

  it('klassifiziert gefaehrdungen-Child-Chunk korrekt als Eigenschutz', () => {
    const sample: ChunkInfo = { filename: 'gefaehrdungen-DAbc123.js', rawBytes: 100, gzipBytes: 50 };
    expect(classifyChunk(sample).countedAsEigenschutz).toBe('yes');
  });

  it('klassifiziert app-root index-Chunk korrekt als nicht-Eigenschutz', () => {
    const sample: ChunkInfo = { filename: 'index-DAbc123.js', rawBytes: 100, gzipBytes: 50 };
    expect(classifyChunk(sample).countedAsEigenschutz).toBe('no');
  });
});
