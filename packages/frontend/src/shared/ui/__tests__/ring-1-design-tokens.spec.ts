import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const stylesheetPath = path.resolve(currentDirectory, '../../../index.tailwind.css');

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
});
