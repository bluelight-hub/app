import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PiHouse, PiTruck, PiUsers } from 'react-icons/pi';
import { describe, expect, it, vi } from 'vitest';
import type { SidebarGroup } from '../sidebar.organism';

/**
 * Mock für @tanstack/react-router: Link rendert einen <a>-Tag,
 * useMatchRoute gibt immer false zurück.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useMatchRoute: () => () => false,
}));

/**
 * Mock für @headlessui/react Dialog-Komponenten.
 * Rendert den Dialog-Inhalt nur wenn open=true.
 */
vi.mock('@headlessui/react', () => ({
  Dialog: ({ children, open, onClose, className }: { children: ReactNode; open: boolean; onClose: () => void; className?: string }) =>
    open ? (
      <div data-testid="dialog" className={className} onClick={onClose}>
        {children}
      </div>
    ) : null,
  DialogBackdrop: ({ className }: { className?: string }) => <div data-testid="dialog-backdrop" className={className} />,
  DialogPanel: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="dialog-panel" className={className}>
      {children}
    </div>
  ),
}));

import { Sidebar, SidebarDrawer } from '../sidebar.organism';

const testItems: SidebarGroup[] = [
  {
    entries: [{ label: 'Dashboard', to: '/admin/dashboard', icon: PiHouse }],
  },
  {
    group: 'Stammdaten',
    entries: [
      { label: 'Personen', to: '/admin/stammdaten/personen', icon: PiUsers },
      { label: 'Fahrzeuge', to: '/admin/stammdaten/fahrzeuge', icon: PiTruck },
    ],
  },
];

describe('Sidebar', () => {
  it('rendert alle Navigationseinträge', () => {
    render(<Sidebar items={testItems} header={<span>Header</span>} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Personen')).toBeInTheDocument();
    expect(screen.getByText('Fahrzeuge')).toBeInTheDocument();
  });

  it('rendert Gruppenbeschriftungen', () => {
    render(<Sidebar items={testItems} header={<span>Header</span>} />);

    expect(screen.getByText('Stammdaten')).toBeInTheDocument();
  });

  it('rendert Header-Inhalt', () => {
    render(<Sidebar items={testItems} header={<span>Mein Header</span>} />);

    expect(screen.getByText('Mein Header')).toBeInTheDocument();
  });

  it('rendert Footer-Inhalt', () => {
    render(<Sidebar items={testItems} header={<span>Header</span>} footer={<span>Mein Footer</span>} />);

    expect(screen.getByText('Mein Footer')).toBeInTheDocument();
  });

  it('rendert Einträge als Links', () => {
    render(<Sidebar items={testItems} header={<span>Header</span>} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const personenLink = screen.getByText('Personen').closest('a');
    const fahrzeugeLink = screen.getByText('Fahrzeuge').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
    expect(personenLink).toHaveAttribute('href', '/admin/stammdaten/personen');
    expect(fahrzeugeLink).toHaveAttribute('href', '/admin/stammdaten/fahrzeuge');
  });
});

describe('SidebarDrawer', () => {
  it('zeigt Inhalt wenn geöffnet', () => {
    render(<SidebarDrawer items={testItems} header={<span>Header</span>} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Personen')).toBeInTheDocument();
    expect(screen.getByText('Fahrzeuge')).toBeInTheDocument();
  });

  it('versteckt Inhalt wenn geschlossen', () => {
    render(<SidebarDrawer items={testItems} header={<span>Header</span>} isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Personen')).not.toBeInTheDocument();
  });
});
