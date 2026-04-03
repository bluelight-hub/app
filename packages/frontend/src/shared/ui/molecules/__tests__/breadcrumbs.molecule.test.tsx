import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mock für @tanstack/react-router: Link rendert einen <a>-Tag.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { Breadcrumbs } from '../breadcrumbs.molecule';

describe('Breadcrumbs', () => {
  it('rendert alle Items mit Separatoren', () => {
    render(<Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Kräfte', to: '/admin/kraefte' }, { label: 'Qualifikationen' }]} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Kräfte')).toBeInTheDocument();
    expect(screen.getByText('Qualifikationen')).toBeInTheDocument();
  });

  it('rendert letztes Item ohne Link', () => {
    render(<Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Qualifikationen' }]} />);
    const lastItem = screen.getByText('Qualifikationen');
    expect(lastItem.tagName).not.toBe('A');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
  });

  it('rendert vorherige Items als Links', () => {
    render(<Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Qualifikationen' }]} />);
    const link = screen.getByRole('link', { name: 'Admin' });
    expect(link).toBeInTheDocument();
  });

  it('rendert nav mit aria-label', () => {
    render(<Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Test' }]} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });
});
