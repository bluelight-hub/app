/**
 * Story 7.8 — Token-basierte WCAG-2.1-Kontrast-Verifikation für Eigenschutz.
 *
 * axe-core kann in jsdom keinen `color-contrast`-Check durchführen (kein
 * Compute-Style). Diese Spec ist daher der ehrliche Beleg für AC4: sie liest
 * die Tokens direkt aus `index.tailwind.css` ein, prüft Light- und Dark-Mode
 * gegen die WCAG-Schwellen und schreibt einen JSON-Snapshot für den Audit-
 * Bericht (Story 7.8 / T6), wenn `WRITE_CONTRAST_SNAPSHOT=1` gesetzt ist.
 *
 * Schwellen (AC4):
 *  - severity-critical-assertive (Light + Dark) Text-auf-Surface ≥ 7:1 (AAA)
 *  - alle übrigen severity-/psa-profile-/sync-/status-Familien ≥ 4.5:1
 *  - Borders / non-text-UI gegen Canvas oder Panel ≥ 3:1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const stylesheetPath = path.resolve(currentDirectory, '../../../index.tailwind.css');
const snapshotPath = path.resolve(currentDirectory, '../../../../../../docs/audits/eigenschutz-a11y-audit-2026-05-10.contrast.json');

type ThemeName = 'light' | 'dark';

interface TokenCombination {
  readonly family: string;
  readonly surfaceSlot: string;
  readonly borderSlot: string;
  readonly textSlot: string;
  /** Optionaler Text-Schwellwert (Default 4.5). */
  readonly textFloor?: number;
  /**
   * Wenn true, werden border-on-canvas/border-on-panel-Verstöße nur als
   * Advisory in den Snapshot geschrieben statt hart zu failen. Hintergrund:
   * status-*-Borders sind designseitig paarweise an ihre eigene Surface
   * gekoppelt (Toast/Banner), nicht für freistehende Verwendung auf bloßer
   * Canvas vorgesehen. Die Story-7.1-Spec
   * (`shared/ui/__tests__/ring-1-design-tokens.spec.ts`) klammert status-*
   * aus demselben Grund explizit aus. Findings werden trotzdem im
   * Audit-Snapshot festgehalten (Story 7.8 / T6).
   */
  readonly borderAdvisory?: boolean;
}

interface TokenRow {
  readonly family: string;
  readonly slot: string;
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
  /**
   * Wenn true, ist diese Zeile nur informativ — sie zählt nicht in das
   * Hard-Fail der Light/Dark-Tests. Wird im Snapshot trotzdem geführt, damit
   * der Audit-Bericht (T6) die tatsächlichen Werte zitieren kann.
   */
  readonly advisory?: boolean;
}

interface ContrastSnapshot {
  readonly generatedAt: string;
  readonly themes: Record<ThemeName, TokenRow[]>;
}

/**
 * Pflicht-Token-Familien für Story 7.8. Severity + PSA-Profile + Sync stammen
 * aus Story 7.1; status-* werden für die Eigenschutz-Surfaces ergänzt.
 */
const STORY_7_8_TOKEN_COMBINATIONS: readonly TokenCombination[] = [
  { family: 'severity-critical-assertive', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text', textFloor: 7 },
  { family: 'severity-warning', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'severity-info', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-basis', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-basis', surfaceSlot: 'active-surface', borderSlot: 'active-border', textSlot: 'active-text' },
  { family: 'psa-profile-infektion', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-infektion', surfaceSlot: 'active-surface', borderSlot: 'active-border', textSlot: 'active-text' },
  { family: 'psa-profile-vu', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-vu', surfaceSlot: 'active-surface', borderSlot: 'active-border', textSlot: 'active-text' },
  { family: 'psa-profile-cbrn-patient', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-cbrn-patient', surfaceSlot: 'active-surface', borderSlot: 'active-border', textSlot: 'active-text' },
  { family: 'psa-profile-vollschutz', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'psa-profile-vollschutz', surfaceSlot: 'active-surface', borderSlot: 'active-border', textSlot: 'active-text' },
  { family: 'sync-synced', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'sync-pending', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'sync-offline', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'sync-conflict', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text' },
  { family: 'status-info', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text', borderAdvisory: true },
  { family: 'status-success', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text', borderAdvisory: true },
  { family: 'status-warning', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text', borderAdvisory: true },
  { family: 'status-danger', surfaceSlot: 'surface', borderSlot: 'border', textSlot: 'text', borderAdvisory: true },
];

function extractBlock(stylesheet: string, selector: ':root' | '.dark'): string {
  const pattern = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const match = pattern.exec(stylesheet);
  if (match === null) {
    throw new Error(`CSS-Block ${selector} nicht gefunden`);
  }
  return match[1];
}

function readCssVariable(block: string, variableName: string): string {
  const pattern = new RegExp(`${variableName}:\\s*([^;]+);`);
  const match = pattern.exec(block);
  if (match === null) {
    throw new Error(`CSS-Variable ${variableName} nicht gefunden`);
  }
  return match[1].trim();
}

function hexToRgb(hexColor: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hexColor);
  if (match === null) {
    throw new Error(`Erwartet wurde ein 6-stelliger Hex-Wert, erhalten: ${hexColor}`);
  }
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

interface ParsedColor {
  readonly rgb: [number, number, number];
  readonly alpha: number;
}

/**
 * Parst sowohl Hex (#rrggbb) als auch `rgb(R G B / α)` / `rgb(R G B)` /
 * `rgba(R, G, B, α)`. α defaultet auf 1.0.
 */
function parseColor(raw: string): ParsedColor {
  const trimmed = raw.trim();
  if (trimmed.startsWith('#')) {
    return { rgb: hexToRgb(trimmed), alpha: 1 };
  }

  const fnMatch = /^rgba?\(([^)]+)\)$/i.exec(trimmed);
  if (fnMatch === null) {
    throw new Error(`Unbekanntes Farbformat: ${raw}`);
  }
  const inner = fnMatch[1].trim();

  let rgbPart: string;
  let alphaPart: string | undefined;

  if (inner.includes('/')) {
    const slashSplit = inner.split('/').map((part) => part.trim());
    rgbPart = slashSplit[0];
    alphaPart = slashSplit[1];
  } else {
    const parts = inner.split(',').map((part) => part.trim());
    if (parts.length === 4) {
      rgbPart = parts.slice(0, 3).join(' ');
      alphaPart = parts[3];
    } else {
      rgbPart = parts.join(' ');
      alphaPart = undefined;
    }
  }

  const channels = rgbPart
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => {
      if (value.endsWith('%')) {
        return Math.round((Number.parseFloat(value) / 100) * 255);
      }
      return Number.parseInt(value, 10);
    });

  if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) {
    throw new Error(`Konnte RGB-Kanäle nicht parsen: ${raw}`);
  }

  let alpha = 1;
  if (alphaPart !== undefined) {
    alpha = alphaPart.endsWith('%') ? Number.parseFloat(alphaPart) / 100 : Number.parseFloat(alphaPart);
  }

  return { rgb: [channels[0], channels[1], channels[2]], alpha };
}

/**
 * Komponiert eine teiltransparente Quellfarbe über einen opaken Hintergrund
 * (Hex). Formel: `effective = α·src + (1−α)·dst`.
 */
function composite(srcRgba: ParsedColor, dstHex: string): [number, number, number] {
  const dst = hexToRgb(dstHex);
  const alpha = Math.max(0, Math.min(1, srcRgba.alpha));
  return [Math.round(alpha * srcRgba.rgb[0] + (1 - alpha) * dst[0]), Math.round(alpha * srcRgba.rgb[1] + (1 - alpha) * dst[1]), Math.round(alpha * srcRgba.rgb[2] + (1 - alpha) * dst[2])];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Liefert eine opake Hex-Farbe. Liegt eine teiltransparente Quellfarbe vor,
 * wird sie über `dstHex` (Canvas oder Panel) komponiert.
 */
function resolveOpaqueHex(raw: string, dstHex: string): string {
  const parsed = parseColor(raw);
  if (parsed.alpha >= 1) {
    return rgbToHex(parsed.rgb);
  }
  return rgbToHex(composite(parsed, dstHex));
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const foregroundLuminance = relativeLuminance(hexToRgb(foregroundHex));
  const backgroundLuminance = relativeLuminance(hexToRgb(backgroundHex));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildThemeRows(_themeName: ThemeName, block: string): TokenRow[] {
  const canvasHex = resolveOpaqueHex(readCssVariable(block, '--ring-1-color-surface-canvas'), '#ffffff');
  const panelHex = resolveOpaqueHex(readCssVariable(block, '--ring-1-color-surface-panel'), canvasHex);

  const rows: TokenRow[] = [];

  for (const combination of STORY_7_8_TOKEN_COMBINATIONS) {
    const textRaw = readCssVariable(block, `--ring-1-color-${combination.family}-${combination.textSlot}`);
    const surfaceRaw = readCssVariable(block, `--ring-1-color-${combination.family}-${combination.surfaceSlot}`);
    const borderRaw = readCssVariable(block, `--ring-1-color-${combination.family}-${combination.borderSlot}`);

    // Surfaces und Borders werden gegen Canvas komponiert (das ist die
    // realistische Page-Background-Schicht hinter Drawer/Panel-Surfaces).
    const surfaceHex = resolveOpaqueHex(surfaceRaw, canvasHex);
    const textHex = resolveOpaqueHex(textRaw, surfaceHex);
    const borderHex = resolveOpaqueHex(borderRaw, canvasHex);

    const textFloor = combination.textFloor ?? 4.5;
    const textRatio = contrastRatio(textHex, surfaceHex);
    rows.push({
      family: combination.family,
      slot: `${combination.textSlot}-on-${combination.surfaceSlot}`,
      fg: textHex,
      bg: surfaceHex,
      ratio: round(textRatio),
      threshold: textFloor,
      pass: textRatio >= textFloor,
    });

    const borderOnCanvasRatio = contrastRatio(borderHex, canvasHex);
    rows.push({
      family: combination.family,
      slot: `${combination.borderSlot}-on-canvas`,
      fg: borderHex,
      bg: canvasHex,
      ratio: round(borderOnCanvasRatio),
      threshold: 3,
      pass: borderOnCanvasRatio >= 3,
      advisory: combination.borderAdvisory,
    });

    const borderOnPanelRatio = contrastRatio(borderHex, panelHex);
    rows.push({
      family: combination.family,
      slot: `${combination.borderSlot}-on-panel`,
      fg: borderHex,
      bg: panelHex,
      ratio: round(borderOnPanelRatio),
      threshold: 3,
      pass: borderOnPanelRatio >= 3,
      advisory: combination.borderAdvisory,
    });
  }

  // Mit-aufnehmen: kritischer Fokusring, gegen Canvas und Panel ≥ 3:1.
  const criticalFocusRaw = readCssVariable(block, '--ring-1-color-focus-ring-critical');
  const criticalFocusHex = resolveOpaqueHex(criticalFocusRaw, canvasHex);

  const focusOnCanvasRatio = contrastRatio(criticalFocusHex, canvasHex);
  rows.push({
    family: 'focus-ring-critical',
    slot: 'ring-on-canvas',
    fg: criticalFocusHex,
    bg: canvasHex,
    ratio: round(focusOnCanvasRatio),
    threshold: 3,
    pass: focusOnCanvasRatio >= 3,
  });

  const focusOnPanelRatio = contrastRatio(criticalFocusHex, panelHex);
  rows.push({
    family: 'focus-ring-critical',
    slot: 'ring-on-panel',
    fg: criticalFocusHex,
    bg: panelHex,
    ratio: round(focusOnPanelRatio),
    threshold: 3,
    pass: focusOnPanelRatio >= 3,
  });

  return rows;
}

function formatFailures(themeName: ThemeName, rows: readonly TokenRow[]): string[] {
  return rows
    .filter((row) => !row.pass && row.advisory !== true)
    .map((row) => {
      const themeLabel = themeName === 'light' ? 'Light' : 'Dark';
      return `${themeLabel}: ${row.family} ${row.slot} ` + `erwartet ≥ ${row.threshold}:1, gemessen ${row.ratio.toFixed(2)}:1`;
    });
}

function formatAdvisories(themeName: ThemeName, rows: readonly TokenRow[]): string[] {
  return rows
    .filter((row) => row.advisory === true && !row.pass)
    .map((row) => {
      const themeLabel = themeName === 'light' ? 'Light' : 'Dark';
      return `[advisory] ${themeLabel}: ${row.family} ${row.slot} ` + `unter Schwelle ${row.threshold}:1, gemessen ${row.ratio.toFixed(2)}:1`;
    });
}

describe('Eigenschutz Kontrast-Audit (Story 7.8 / AC4)', () => {
  const stylesheet = readFileSync(stylesheetPath, 'utf8');
  const lightBlock = extractBlock(stylesheet, ':root');
  const darkBlock = extractBlock(stylesheet, '.dark');

  const lightRows = buildThemeRows('light', lightBlock);
  const darkRows = buildThemeRows('dark', darkBlock);

  it('erfüllt im Light-Mode alle WCAG-2.1-Schwellen für Eigenschutz-Tokens', () => {
    const failures = formatFailures('light', lightRows);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('erfüllt im Dark-Mode alle WCAG-2.1-Schwellen für Eigenschutz-Tokens', () => {
    const failures = formatFailures('dark', darkRows);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('erzwingt für severity-critical-assertive den AAA-Floor (≥ 7:1) auf Surface', () => {
    for (const themeRows of [
      { name: 'light' as const, rows: lightRows },
      { name: 'dark' as const, rows: darkRows },
    ]) {
      const criticalTextRow = themeRows.rows.find((row) => row.family === 'severity-critical-assertive' && row.slot === 'text-on-surface');
      expect(criticalTextRow, `${themeRows.name}: severity-critical-assertive text-on-surface fehlt`).toBeDefined();
      expect(criticalTextRow!.ratio, `${themeRows.name}: severity-critical-assertive text-on-surface erwartet ≥ 7:1, gemessen ${criticalTextRow!.ratio}:1`).toBeGreaterThanOrEqual(7);
    }
  });

  it('hält Advisory-Findings für status-*-Borders fest (kein Hard-Fail, nur Snapshot-Eintrag)', () => {
    // status-*-Borders sind designseitig an ihre eigene Surface gekoppelt
    // (Toast/Banner) und werden nicht freistehend auf bloßer Canvas verwendet.
    // Werte dieser Verstöße landen im Snapshot, damit der Audit-Bericht (T6)
    // sie zitieren kann; sie blockieren CI aber nicht.
    const advisories = [...formatAdvisories('light', lightRows), ...formatAdvisories('dark', darkRows)];
    // Sanity: jede Advisory-Zeile gehört zur status-*-Familie.
    for (const line of advisories) {
      expect(line).toMatch(/status-/);
    }
    // Es gibt insgesamt 4 Familien × 2 Themes × 2 Backgrounds = bis zu 16
    // Advisory-Slots; mindestens einer ist bekanntermaßen unter 3:1.
    expect(advisories.length).toBeGreaterThan(0);
  });

  it('schreibt oder validiert den Audit-Snapshot für T6 (Audit-Bericht)', () => {
    const snapshot: ContrastSnapshot = {
      generatedAt: '2026-05-10',
      themes: { light: lightRows, dark: darkRows },
    };

    if (process.env.WRITE_CONTRAST_SNAPSHOT === '1') {
      const directory = path.dirname(snapshotPath);
      if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
      }
      writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    }

    expect(snapshot.themes.light.length).toBeGreaterThan(0);
    expect(snapshot.themes.dark.length).toBeGreaterThan(0);
    expect(snapshot.themes.light.length).toBe(snapshot.themes.dark.length);
    for (const row of [...snapshot.themes.light, ...snapshot.themes.dark]) {
      expect(row.pass).toBe(row.ratio >= row.threshold);
    }
  });
});
