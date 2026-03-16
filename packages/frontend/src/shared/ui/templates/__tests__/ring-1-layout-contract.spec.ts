import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const templatesDirectory = path.resolve(currentDirectory, '..');
const frontendSourceDirectory = path.resolve(currentDirectory, '../../../../');

describe('Ring-1 Layout Contract', () => {
  it('removes the legacy background-image scene from AuthLayout', () => {
    const authLayoutFile = readFileSync(path.resolve(templatesDirectory, 'AuthLayout.tsx'), 'utf8');

    expect(authLayoutFile).not.toContain('useTimeBasedBackground');
    expect(authLayoutFile).not.toContain('has-background-image');
    expect(authLayoutFile).toContain('bg-surface-canvas');
    expect(authLayoutFile).toContain('ring-1-auth-ambient');
    expect(authLayoutFile).toContain('ring-1-auth-top-glow');
  });

  it('applies the shared surface and text tokens to the SingleEinsatz shell chrome', () => {
    const singleEinsatzLayoutFile = readFileSync(path.resolve(templatesDirectory, 'SingleEinsatzLayout.tsx'), 'utf8');
    const workspaceShellFile = readFileSync(path.resolve(frontendSourceDirectory, 'features/workspace/ui/WorkspaceShell.tsx'), 'utf8');
    const moduleRailFile = readFileSync(path.resolve(frontendSourceDirectory, 'features/workspace/ui/ModuleRail.tsx'), 'utf8');
    const workspaceContextBarFile = readFileSync(path.resolve(frontendSourceDirectory, 'shared/ui/organisms/workspace/WorkspaceContextBar.tsx'), 'utf8');
    const statusRailFile = readFileSync(path.resolve(frontendSourceDirectory, 'shared/ui/organisms/workspace/StatusRail.tsx'), 'utf8');

    expect(singleEinsatzLayoutFile).toContain('WorkspaceShell');
    expect(workspaceShellFile).toContain('bg-surface-canvas');
    expect(workspaceShellFile).toContain('bg-surface-panel');
    expect(workspaceShellFile).toContain('border-border-subtle');
    expect(workspaceShellFile).toContain('text-text-primary');
    expect(workspaceContextBarFile).toContain('text-text-secondary');
    expect(moduleRailFile).toContain('bg-action-secondary');
    expect(moduleRailFile).toContain('aria-label="Workspace-Module"');
    expect(moduleRailFile).toContain('aria-label="Modulübersicht anzeigen"');
    expect(statusRailFile).toContain("title = 'Workspace-Status'");
    expect(statusRailFile).toContain('aria-label={title}');
    expect(workspaceShellFile).not.toContain('bg-gray-50 dark:bg-gray-900');
  });
});
