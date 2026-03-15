import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDirectory, '../../..');

describe('Ring-1 Theme Bootstrap', () => {
  it('loads the central font bootstrap in main.tsx', () => {
    const mainFile = readFileSync(path.resolve(frontendRoot, 'main.tsx'), 'utf8');

    expect(mainFile.match(/@fontsource-variable\/inter\/index\.css/g)).toHaveLength(1);
    expect(mainFile).not.toContain('@fontsource-variable/nunito/index.css');
  });

  it('keeps class-based next-themes configuration in the central color-mode provider', () => {
    const providerFile = readFileSync(path.resolve(frontendRoot, 'provider/color-mode.provider.tsx'), 'utf8');

    expect(providerFile).toContain('attribute="class"');
    expect(providerFile).toContain('defaultTheme="system"');
    expect(providerFile).toContain('storageKey="theme"');
    expect(providerFile).toContain('disableTransitionOnChange');
  });
});
