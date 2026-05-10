import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const featureRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consistencyDocPath = join(featureRoot, 'CONSISTENCY.md');
const consistencyDoc = readFileSync(consistencyDocPath, 'utf8');

interface SourceFile {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
}

function collectSourceFiles(dir: string): SourceFile[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries) {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...collectSourceFiles(absolutePath));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/(\.spec|\.stories|\.d)\.(ts|tsx)$/.test(entry.name)) continue;
    const relativePath = relative(featureRoot, absolutePath);
    files.push({ absolutePath, relativePath, content: readFileSync(absolutePath, 'utf8') });
  }
  return files;
}

function lineFor(content: string, pattern: RegExp): number {
  const match = pattern.exec(content);
  if (!match) return 1;
  return content.slice(0, match.index).split('\n').length;
}

function hasAllowMarker(file: SourceFile): boolean {
  return /consistency-allow:\s*destructive-pattern/.test(file.content);
}

function* iterateButtonOpeningTags(content: string): Generator<{ tag: string; index: number }> {
  const re = /<Button\b[^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    yield { tag: match[0], index: match.index };
  }
}

function* iterateTextareaTags(content: string): Generator<string> {
  const re = /<[Tt]extarea\b[^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    yield match[0];
  }
}

function hasDangerButton(file: SourceFile): boolean {
  for (const { tag } of iterateButtonOpeningTags(file.content)) {
    if (/\bintent=["']danger["']/.test(tag)) return true;
  }
  return /data-destructive=["']true["']/.test(file.content);
}

function firstDangerLine(file: SourceFile): number {
  for (const { tag, index } of iterateButtonOpeningTags(file.content)) {
    if (/\bintent=["']danger["']/.test(tag)) {
      return file.content.slice(0, index).split('\n').length;
    }
  }
  return lineFor(file.content, /data-destructive=["']true["']/);
}

function hasOutlineDangerButton(file: SourceFile): boolean {
  for (const { tag } of iterateButtonOpeningTags(file.content)) {
    const isDanger = /\bintent=["']danger["']/.test(tag);
    const isOutline = /\bappearance=["']outline["']/.test(tag);
    if (isDanger && isOutline) return true;
  }
  return false;
}

function dangerButtonsWithoutOutline(file: SourceFile): number[] {
  const lines: number[] = [];
  for (const { tag, index } of iterateButtonOpeningTags(file.content)) {
    if (!/\bintent=["']danger["']/.test(tag)) continue;
    if (/\bappearance=["']outline["']/.test(tag)) continue;
    lines.push(file.content.slice(0, index).split('\n').length);
  }
  return lines;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, (_match, prefix: string) => prefix);
}

function hasDestructiveHint(file: SourceFile): boolean {
  const cleaned = stripComments(file.content);
  if (/\bDESTRUCTIVE_HINT_TEXT\b/.test(cleaned)) return true;
  return /Diese Änderung wird historisiert und kann nicht gelöscht werden\./.test(cleaned);
}

const BEGRUENDUNG_TOKEN = /\b(begruendung|Begründung|notiz|Notiz)\b|melde-luecke-textarea/;

function hasBegruendungInput(file: SourceFile): boolean {
  if (/\buseDestructiveActionForm\b/.test(file.content)) return true;
  for (const tag of iterateTextareaTags(file.content)) {
    if (BEGRUENDUNG_TOKEN.test(tag)) return true;
  }
  return false;
}

const sourceFiles = collectSourceFiles(featureRoot);

describe('Eigenschutz UX-Konsistenz', () => {
  it('hat eine gepflegte CONSISTENCY.md als Single Source of Truth', () => {
    expect(existsSync(consistencyDocPath), 'CONSISTENCY.md fehlt im Eigenschutz-Modul.').toBe(true);
    expect(consistencyDoc).toContain('Zero-Success-Toast');
    expect(consistencyDoc).toContain('Destructive Actions Pattern');
  });

  it('verhindert neue Success-Toasts im Eigenschutz-Modul', () => {
    const offenders = sourceFiles
      .filter((file) => /\btoast\.success\s*\(/.test(file.content))
      .map((file) => `${file.relativePath}:${lineFor(file.content, /\btoast\.success\s*\(/)} — Regel: keine Success-Toast-Aufrufe im Eigenschutz-Modul.`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('verifiziert Destructive-Buttons gegen Begründung, Hinweistext und Outline-Danger', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (!hasDangerButton(file) || hasAllowMarker(file)) continue;
      const line = firstDangerLine(file);
      if (!hasBegruendungInput(file)) {
        offenders.push(`${file.relativePath}:${line} — Regel: Destructive-Button braucht ein Begründungsfeld oder einen gemeinsamen Wrapper.`);
      }
      if (!hasDestructiveHint(file)) {
        offenders.push(`${file.relativePath}:${line} — Regel: Destructive-Button braucht den historisiert-Hinweis aus CONSISTENCY.md.`);
      }
      if (!hasOutlineDangerButton(file)) {
        for (const violatingLine of dangerButtonsWithoutOutline(file)) {
          offenders.push(`${file.relativePath}:${violatingLine} — Regel: Destructive-Button muss intent="danger" mit appearance="outline" nutzen.`);
        }
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('dokumentiert alle consistency-allow-Marker in CONSISTENCY.md', () => {
    const undocumented = sourceFiles
      .filter(hasAllowMarker)
      .map((file) => file.relativePath)
      .filter((relativePath) => !consistencyDoc.includes(relativePath));

    expect(undocumented, undocumented.map((file) => `${file} — Marker ist nicht in CONSISTENCY.md dokumentiert.`).join('\n')).toEqual([]);
  });
});
