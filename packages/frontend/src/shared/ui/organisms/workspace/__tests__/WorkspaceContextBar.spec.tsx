import { render, screen, within } from '@testing-library/react';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceContextBar } from '../WorkspaceContextBar';

vi.mock('@tanstack/react-router', () => ({
  Link: forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }>(({ children, to, ...props }, ref) => (
    <a ref={ref} href={to} {...props}>
      {children}
    </a>
  )),
}));

describe('WorkspaceContextBar', () => {
  it('rendert Titel, Untertitel und Back-Aktion als semantischen Link ohne verschachtelten Button', () => {
    const { container } = render(
      <WorkspaceContextBar
        title="Einsatz 12-34 | Wohnhausbrand"
        subtitle="B 4 • Musterstraße 7"
        backAction={{
          href: '/app/einsaetze',
          label: 'Übersicht',
        }}
        endSlot={<button type="button">Kontextaktion</button>}
      />,
    );

    const banner = screen.getByRole('banner');
    const backLink = screen.getByRole('link', { name: /Übersicht/i });

    expect(banner).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Einsatz 12-34 | Wohnhausbrand' })).toBeInTheDocument();
    expect(screen.getByText('B 4 • Musterstraße 7')).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Kontextaktion' })).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/app/einsaetze');
    expect(backLink.tagName).toBe('A');
    expect(within(backLink).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Übersicht/i })).not.toBeInTheDocument();
    expect(container.querySelector('a button')).toBeNull();
  });
});
