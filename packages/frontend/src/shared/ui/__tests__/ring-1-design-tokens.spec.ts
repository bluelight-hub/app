import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const stylesheetPath = path.resolve(currentDirectory, '../../../index.tailwind.css');

const STORY_7_1_TOKEN_COMBINATIONS = [
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
] as const;

function extractBlock(stylesheet: string, selector: ':root' | '.dark'): string {
  const match = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(stylesheet);
  if (match === null) {
    throw new Error(`CSS block ${selector} not found`);
  }
  return match[1];
}

function readCssVariable(block: string, variableName: string): string {
  const match = new RegExp(`${variableName}:\\s*([^;]+);`).exec(block);
  if (match === null) {
    throw new Error(`CSS variable ${variableName} not found`);
  }
  return match[1].trim();
}

function hexToRgb(hexColor: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hexColor);
  if (match === null) {
    throw new Error(`Expected a 6-digit hex color, received ${hexColor}`);
  }

  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(hexToRgb(foreground));
  const backgroundLuminance = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('Ring-1 Design Tokens', () => {
  it('defines a semantic token contract for the Einstieg and Shell surfaces', () => {
    const stylesheet = readFileSync(stylesheetPath, 'utf8');

    expect(stylesheet).toContain('@theme inline');
    expect(stylesheet).toContain('--color-surface-canvas:');
    expect(stylesheet).toContain('--color-surface-panel:');
    expect(stylesheet).toContain('--color-surface-raised:');
    expect(stylesheet).toContain('--color-border-subtle:');
    expect(stylesheet).toContain('--color-border-strong:');
    expect(stylesheet).toContain('--color-text-primary:');
    expect(stylesheet).toContain('--color-text-secondary:');
    expect(stylesheet).toContain('--color-focus-ring:');
    expect(stylesheet).toContain('--color-action-primary:');
    expect(stylesheet).toContain('--color-status-danger-surface:');
    expect(stylesheet).toContain('--color-selection-surface:');
    expect(stylesheet).toContain('--ring-1-gradient-auth-ambient:');
    expect(stylesheet).toContain('--ring-1-shadow-alarm-glow-soft:');
    expect(stylesheet).toContain('--font-sans:');
    expect(stylesheet).toContain('--font-mono:');
    expect(stylesheet).toContain('--spacing-panel:');
    expect(stylesheet).toContain('--spacing-cluster:');
    expect(stylesheet).toContain('--radius-panel:');
    expect(stylesheet).toContain('--shadow-panel:');
  });

  it('removes the legacy background-image coupling from the global shell styles', () => {
    const stylesheet = readFileSync(stylesheetPath, 'utf8');

    expect(stylesheet).not.toContain('html.has-background-image');
    expect(stylesheet).not.toContain('login-background');
    expect(stylesheet).toContain('.ring-1-auth-ambient');
    expect(stylesheet).toContain('.ring-1-auth-top-glow');
  });

  it('defines Story 7.1 Eigenschutz token families with light and dark parity', () => {
    const stylesheet = readFileSync(stylesheetPath, 'utf8');
    const lightBlock = extractBlock(stylesheet, ':root');
    const darkBlock = extractBlock(stylesheet, '.dark');

    for (const combination of STORY_7_1_TOKEN_COMBINATIONS) {
      for (const slot of [combination.surfaceSlot, combination.borderSlot, combination.textSlot]) {
        const primitive = `--ring-1-color-${combination.family}-${slot}`;
        const alias = `--color-${combination.family}-${slot}: var(${primitive});`;

        expect(lightBlock).toContain(`${primitive}:`);
        expect(darkBlock).toContain(`${primitive}:`);
        expect(stylesheet).toContain(alias);
      }
    }

    expect(lightBlock).toContain('--ring-1-color-focus-ring-critical:');
    expect(darkBlock).toContain('--ring-1-color-focus-ring-critical:');
    expect(stylesheet).toContain('--color-focus-ring-critical: var(--ring-1-color-focus-ring-critical);');
    expect(stylesheet).toContain('--shadow-focus-ring-critical: var(--ring-1-shadow-focus-ring-critical);');
  });

  it('keeps Story 7.1 tokens above WCAG contrast thresholds on canvas and panel backgrounds', () => {
    const stylesheet = readFileSync(stylesheetPath, 'utf8');
    const themes = [
      { name: 'light', block: extractBlock(stylesheet, ':root') },
      { name: 'dark', block: extractBlock(stylesheet, '.dark') },
    ] as const;

    for (const theme of themes) {
      const canvas = readCssVariable(theme.block, '--ring-1-color-surface-canvas');
      const panel = readCssVariable(theme.block, '--ring-1-color-surface-panel');

      for (const combination of STORY_7_1_TOKEN_COMBINATIONS) {
        const text = readCssVariable(theme.block, `--ring-1-color-${combination.family}-${combination.textSlot}`);
        const surface = readCssVariable(theme.block, `--ring-1-color-${combination.family}-${combination.surfaceSlot}`);
        const border = readCssVariable(theme.block, `--ring-1-color-${combination.family}-${combination.borderSlot}`);
        const textFloor = combination.textFloor ?? 4.5;

        expect(contrastRatio(text, surface), `${theme.name} ${combination.family} ${combination.textSlot} on ${combination.surfaceSlot}`).toBeGreaterThanOrEqual(textFloor);
        expect(contrastRatio(border, canvas), `${theme.name} ${combination.family} ${combination.borderSlot} on canvas`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(border, panel), `${theme.name} ${combination.family} ${combination.borderSlot} on panel`).toBeGreaterThanOrEqual(3);
      }

      const criticalFocus = readCssVariable(theme.block, '--ring-1-color-focus-ring-critical');
      expect(contrastRatio(criticalFocus, canvas), `${theme.name} focus-ring-critical on canvas`).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(criticalFocus, panel), `${theme.name} focus-ring-critical on panel`).toBeGreaterThanOrEqual(3);
    }
  });
});
