import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const templatesDirectory = path.resolve(currentDirectory, '..');

describe('Ring-1 Layout Contract', () => {
  it('removes the legacy background-image scene from AuthLayout', () => {
    const authLayoutFile = readFileSync(path.resolve(templatesDirectory, 'AuthLayout.tsx'), 'utf8');

    expect(authLayoutFile).not.toContain('useTimeBasedBackground');
    expect(authLayoutFile).not.toContain('has-background-image');
    expect(authLayoutFile).toContain('bg-surface-canvas');
    expect(authLayoutFile).toContain('bg-surface-panel');
  });

  it('applies the shared surface and text tokens to the SingleEinsatz shell chrome', () => {
    const singleEinsatzLayoutFile = readFileSync(path.resolve(templatesDirectory, 'SingleEinsatzLayout.tsx'), 'utf8');

    expect(singleEinsatzLayoutFile).toContain('bg-surface-canvas');
    expect(singleEinsatzLayoutFile).toContain('bg-surface-panel');
    expect(singleEinsatzLayoutFile).toContain('border-border-subtle');
    expect(singleEinsatzLayoutFile).toContain('text-text-primary');
    expect(singleEinsatzLayoutFile).toContain('text-text-secondary');
    expect(singleEinsatzLayoutFile).toContain('bg-action-secondary');
    expect(singleEinsatzLayoutFile).toContain('aria-label="Modulübersicht öffnen"');
    expect(singleEinsatzLayoutFile).toContain('aria-label="Modulübersicht anzeigen"');
    expect(singleEinsatzLayoutFile).not.toContain('bg-gray-50 dark:bg-gray-900');
  });
});
