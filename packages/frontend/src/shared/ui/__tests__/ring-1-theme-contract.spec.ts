import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ringThemeContractPath = path.resolve(import.meta.dirname, '../../../index.tailwind.css');

describe('Ring-1 theme contract', async () => {
  const css = await readFile(ringThemeContractPath, 'utf8');

  it('defines the semantic token families in the global theme contract', () => {
    expect(css).toContain('@theme inline');
    expect(css).toContain('--font-sans:');
    expect(css).toContain('--font-mono:');
    expect(css).toContain('--color-surface-canvas:');
    expect(css).toContain('--color-surface-panel:');
    expect(css).toContain('--color-surface-elevated:');
    expect(css).toContain('--color-fg-primary:');
    expect(css).toContain('--color-fg-secondary:');
    expect(css).toContain('--color-border-subtle:');
    expect(css).toContain('--color-border-strong:');
    expect(css).toContain('--color-focus-ring:');
    expect(css).toContain('--color-selection-surface:');
    expect(css).toContain('--color-status-danger:');
    expect(css).toContain('--color-status-success:');
    expect(css).toContain('--spacing-density-1:');
    expect(css).toContain('--spacing-density-3:');
    expect(css).toContain('--radius-control:');
    expect(css).toContain('--radius-panel:');
    expect(css).toContain('--shadow-focus-ring:');
  });

  it('declares the light and dark theme values centrally', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain('--ring-1-gradient-auth-ambient:');
    expect(css).toContain('--ring-1-gradient-auth-top-glow:');
  });

  it('removes the legacy html background toggles from the token contract', () => {
    expect(css).not.toContain('has-background-image');
  });
});
