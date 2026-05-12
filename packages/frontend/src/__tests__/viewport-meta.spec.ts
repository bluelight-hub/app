import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const indexHtmlPath = resolve(here, '../../index.html');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const viewportMetaMatches = [...indexHtml.matchAll(/<meta[^>]*name=["']viewport["'][^>]*>/gi)];
const viewportMetaMatch = viewportMetaMatches[0] ?? null;

describe('Viewport-Meta-Tag (Story 7.7 / WCAG 1.4.4)', () => {
  it('enthält genau einen Viewport-Meta-Tag', () => {
    expect(viewportMetaMatches.length, 'index.html muss genau einen Viewport-Meta-Tag enthalten — sonst koennte ein zweiter Tag den ersten ueberschreiben und maximum-scale=1 wieder einfuehren.').toBe(
      1,
    );
  });

  it('verbietet maximum-scale in jedem Viewport-Meta-Tag (Pinch-Zoom-Lock bricht WCAG 1.4.4)', () => {
    expect(viewportMetaMatches.length, 'Kein Viewport-Meta-Tag in index.html — Test waere sonst vacuously gruen.').toBeGreaterThan(0);
    for (const match of viewportMetaMatches) {
      expect(match[0], 'Viewport-Meta-Tag darf maximum-scale nicht setzen — Pinch-Zoom muss möglich bleiben (UX-Spec Zeile 1175).').not.toMatch(/maximum-scale\s*=/i);
    }
  });

  it('verbietet user-scalable=no in jedem Viewport-Meta-Tag', () => {
    expect(viewportMetaMatches.length, 'Kein Viewport-Meta-Tag in index.html — Test waere sonst vacuously gruen.').toBeGreaterThan(0);
    for (const match of viewportMetaMatches) {
      expect(match[0], 'Viewport-Meta-Tag darf user-scalable=no nicht setzen — Pinch-Zoom muss möglich bleiben.').not.toMatch(/user-scalable\s*=\s*no/i);
    }
  });

  it('setzt width=device-width und initial-scale=1', () => {
    const tag = viewportMetaMatch?.[0] ?? '';
    expect(tag, 'Viewport-Meta-Tag sollte width=device-width enthalten.').toMatch(/width\s*=\s*device-width/i);
    expect(tag, 'Viewport-Meta-Tag sollte initial-scale=1(.0)? enthalten.').toMatch(/initial-scale\s*=\s*1(\.0)?/i);
  });
});
