import { fireEvent, render, screen } from '@testing-library/react';
import { PiClipboard, PiHouse } from 'react-icons/pi';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleRail } from '../ModuleRail';

const navigateSpy = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateSpy,
}));

describe('ModuleRail', () => {
  const modules = [
    {
      id: 'übersicht',
      label: 'Übersicht',
      description: 'Einsatzübersicht und Status',
      routeTarget: '/app/einsatz/$einsatzId/übersicht',
      icon: PiHouse,
      color: 'blue' as const,
      priority: 10,
      visibility: { default: 'visible' as const },
      shortcut: { modifiers: ['alt'], key: '1' },
      subPages: [{ id: 'dashboard', label: 'Dashboard', href: '/app/einsatz/$einsatzId/übersicht', icon: PiHouse, visibility: { default: 'visible' as const } }],
    },
    {
      id: 'führung',
      label: 'Führung',
      description: 'Einsatzleitung und Dokumentation',
      routeTarget: '/app/einsatz/$einsatzId/führung',
      icon: PiClipboard,
      color: 'purple' as const,
      priority: 20,
      visibility: { default: 'visible' as const },
      shortcut: { modifiers: ['alt'], key: '2' },
      subPages: [{ id: 'etb', label: 'ETB', href: '/app/einsatz/$einsatzId/führung/etb', icon: PiClipboard, visibility: { default: 'visible' as const } }],
    },
    {
      id: 'planung',
      label: 'Planung',
      description: 'Noch nicht freigeschaltet',
      routeTarget: '/app/einsatz/$einsatzId/planung',
      icon: PiClipboard,
      color: 'purple' as const,
      priority: 30,
      visibility: { default: 'disabled' as const, reason: 'Kommt in Ring 2 später' },
      shortcut: { modifiers: ['alt'], key: '4' },
      subPages: [{ id: 'planung-dashboard', label: 'Planung Dashboard', href: '/app/einsatz/$einsatzId/planung', icon: PiClipboard, visibility: { default: 'visible' as const } }],
    },
  ];

  it('navigiert Alt-Shortcuts aus dem Workspace-Contract', () => {
    render(<ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />);

    fireEvent.keyDown(window, { key: '2', altKey: true });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/führung',
      params: { einsatzId: 'einsatz-42' },
    });

    const overviewLinks = screen.getAllByRole('link', { name: 'Übersicht' });
    const fuehrungLinks = screen.getAllByRole('link', { name: 'Führung' });

    expect(overviewLinks.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
    expect(fuehrungLinks.some((link) => link.getAttribute('aria-keyshortcuts') === 'Alt+2')).toBe(true);
  });

  it('ignoriert Modul-Hotkeys in editierbaren Feldern', () => {
    navigateSpy.mockClear();

    render(
      <>
        <input aria-label="Filter" />
        <ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />
      </>,
    );

    const input = screen.getByLabelText('Filter');
    input.focus();

    fireEvent.keyDown(input, { key: '2', altKey: true });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('ignoriert deaktivierte Module auch dann, wenn deren Shortcut gedrückt wird', () => {
    navigateSpy.mockClear();

    render(<ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />);

    fireEvent.keyDown(window, { key: '4', altKey: true });

    expect(screen.getAllByText('Planung')[0]?.closest('[aria-disabled="true"]')).not.toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('deaktiviert globale Modul-Hotkeys bei blockierenden Overlays', () => {
    navigateSpy.mockClear();

    render(
      <>
        <div role="dialog" aria-modal="true">
          Modulübersicht
        </div>
        <ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />
      </>,
    );

    fireEvent.keyDown(window, { key: '2', altKey: true });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('respektiert eine explizit blockierende Overlay-State-Übergabe', () => {
    navigateSpy.mockClear();

    render(<ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} blockingOverlay={{ isBlocking: true }} />);

    fireEvent.keyDown(window, { key: '2', altKey: true });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('ignoriert zusätzliche Modifier und contentEditable-Ziele', () => {
    navigateSpy.mockClear();

    render(
      <>
        <div aria-label="Editor" contentEditable />
        <ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />
      </>,
    );

    const editor = screen.getByLabelText('Editor');
    Object.defineProperty(editor, 'isContentEditable', {
      configurable: true,
      value: true,
    });

    fireEvent.keyDown(window, { key: '2', altKey: true, ctrlKey: true });
    fireEvent.keyDown(editor, { key: '2', altKey: true });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('matcht Alt-Shortcuts auch über event.code, wenn macOS mit Sonderzeichen liefert', () => {
    navigateSpy.mockClear();

    render(<ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />);

    fireEvent.keyDown(window, { key: '™', code: 'Digit2', altKey: true });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/führung',
      params: { einsatzId: 'einsatz-42' },
    });
  });

  it('rendert Shortcut-Hinweise aus dem Workspace-Contract sichtbar an den Modul-Triggern', () => {
    render(<ModuleRail modules={modules} activeModuleId="übersicht" routeParams={{ einsatzId: 'einsatz-42' }} />);

    expect(screen.getAllByTitle('Tastenkürzel: Alt+1').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Tastenkürzel: Alt+2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌥1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌥2').length).toBeGreaterThan(0);
  });
});
