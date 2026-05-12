import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Story 7.7 Reflow-Audit (WCAG 1.4.10): Source-Heuristik (jsdom liefert keine Layout-Box).
 * Geprüft werden die Eigenschutz-Quellen und Sicherheits-Routen auf Tokens, die fixe
 * Mindest-/Vollbreiten oberhalb des 320-px-Reflow-Schwellwerts erzwingen.
 *
 * Heuristik:
 *   (a) Inline-Style `style={{ minWidth: '<N>px' }}` oder `style={{ minWidth: '<N>rem' }}` über Schwelle.
 *   (b) Tailwind `min-w-[<N>px|rem|vw]` über Schwelle.
 *   (c) Tailwind `w-[<N>px|rem|vw]` über Schwelle ohne `max-w-*`-Cap im selben className-String.
 *
 * Marker `// reflow-allow: <grund>` UNMITTELBAR vor dem Element überspringt die Heuristik
 * (Fenster ist genau eine Zeile, damit ein Marker nicht auf nachfolgende Geschwister leakt).
 *
 * Allowlist (kein Source-Marker nötig): MapGL-Marker-Datei, RiskMatrix5x5, Storybook-Stories.
 */
const here = dirname(fileURLToPath(import.meta.url));
const featureRoot = resolve(here, '..');
const frontendRoot = resolve(featureRoot, '..', '..', '..');
const reportPath = resolve(frontendRoot, '..', '..', 'docs', 'frontend', 'responsive-device-test-report.md');
const consistencyDocPath = resolve(featureRoot, 'CONSISTENCY.md');

if (!existsSync(reportPath)) {
  throw new Error(`Reflow-Audit kann den Device-Test-Bericht nicht finden (erwartet: ${reportPath}). Pfad-Resolver pruefen, falls Repo-Struktur veraendert wurde.`);
}
if (!existsSync(consistencyDocPath)) {
  throw new Error(`Reflow-Audit kann CONSISTENCY.md nicht finden (erwartet: ${consistencyDocPath}). Pfad-Resolver pruefen, falls Repo-Struktur veraendert wurde.`);
}

const REFLOW_THRESHOLD_PX = 320;
const REFLOW_THRESHOLD_REM = 20;
const ALLOW_MARKER_PATTERN = /\/\/\s*reflow-allow:\s*([^\n]+)|\/\*\s*reflow-allow:\s*([^*]+?)\s*\*\//i;

const ALLOWLIST_BASENAMES = new Set<string>(['RiskMatrix5x5.tsx', 'SecurityPostMapMarker.tsx']);

const ALLOWLIST_PATH_HINTS = ['/map/', '/lagekarte/', '.stories.', '/__tests__/', '.spec.'];

interface SourceFile {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
  readonly contentNoBlockComments: string;
}

const KNOWN_AUDIT_ROOTS = [resolve(frontendRoot, 'src', 'features', 'eigenschutz'), resolve(frontendRoot, 'src', 'routes', 'app', 'einsatz', '$einsatzId', 'sicherheit')];

function stripBlockComments(content: string): string {
  // Replace /* ... */ block comments with whitespace of equal length so that
  // line/column positions of remaining tokens stay stable for diagnostic output.
  return content.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));
}

function collectSourceFiles(roots: ReadonlyArray<string>): SourceFile[] {
  const files: SourceFile[] = [];
  const visited = new Set<string>();

  function walk(dir: string, isAuditRoot: boolean) {
    if (visited.has(dir)) return;
    visited.add(dir);

    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (isAuditRoot) {
        // Bekannte Audit-Roots duerfen NICHT silent ausfallen, sonst schrumpft der Audit-Scope unbemerkt.
        throw new Error(`Reflow-Audit kann Audit-Root nicht lesen: ${dir} — ${(error as Error).message}`);
      }
      return;
    }
    for (const entry of entries) {
      const absolutePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.tauri') continue;
        walk(absolutePath, false);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/(\.spec|\.stories|\.d)\.(ts|tsx)$/.test(entry.name)) continue;
      const relativePath = relative(frontendRoot, absolutePath);
      const content = readFileSync(absolutePath, 'utf8');
      files.push({ absolutePath, relativePath, content, contentNoBlockComments: stripBlockComments(content) });
    }
  }

  for (const root of roots) walk(root, true);
  return files;
}

function isAllowlisted(file: SourceFile): boolean {
  const basename = file.relativePath.split('/').pop() ?? '';
  if (ALLOWLIST_BASENAMES.has(basename)) return true;
  return ALLOWLIST_PATH_HINTS.some((hint) => file.relativePath.includes(hint));
}

function lineFor(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/**
 * Marker akzeptieren NUR wenn er direkt in der vorhergehenden Zeile steht.
 * Verhindert Leakage auf nachfolgende Geschwister-Elemente.
 */
function precedingMarker(content: string, startIndex: number): string | null {
  const before = content.slice(0, startIndex);
  const lines = before.split('\n');
  const previousLine = lines[lines.length - 2] ?? '';
  const match = previousLine.match(ALLOW_MARKER_PATTERN);
  if (!match) return null;
  return (match[1] ?? match[2] ?? '').trim();
}

/**
 * Cap-Suche bleibt auf der gleichen className-String (oder cn()-Argument-Liste) beschränkt:
 * naechstes umschließendes Anführungszeichen-Paar oder Backtick-Block.
 */
function enclosingClassString(content: string, index: number): string {
  // Findet das engste umschliessende Quote-Paar (`"`, `'`, `` ` ``) ohne Newline-Ueberquerung.
  for (const quote of ['"', "'", '`'] as const) {
    const start = content.lastIndexOf(quote, index);
    const end = content.indexOf(quote, index);
    if (start >= 0 && end > index && content.slice(start + 1, end).indexOf('\n') === -1) {
      return content.slice(start + 1, end);
    }
  }
  // Fallback: gesamter cn()-Aufruf in einer Zeile bzw. Zeilenrumpf.
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const lineEnd = content.indexOf('\n', index);
  return content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
}

/**
 * Tailwind-Variant-Prefixes wie `sm:`/`md:`/`lg:`/`xl:`/`2xl:` und arbitrary
 * `min-[<N>px]:`/`max-<bp>:` greifen erst ueber 320 px und sind kein 320-px-Reflow-Risiko.
 */
function hasResponsivePrefix(content: string, index: number): boolean {
  const lookbackStart = Math.max(0, index - 32);
  const lookback = content.slice(lookbackStart, index);
  if (/(?:sm|md|lg|xl|2xl):$/i.test(lookback)) return true;
  if (/min-\[[^\]]+\]:$/i.test(lookback)) return true;
  if (/max-(?:sm|md|lg|xl|2xl|\[[^\]]+\]):$/i.test(lookback)) return true;
  return false;
}

function isInsideLineComment(content: string, index: number): boolean {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = content.indexOf('\n', index);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
  if (/^\s*\*\s/.test(line)) return true; // JSDoc-Fortsetzung
  // Suche `//` ausserhalb von URLs/Strings: simpel ueber Position relativ zum naechsten Quote.
  // `//` als Teil von `://` (URL-Schema) zaehlt NICHT als Kommentar-Start.
  let searchFrom = 0;
  while (searchFrom < line.length) {
    const slashIndex = line.indexOf('//', searchFrom);
    if (slashIndex === -1) return false;
    const prevChar = slashIndex > 0 ? line[slashIndex - 1] : '';
    if (prevChar === ':') {
      searchFrom = slashIndex + 2;
      continue;
    }
    return slashIndex <= index - lineStart;
  }
  return false;
}

const MAX_WIDTH_CAP_PATTERN = /(max-w-full|max-w-fit|max-w-screen-[a-z0-9]+|max-w-\[[^\]]+\]|max-w-(?:none|prose|md|sm|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl))/;

function hasMaxWidthCap(classBlock: string): boolean {
  return MAX_WIDTH_CAP_PATTERN.test(classBlock);
}

interface Offender {
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly reason: string;
}

function exceedsThreshold(value: number, unit: string): boolean {
  if (unit === 'px') return value > REFLOW_THRESHOLD_PX;
  if (unit === 'rem') return value > REFLOW_THRESHOLD_REM;
  if (unit === 'vw') return value > 100; // > 100 vw bricht definitiv 320 px
  return false;
}

function auditMinWidth(file: SourceFile): Offender[] {
  const offenders: Offender[] = [];
  // Tailwind: min-w-[Npx], min-w-[Nrem], min-w-[Nvw]
  for (const match of file.contentNoBlockComments.matchAll(/min-w-\[(\d+(?:\.\d+)?)(px|rem|vw)\]/g)) {
    if (match.index === undefined) continue;
    const value = Number(match[1]);
    const unit = match[2];
    if (!exceedsThreshold(value, unit)) continue;
    if (precedingMarker(file.contentNoBlockComments, match.index)) continue;
    if (isInsideLineComment(file.contentNoBlockComments, match.index)) continue;
    offenders.push({
      file: file.relativePath,
      line: lineFor(file.contentNoBlockComments, match.index),
      snippet: match[0],
      reason: `Tailwind \`${match[0]}\` setzt eine Mindest-Breite ueber dem 320-px-Schwellwert (WCAG 1.4.10).`,
    });
  }
  // Tailwind Default-Spacing: `min-w-N` (N * 0.25rem = N*4 px). Schwelle: > 320 px = N > 80.
  for (const match of file.contentNoBlockComments.matchAll(/(?:^|[\s'"`{(,])min-w-(\d+)(?=[\s'"`,)]|$)/g)) {
    if (match.index === undefined) continue;
    const n = Number(match[1]);
    const px = n * 4;
    if (px <= REFLOW_THRESHOLD_PX) continue;
    const tokenIndex = match.index + match[0].indexOf('min-w-');
    if (precedingMarker(file.contentNoBlockComments, tokenIndex)) continue;
    if (isInsideLineComment(file.contentNoBlockComments, tokenIndex)) continue;
    if (hasResponsivePrefix(file.contentNoBlockComments, tokenIndex)) continue;
    offenders.push({
      file: file.relativePath,
      line: lineFor(file.contentNoBlockComments, tokenIndex),
      snippet: `min-w-${n}`,
      reason: `Tailwind \`min-w-${n}\` (= ${px} px) setzt eine Mindest-Breite ueber 320 px (WCAG 1.4.10).`,
    });
  }
  // Inline-Style: minWidth: 'Npx' / 'Nrem'
  for (const match of file.contentNoBlockComments.matchAll(/minWidth\s*:\s*['"](\d+(?:\.\d+)?)(px|rem)['"]/g)) {
    if (match.index === undefined) continue;
    const value = Number(match[1]);
    const unit = match[2];
    if (!exceedsThreshold(value, unit)) continue;
    if (precedingMarker(file.contentNoBlockComments, match.index)) continue;
    if (isInsideLineComment(file.contentNoBlockComments, match.index)) continue;
    offenders.push({
      file: file.relativePath,
      line: lineFor(file.contentNoBlockComments, match.index),
      snippet: match[0],
      reason: `Inline-Style \`${match[0]}\` setzt eine Mindest-Breite ueber dem 320-px-Schwellwert (WCAG 1.4.10).`,
    });
  }
  return offenders;
}

function auditFixedWidth(file: SourceFile): Offender[] {
  const offenders: Offender[] = [];
  // Boundary garantiert: kein min-/max-Prefix UND vorne ein Wortgrenzen-Token.
  for (const match of file.contentNoBlockComments.matchAll(/(?:^|[\s'"`{(,])w-\[(\d+(?:\.\d+)?)(px|rem|vw)\]/g)) {
    if (match.index === undefined) continue;
    const value = Number(match[1]);
    const unit = match[2];
    if (!exceedsThreshold(value, unit)) continue;
    // Eigentlicher Match-Index ist nach dem Boundary-Zeichen.
    const tokenIndex = match.index + match[0].indexOf('w-[');
    if (isInsideLineComment(file.contentNoBlockComments, tokenIndex)) continue;
    if (precedingMarker(file.contentNoBlockComments, tokenIndex)) continue;
    if (hasResponsivePrefix(file.contentNoBlockComments, tokenIndex)) continue;
    const surrounding = enclosingClassString(file.contentNoBlockComments, tokenIndex);
    if (hasMaxWidthCap(surrounding)) continue;
    const snippet = `w-[${match[1]}${unit}]`;
    offenders.push({
      file: file.relativePath,
      line: lineFor(file.contentNoBlockComments, tokenIndex),
      snippet,
      reason: `Tailwind \`${snippet}\` setzt eine feste Breite ueber 320 px ohne \`max-w-*\`-Cap im selben className. Reflow-Bruch (WCAG 1.4.10).`,
    });
  }
  // Tailwind Default-Spacing: `w-N` (N * 0.25rem = N*4 px). Schwelle: > 320 px = N > 80.
  for (const match of file.contentNoBlockComments.matchAll(/(?:^|[\s'"`{(,])w-(\d+)(?=[\s'"`,)]|$)/g)) {
    if (match.index === undefined) continue;
    const n = Number(match[1]);
    const px = n * 4;
    if (px <= REFLOW_THRESHOLD_PX) continue;
    const tokenIndex = match.index + match[0].indexOf('w-');
    if (isInsideLineComment(file.contentNoBlockComments, tokenIndex)) continue;
    if (precedingMarker(file.contentNoBlockComments, tokenIndex)) continue;
    if (hasResponsivePrefix(file.contentNoBlockComments, tokenIndex)) continue;
    const surrounding = enclosingClassString(file.contentNoBlockComments, tokenIndex);
    if (hasMaxWidthCap(surrounding)) continue;
    offenders.push({
      file: file.relativePath,
      line: lineFor(file.contentNoBlockComments, tokenIndex),
      snippet: `w-${n}`,
      reason: `Tailwind \`w-${n}\` (= ${px} px) setzt eine feste Breite ueber 320 px ohne \`max-w-*\`-Cap im selben className (WCAG 1.4.10).`,
    });
  }
  return offenders;
}

const sourceFiles = collectSourceFiles(KNOWN_AUDIT_ROOTS).filter((file) => !isAllowlisted(file));

const offenders = sourceFiles.flatMap((file) => [...auditMinWidth(file), ...auditFixedWidth(file)]);

describe('Reflow-Audit (Story 7.7 / WCAG 1.4.10)', () => {
  it('findet Eigenschutz-Quellen fuer die Heuristik', () => {
    expect(sourceFiles.length, 'Reflow-Audit hat keine Eigenschutz-Quellen geladen.').toBeGreaterThan(10);
  });

  it('keine Eigenschutz-Quelle erzeugt einen 320-px-Reflow-Bruch', () => {
    const messages = offenders.map((offender) => `${offender.file}:${offender.line} ${offender.snippet} — ${offender.reason}`);
    expect(messages, messages.join('\n')).toEqual([]);
  });

  it('alle reflow-allow-Marker sind explizit mit Datei-Pfad in CONSISTENCY.md oder Device-Test-Bericht dokumentiert', () => {
    const consistencyDoc = readFileSync(consistencyDocPath, 'utf8');
    const reportDoc = readFileSync(reportPath, 'utf8');

    const undocumented: string[] = [];
    for (const file of sourceFiles) {
      for (const match of file.contentNoBlockComments.matchAll(/\/\/\s*reflow-allow:\s*([^\n]+)/g)) {
        const reason = (match[1] ?? '').trim();
        // Strenge Pruefung: Datei-Pfad MUSS im Dokumentations-Body stehen,
        // damit zufaellige Substring-Matches ueber generische `reason`-Strings
        // (z. B. "tooltip", "inline-link") nicht als "dokumentiert" durchgehen.
        const inConsistency = consistencyDoc.includes(file.relativePath);
        const inReport = reportDoc.includes(file.relativePath);
        if (!inConsistency && !inReport) {
          undocumented.push(`${file.relativePath} — Marker „${reason}" ist weder in CONSISTENCY.md noch im Device-Test-Bericht mit Datei-Pfad gelistet.`);
        }
      }
    }
    expect(undocumented, undocumented.join('\n')).toEqual([]);
  });
});
