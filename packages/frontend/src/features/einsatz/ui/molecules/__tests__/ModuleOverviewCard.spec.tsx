import { render, screen } from '@testing-library/react';
import { PiClipboard } from 'react-icons/pi';
import type { AnchorHTMLAttributes } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleOverviewCard } from '../ModuleOverviewCard';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, search: _search, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; params?: unknown; search?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) => (isOpen ? <div>{children}</div> : null),
}));

describe('ModuleOverviewCard', () => {
  it('nutzt routeTarget, shortcut und badgeHint aus dem Workspace-Contract', () => {
    render(
      <ModuleOverviewCard
        modules={[
          {
            id: 'führung',
            name: 'Führung',
            icon: PiClipboard,
            description: 'Einsatzleitung und Dokumentation',
            color: 'purple',
            visibility: { default: 'visible' },
            routeTarget: '/app/einsatz/$einsatzId/führung/protokoll',
            shortcut: { modifiers: ['alt'], key: '7' },
            badgeHint: { kind: 'status', label: 'Offene Hinweise', value: 3 },
            subPages: [{ name: 'ETB', href: '/app/einsatz/$einsatzId/führung/etb', icon: PiClipboard }],
          },
        ]}
        currentModuleId="führung"
        einsatzId="einsatz-42"
        open
        onClose={() => undefined}
      />,
    );

    const link = screen.getByRole('link', { name: /führung/i });

    expect(link).toHaveAttribute('href', '/app/einsatz/$einsatzId/führung/protokoll');
    expect(screen.getByText('⌥7')).toBeInTheDocument();
    expect(screen.getByText('Offene Hinweise: 3')).toBeInTheDocument();
  });

  it('öffnet keine zweite Navigation für versteckte oder deaktivierte Module', () => {
    render(
      <ModuleOverviewCard
        modules={[
          {
            id: 'führung',
            name: 'Führung',
            icon: PiClipboard,
            color: 'purple',
            visibility: { default: 'visible' },
            routeTarget: '/app/einsatz/$einsatzId/führung/protokoll',
            shortcut: { modifiers: ['alt'], key: '2' },
            subPages: [{ name: 'ETB', href: '/app/einsatz/$einsatzId/führung/etb', icon: PiClipboard }],
          },
          {
            id: 'planung',
            name: 'Planung',
            icon: PiClipboard,
            color: 'purple',
            visibility: { default: 'disabled', reason: 'Kommt später' },
            routeTarget: '/app/einsatz/$einsatzId/planung',
            shortcut: { modifiers: ['alt'], key: '4' },
            subPages: [{ name: 'Dashboard', href: '/app/einsatz/$einsatzId/planung', icon: PiClipboard }],
          },
          {
            id: 'intern',
            name: 'Intern',
            icon: PiClipboard,
            color: 'purple',
            visibility: { default: 'hidden' },
            routeTarget: '/app/einsatz/$einsatzId/intern',
            shortcut: { modifiers: ['alt'], key: '9' },
            subPages: [{ name: 'Intern', href: '/app/einsatz/$einsatzId/intern', icon: PiClipboard }],
          },
        ]}
        currentModuleId="führung"
        einsatzId="einsatz-42"
        open
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('link', { name: /führung/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /planung/i })).not.toBeInTheDocument();
    expect(screen.getByText('Planung').closest('[aria-disabled="true"]')).not.toBeNull();
    expect(screen.getByText('Kommt später')).toBeInTheDocument();
    expect(screen.queryByText('Intern')).not.toBeInTheDocument();
  });
});
