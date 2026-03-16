import { setTestViewport } from '@/test/viewport';
import { render, screen, within } from '@testing-library/react';
import { PiClipboard, PiHouse, PiWarning } from 'react-icons/pi';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceShell } from '../WorkspaceShell';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

describe('WorkspaceShell contract', () => {
  function renderWorkspaceShell() {
    return render(
      <WorkspaceShell
        contextBar={{
          title: 'Einsatz 12-34 | Wohnhausbrand',
          subtitle: 'B 4 • Musterstraße 7',
          backAction: {
            label: 'Übersicht',
            href: '/app/einsaetze',
          },
        }}
        modules={[
          {
            id: 'übersicht',
            label: 'Übersicht',
            description: 'Einsatzübersicht und Status',
            routeTarget: '/app/einsatz/$einsatzId/übersicht',
            icon: PiHouse,
            color: 'blue',
            priority: 10,
            visibility: { default: 'visible' },
            shortcut: { modifiers: ['alt'], key: '1' },
            subPages: [
              {
                id: 'dashboard',
                label: 'Dashboard',
                href: '/app/einsatz/$einsatzId/übersicht',
                icon: PiHouse,
                visibility: { default: 'visible' },
              },
            ],
          },
          {
            id: 'führung',
            label: 'Führung',
            description: 'Einsatzleitung und Dokumentation',
            routeTarget: '/app/einsatz/$einsatzId/führung/etb',
            icon: PiClipboard,
            color: 'purple',
            priority: 20,
            visibility: { default: 'visible' },
            shortcut: { modifiers: ['alt'], key: '2' },
            badgeHint: { kind: 'status', label: 'Unquittierte Befehle', value: 3 },
            subPages: [
              {
                id: 'etb',
                label: 'ETB',
                href: '/app/einsatz/$einsatzId/führung/etb',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
              {
                id: 'lagefilm',
                label: 'Lagefilm',
                href: '/app/einsatz/$einsatzId/führung/lagefilm',
                icon: PiClipboard,
                visibility: { default: 'disabled', reason: 'Wird mit Story 1.7 aktiviert' },
              },
            ],
          },
          {
            id: 'versteckt',
            label: 'Versteckt',
            description: 'Soll nicht sichtbar sein',
            routeTarget: '/app/einsatz/$einsatzId/versteckt',
            icon: PiClipboard,
            color: 'purple',
            priority: 30,
            visibility: { default: 'hidden' },
            shortcut: { modifiers: ['alt'], key: '9' },
            subPages: [
              {
                id: 'intern',
                label: 'Intern',
                href: '/app/einsatz/$einsatzId/versteckt',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
            ],
          },
          {
            id: 'planung',
            label: 'Planung',
            description: 'Noch nicht freigeschaltet',
            routeTarget: '/app/einsatz/$einsatzId/planung',
            icon: PiClipboard,
            color: 'purple',
            priority: 40,
            visibility: { default: 'disabled', reason: 'Kommt in Ring 2 später' },
            shortcut: { modifiers: ['alt'], key: '4' },
            subPages: [
              {
                id: 'planung-dashboard',
                label: 'Planung Dashboard',
                href: '/app/einsatz/$einsatzId/planung',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
            ],
          },
        ]}
        activeModuleId="führung"
        activePageHref="/app/einsatz/$einsatzId/führung/etb"
        commandTriggerLabel="Befehle und Navigation"
        moduleOverviewLabel="Modulübersicht öffnen"
        onCommandTriggerClick={vi.fn()}
        onOpenModuleOverview={vi.fn()}
        overlaySlot={<div data-testid="overlay-slot">Overlay Slot</div>}
      >
        <div>Arbeitsbereich</div>
      </WorkspaceShell>,
    );
  }

  it('verbindet ContextBar, ModuleRail, stabile Seitennavigation und Overlay-Zugang über zugängliche Workspace-Primitives', () => {
    renderWorkspaceShell();

    const desktopNavigation = screen.getByRole('navigation', { name: 'Modulseiten' });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Workspace-Module' })).toBeInTheDocument();
    expect(desktopNavigation).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Modulseiten mobil' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Workspace-Hilfe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Workspace-Status' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modulübersicht öffnen' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Befehle und Navigation' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Führung').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lagefilm')[0]?.closest('[aria-disabled="true"]')).not.toBeNull();
    expect(screen.getByText('Wird mit Story 1.7 aktiviert')).toBeInTheDocument();
    expect(screen.getAllByText('Planung')[0]?.closest('[aria-disabled="true"]')).not.toBeNull();
    expect(screen.queryByText('Versteckt')).not.toBeInTheDocument();
    expect(screen.getByTestId('overlay-slot')).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Übersicht' })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Führung' })).toBeInTheDocument();
    expect(within(desktopNavigation).queryByText('Dashboard')).not.toBeInTheDocument();
    expect(within(desktopNavigation).getByText('ETB')).toBeInTheDocument();
    expect(within(desktopNavigation).queryByText('Planung Dashboard')).not.toBeInTheDocument();

    const moduleLinks = within(screen.getByRole('navigation', { name: 'Workspace-Module' })).getAllByRole('link');
    const pageLinks = within(desktopNavigation).getAllByRole('link');

    expect(moduleLinks.some((link) => link.getAttribute('aria-current') === 'page' && link.getAttribute('aria-keyshortcuts') === 'Alt+2')).toBe(true);
    expect(pageLinks.some((link) => link.getAttribute('aria-current') === 'page' && link.textContent?.includes('ETB'))).toBe(true);
  });

  it('stellt zentrale responsive Review-Buckets über den Test-Viewport reproduzierbar bereit', () => {
    setTestViewport({ width: 390 });

    render(
      <WorkspaceShell
        contextBar={{
          title: 'Einsatz 12-34 | Wohnhausbrand',
          subtitle: 'B 4 • Musterstraße 7',
          backAction: {
            label: 'Übersicht',
            href: '/app/einsaetze',
          },
        }}
        modules={[
          {
            id: 'übersicht',
            label: 'Übersicht',
            description: 'Einsatzübersicht und Status',
            routeTarget: '/app/einsatz/$einsatzId/übersicht',
            icon: PiHouse,
            color: 'blue',
            priority: 10,
            visibility: { default: 'visible' },
            shortcut: { modifiers: ['alt'], key: '1' },
            subPages: [
              {
                id: 'dashboard',
                label: 'Dashboard',
                href: '/app/einsatz/$einsatzId/übersicht',
                icon: PiHouse,
                visibility: { default: 'visible' },
              },
            ],
          },
          {
            id: 'führung',
            label: 'Führung',
            description: 'Einsatzleitung und Dokumentation',
            routeTarget: '/app/einsatz/$einsatzId/führung/etb',
            icon: PiClipboard,
            color: 'purple',
            priority: 20,
            visibility: { default: 'visible' },
            shortcut: { modifiers: ['alt'], key: '2' },
            badgeHint: { kind: 'status', label: 'Unquittierte Befehle', value: 3 },
            subPages: [
              {
                id: 'etb',
                label: 'ETB',
                href: '/app/einsatz/$einsatzId/führung/etb',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
              {
                id: 'lagefilm',
                label: 'Lagefilm',
                href: '/app/einsatz/$einsatzId/führung/lagefilm',
                icon: PiClipboard,
                visibility: { default: 'disabled', reason: 'Wird mit Story 1.7 aktiviert' },
              },
            ],
          },
          {
            id: 'versteckt',
            label: 'Versteckt',
            description: 'Soll nicht sichtbar sein',
            routeTarget: '/app/einsatz/$einsatzId/versteckt',
            icon: PiClipboard,
            color: 'purple',
            priority: 30,
            visibility: { default: 'hidden' },
            shortcut: { modifiers: ['alt'], key: '9' },
            subPages: [
              {
                id: 'intern',
                label: 'Intern',
                href: '/app/einsatz/$einsatzId/versteckt',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
            ],
          },
          {
            id: 'planung',
            label: 'Planung',
            description: 'Noch nicht freigeschaltet',
            routeTarget: '/app/einsatz/$einsatzId/planung',
            icon: PiClipboard,
            color: 'purple',
            priority: 40,
            visibility: { default: 'disabled', reason: 'Kommt in Ring 2 später' },
            shortcut: { modifiers: ['alt'], key: '4' },
            subPages: [
              {
                id: 'planung-dashboard',
                label: 'Planung Dashboard',
                href: '/app/einsatz/$einsatzId/planung',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
            ],
          },
        ]}
        activeModuleId="führung"
        activePageHref="/app/einsatz/$einsatzId/führung/etb"
        statusItems={[
          {
            id: 'status-lage',
            label: 'Lage stabil',
            tone: 'info',
            description: 'Keine neuen Rückmeldungen',
            icon: PiWarning,
          },
        ]}
        commandTriggerLabel="Befehle und Navigation"
        moduleOverviewLabel="Modulübersicht öffnen"
        onCommandTriggerClick={vi.fn()}
        onOpenModuleOverview={vi.fn()}
        sidebarFooter={
          <button type="button" className="w-full rounded-control border px-3 py-2 text-left">
            Audio-Einstellungen
          </button>
        }
      >
        <div>Arbeitsbereich</div>
      </WorkspaceShell>,
    );

    expect(window.matchMedia('(max-width: 639px)').matches).toBe(true);
    expect(window.matchMedia('(min-width: 640px)').matches).toBe(false);
    expect(window.matchMedia('(min-width: 1024px)').matches).toBe(false);
    expect(screen.getByRole('navigation', { name: 'Modulseiten mobil' })).toBeInTheDocument();

    const helperArea = screen.getByRole('complementary', { name: 'Workspace-Hilfe' });

    expect(helperArea).toBeInTheDocument();
    expect(within(helperArea).getByRole('button', { name: 'Befehle und Navigation' })).toBeInTheDocument();
    expect(within(helperArea).getByRole('button', { name: 'Modulübersicht öffnen' })).toBeInTheDocument();
    expect(within(helperArea).getByRole('region', { name: 'Workspace-Status' })).toBeInTheDocument();
    expect(within(helperArea).getByText('Lage stabil')).toBeInTheDocument();
    expect(within(helperArea).getByRole('button', { name: 'Audio-Einstellungen' })).toBeInTheDocument();
  });

  it('nutzt routeTarget als primären Review-Anker statt blind die erste Unterseite', () => {
    render(
      <WorkspaceShell
        contextBar={{
          title: 'Einsatz 98-76 | Gefahrgut',
          subtitle: 'ABC 2 • Industriepark',
          backAction: {
            label: 'Übersicht',
            href: '/app/einsaetze',
          },
        }}
        modules={[
          {
            id: 'führung',
            label: 'Führung',
            description: 'Einsatzleitung und Dokumentation',
            routeTarget: '/app/einsatz/$einsatzId/führung/etb',
            icon: PiClipboard,
            color: 'purple',
            priority: 20,
            visibility: { default: 'visible' },
            shortcut: { modifiers: ['alt'], key: '2' },
            subPages: [
              {
                id: 'lagekarte',
                label: 'Lagekarte',
                href: '/app/einsatz/$einsatzId/führung/lagekarte',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
              {
                id: 'etb',
                label: 'ETB',
                href: '/app/einsatz/$einsatzId/führung/etb',
                icon: PiClipboard,
                visibility: { default: 'visible' },
              },
            ],
          },
        ]}
        activeModuleId="führung"
        routeParams={{ einsatzId: 'einsatz-98-76' }}
        statusItems={[]}
      >
        <div>Arbeitsbereich</div>
      </WorkspaceShell>,
    );

    const desktopNavigation = screen.getByRole('navigation', { name: 'Modulseiten' });
    const pageLinks = within(desktopNavigation).getAllByRole('link');
    const etbLink = pageLinks.find((link) => link.textContent?.includes('ETB'));
    const lagekarteLink = pageLinks.find((link) => link.textContent?.includes('Lagekarte'));

    expect(etbLink).toBeDefined();
    expect(lagekarteLink).toBeDefined();
    expect(etbLink).toHaveClass('bg-action-secondary');
    expect(etbLink).toHaveAttribute('aria-current', 'page');
    expect(lagekarteLink).not.toHaveClass('bg-action-secondary');
  });
});
