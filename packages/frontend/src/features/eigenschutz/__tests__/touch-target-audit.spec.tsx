import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Story 7.7 Touch-Target-Audit (UX-Spec ≥ 44 px Sekundär, ≥ 48 px Primär).
 *
 * Heuristik (Source-Inspektion): jsdom liefert keine echte Layout-Box.
 * Geprueft werden interaktive Elemente in den Audit-Scope-Komponenten:
 *   - native Tags: <button>, <a>, <input type="checkbox">, <input type="radio">
 *   - capitalisierte Komponenten-Tags: <Link>, <Button>
 *   - role="button" / role="link" auf <div>/<span>
 *
 * Erlaubte Hoehen-Tokens werden aus dem className-String (oder dem aufgeloesten
 * Identifier-Body) extrahiert. Marker `// touch-target-allow: <grund>` direkt
 * vor dem Tag (genau eine Zeile davor) ueberspringt die Heuristik. Der
 * komplementaere Render-basierte Smoke-Test gegen die Audit-Scope-Komponenten
 * laeuft in `AmpelDashboard.responsive.spec.tsx` (Story 7.7 / D2).
 *
 * Die Source-Heuristik bleibt zustaendig fuer Coverage von Code-Pfaden,
 * die im Render nicht aktiv sind (z. B. Conditional-Variants ohne aktiven
 * Branch im Smoke).
 */

const here = dirname(fileURLToPath(import.meta.url));
const featureRoot = resolve(here, '..');
const consistencyDocPath = resolve(featureRoot, 'CONSISTENCY.md');
const reportPath = resolve(featureRoot, '..', '..', '..', '..', '..', 'docs', 'frontend', 'responsive-device-test-report.md');

if (!existsSync(consistencyDocPath)) {
  throw new Error(`Touch-Target-Audit kann CONSISTENCY.md nicht finden (erwartet: ${consistencyDocPath}). Pfad-Resolver pruefen, falls Repo-Struktur veraendert wurde.`);
}
if (!existsSync(reportPath)) {
  throw new Error(`Touch-Target-Audit kann den Device-Test-Bericht nicht finden (erwartet: ${reportPath}). Pfad-Resolver pruefen, falls Repo-Struktur veraendert wurde.`);
}

interface AuditFile {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly content: string;
  readonly contentNoBlockComments: string;
}

const AUDIT_FILES: ReadonlyArray<string> = ['ui/organisms/AmpelCard.tsx', 'ui/organisms/EigenschutzOffenePunktePanel.tsx', 'ui/molecules/AmpelWarnBadgeList.tsx'];

const PRIMARY_TOKENS = ['min-h-12', 'min-h-[48px]', 'h-12', 'size-12'] as const;
const SECONDARY_TOKENS = ['min-h-11', 'min-h-[44px]', 'h-11', 'h-14', 'size-11'] as const;
const ALLOWED_HEIGHT_TOKENS = [...PRIMARY_TOKENS, ...SECONDARY_TOKENS];

const ALLOW_MARKER_PATTERN = /\/\/\s*touch-target-allow:\s*([^\n]+)|\/\*\s*touch-target-allow:\s*([^*]+?)\s*\*\//i;

const INTERACTIVE_TAG_NAMES: ReadonlyArray<string> = ['button', 'a', 'input', 'Link', 'Button'];

function stripBlockComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));
}

function loadAuditFiles(): AuditFile[] {
  return AUDIT_FILES.map((relativePath) => {
    const absolutePath = resolve(featureRoot, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Touch-Target-Audit-Scope-Datei fehlt: ${absolutePath}. AUDIT_FILES-Liste pruefen.`);
    }
    const content = readFileSync(absolutePath, 'utf8');
    return {
      relativePath,
      absolutePath,
      content,
      contentNoBlockComments: stripBlockComments(content),
    };
  });
}

function findOpeningTags(content: string, tagNames: ReadonlyArray<string>): Array<{ tagName: string; openingTag: string; startIndex: number }> {
  const namePattern = tagNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`<(${namePattern})\\b`, 'g');
  const tags: Array<{ tagName: string; openingTag: string; startIndex: number }> = [];

  for (const match of content.matchAll(re)) {
    if (match.index === undefined) continue;
    const tagName = match[1];
    const startIndex = match.index;
    let endIndex: number;
    try {
      endIndex = findOpeningTagEnd(content, startIndex);
    } catch (error) {
      // Eine malformed Stelle darf nicht den gesamten Audit abreissen — wir loggen
      // sie als Diagnostic und ueberspringen den Tag.
      console.warn(`Touch-Target-Audit: Tag-Parser uebersprungen bei Index ${startIndex} — ${(error as Error).message}`);
      continue;
    }
    tags.push({
      tagName,
      openingTag: content.slice(startIndex, endIndex + 1),
      startIndex,
    });
  }
  return tags;
}

function findOpeningTagEnd(content: string, startIndex: number): number {
  let braceDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  for (let i = startIndex; i < content.length; i++) {
    const c = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if (inSingleQuote) {
      if (c === "'" && prev !== '\\') inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      if (c === '"' && prev !== '\\') inDoubleQuote = false;
      continue;
    }
    if (inTemplate) {
      if (c === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (c === "'") inSingleQuote = true;
    else if (c === '"') inDoubleQuote = true;
    else if (c === '`') inTemplate = true;
    else if (c === '{') braceDepth++;
    else if (c === '}') braceDepth--;
    else if (c === '>' && braceDepth === 0) return i;
  }
  throw new Error(`findOpeningTagEnd: Tag ohne schliessendes \`>\` ab Index ${startIndex} (Source-Datei vermutlich malformed).`);
}

function lineFor(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/**
 * Marker akzeptieren NUR wenn er direkt in der vorhergehenden Zeile steht.
 * Verhindert Leakage auf nachfolgende Geschwister-Tags.
 */
function precedingMarker(content: string, startIndex: number): string | null {
  const before = content.slice(0, startIndex);
  const lines = before.split('\n');
  const previousLine = lines[lines.length - 2] ?? '';
  const match = previousLine.match(ALLOW_MARKER_PATTERN);
  if (!match) return null;
  return (match[1] ?? match[2] ?? '').trim();
}

type ClassNameKind = 'string-literal' | 'expression' | 'none';

function classNameValue(openingTag: string): { kind: ClassNameKind; value: string } {
  const inlineString = openingTag.match(/\sclassName=("([^"]*)"|'([^']*)')/i);
  if (inlineString) return { kind: 'string-literal', value: inlineString[2] ?? inlineString[3] ?? '' };

  const exprStart = openingTag.search(/\sclassName=\{/i);
  if (exprStart >= 0) {
    const open = openingTag.indexOf('{', exprStart);
    let depth = 0;
    for (let i = open; i < openingTag.length; i++) {
      const c = openingTag[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return { kind: 'expression', value: openingTag.slice(open + 1, i) };
      }
    }
  }
  return { kind: 'none', value: '' };
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function resolveClassNameTokens(value: { kind: ClassNameKind; value: string }, fileContent: string): string {
  if (value.kind === 'none') return '';
  if (value.kind === 'string-literal') return value.value;

  const trimmed = value.value.trim();
  if (IDENTIFIER_PATTERN.test(trimmed)) {
    const declMatch = fileContent.match(new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${trimmed}\\s*=\\s*([\\s\\S]*?)(?:;|\\n\\s*\\n)`));
    if (declMatch) return collectStringLiterals(declMatch[1]).join(' ');
    return '';
  }
  return collectStringLiterals(value.value).join(' ');
}

function collectStringLiterals(source: string): string[] {
  const literals: string[] = [];
  for (const match of source.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
    literals.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return literals;
}

function hasAllowedHeightToken(className: string): boolean {
  return ALLOWED_HEIGHT_TOKENS.some((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Boundary erlaubt zusaetzlich `:` (responsive Variants wie `lg:min-h-12`).
    const re = new RegExp(`(^|[\\s'"\`,(:])${escaped}(?=[\\s'"\`,)]|$)`);
    return re.test(className);
  });
}

/**
 * <input>-Tags werden nur dann als interaktiv geprueft, wenn `type="checkbox"` oder
 * `type="radio"` gesetzt ist (Touch-Targets fuer Quittungen). Andere <input>-Typen
 * (z. B. `text`, `hidden`, `range`) liegen ausserhalb des UX-Spec-Touch-Target-Scopes.
 */
function isInteractiveInput(openingTag: string): boolean {
  const typeMatch = openingTag.match(/\stype=("([^"]*)"|'([^']*)')/i);
  const type = typeMatch ? (typeMatch[2] ?? typeMatch[3] ?? '') : '';
  return type === 'checkbox' || type === 'radio';
}

/**
 * <div>/<span>/<li> mit role="button" oder role="link" werden zusaetzlich erfasst,
 * weil die UX-Spec den Touch-Target ueber semantische Rolle definiert,
 * nicht ueber Tag-Name.
 */
function findRoleScopedInteractives(content: string): Array<{ tagName: string; openingTag: string; startIndex: number }> {
  const tags: Array<{ tagName: string; openingTag: string; startIndex: number }> = [];
  for (const match of content.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\srole=("(?:button|link)"|'(?:button|link)')/gi)) {
    if (match.index === undefined) continue;
    if (INTERACTIVE_TAG_NAMES.includes(match[1])) continue; // schon ueber Tag-Scan abgedeckt
    const startIndex = match.index;
    let endIndex: number;
    try {
      endIndex = findOpeningTagEnd(content, startIndex);
    } catch (error) {
      console.warn(`Touch-Target-Audit (role-scoped): Tag-Parser uebersprungen bei Index ${startIndex} — ${(error as Error).message}`);
      continue;
    }
    tags.push({
      tagName: match[1],
      openingTag: content.slice(startIndex, endIndex + 1),
      startIndex,
    });
  }
  return tags;
}

interface InteractiveTagAudit {
  readonly file: string;
  readonly tagName: string;
  readonly line: number;
  readonly className: string | null;
  readonly markerReason: string | null;
}

function auditFile(file: AuditFile): InteractiveTagAudit[] {
  // Tag-Inspection laeuft auf contentNoBlockComments (keine JSDoc-/Block-Kommentare),
  // damit Tags innerhalb von `/* */`-Kommentaren nicht faelschlich gefunden werden.
  // Marker-Lookup laeuft auf RAW content, weil JSX-Marker `{/* touch-target-allow: */}`
  // selbst Block-Kommentare sind und sonst beim Stripping verloren gehen.
  const content = file.contentNoBlockComments;
  const tagged = findOpeningTags(content, INTERACTIVE_TAG_NAMES);
  const roleScoped = findRoleScopedInteractives(content);

  return [...tagged, ...roleScoped]
    .filter((tag) => {
      if (tag.tagName !== 'input') return true;
      return isInteractiveInput(tag.openingTag);
    })
    .map((tag) => {
      // Marker-Lookup gegen Raw-Content: gleiche Zeilennummer = gleicher Char-Index,
      // da `stripBlockComments` Newlines bewahrt.
      const line = lineFor(content, tag.startIndex);
      const rawIndex = nthLineStart(file.content, line);
      return {
        file: file.relativePath,
        tagName: tag.tagName,
        line,
        className: resolveClassNameTokens(classNameValue(tag.openingTag), content),
        markerReason: precedingMarker(file.content, rawIndex),
      };
    });
}

function nthLineStart(content: string, lineNumber: number): number {
  // lineNumber ist 1-basiert (lineFor zaehlt ab 1).
  if (lineNumber <= 1) return 0;
  let index = 0;
  for (let i = 1; i < lineNumber; i++) {
    const next = content.indexOf('\n', index);
    if (next === -1) return content.length;
    index = next + 1;
  }
  return index;
}

const auditEntries = loadAuditFiles().flatMap(auditFile);

describe('Touch-Target-Audit (Story 7.7 / UX-Spec ≥ 44 px)', () => {
  it('findet ueberhaupt interaktive Elemente in den Audit-Scope-Komponenten', () => {
    expect(auditEntries.length, 'Touch-Target-Audit hat keine interaktiven Selektoren gefunden — Audit-Scope leer?').toBeGreaterThan(0);
  });

  it('jedes interaktive Element hat ein erlaubtes Hoehen-Token oder einen dokumentierten Marker', () => {
    const offenders: string[] = [];
    for (const entry of auditEntries) {
      if (entry.markerReason) continue;
      const className = entry.className ?? '';
      if (!hasAllowedHeightToken(className)) {
        offenders.push(
          `${entry.file}:${entry.line} <${entry.tagName}> — Regel: Touch-Target braucht ein Tailwind-Hoehen-Token (${ALLOWED_HEIGHT_TOKENS.join(', ')}) oder einen \`// touch-target-allow: <grund>\`-Marker.`,
        );
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('alle touch-target-allow-Marker sind explizit mit Datei-Pfad in CONSISTENCY.md oder Device-Test-Bericht dokumentiert', () => {
    const consistencyDoc = readFileSync(consistencyDocPath, 'utf8');
    const reportDoc = readFileSync(reportPath, 'utf8');

    const undocumented: string[] = [];
    for (const entry of auditEntries) {
      if (!entry.markerReason) continue;
      // Strenge Pruefung: Datei-Pfad MUSS im Dokumentations-Body stehen,
      // damit zufaellige Substring-Matches ueber generische `markerReason`-Strings
      // (z. B. "tooltip", "inline-link") nicht als "dokumentiert" durchgehen.
      const inConsistency = consistencyDoc.includes(entry.file);
      const inReport = reportDoc.includes(entry.file);
      if (!inConsistency && !inReport) {
        undocumented.push(`${entry.file}:${entry.line} — Marker „${entry.markerReason}" ist weder in CONSISTENCY.md noch im Device-Test-Bericht mit Datei-Pfad gelistet.`);
      }
    }
    expect(undocumented, undocumented.join('\n')).toEqual([]);
  });
});
