import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AmpelWarnBadgeDto } from '@bluelight-hub/shared/client';
import { AmpelWarnBadgeList, formatOverdueDuration } from '../AmpelWarnBadgeList';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, search, children, ...rest }: { to: string; params?: Record<string, string>; search?: Record<string, string>; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={to} data-params={JSON.stringify(params ?? {})} data-search={JSON.stringify(search ?? {})} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

const baseBadge = (overrides: Partial<AmpelWarnBadgeDto>): AmpelWarnBadgeDto => ({
  id: 'gefahr:gef-1:item-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME',
  label: 'Gefährdung ohne Schutzmaßnahme',
  sortRank: 10,
  occurredAt: new Date('2026-05-08T10:00:00.000Z'),
  gefaehrdungsbeurteilungId: 'gef-1',
  gefaehrdungItemId: 'item-1',
  gefaehrdungTitel: 'Austretender Kraftstoff',
  ...overrides,
});

describe('AmpelWarnBadgeList', () => {
  it('rendert Gefährdungs-Link mit focusItem', () => {
    render(<AmpelWarnBadgeList einsatzId="einsatz-1" einheitName="Abschnitt Nord" badges={[baseBadge({})]} />);

    const link = screen.getByRole('link', { name: /Gefährdung ohne Schutzmaßnahme/ });
    expect(link).toHaveAttribute('href', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id');
    expect(link).toHaveAttribute('data-params', JSON.stringify({ einsatzId: 'einsatz-1', id: 'gef-1' }));
    expect(link).toHaveAttribute('data-search', JSON.stringify({ focusItem: 'item-1' }));
  });

  it('rendert PSA-Link mit focusGroup und einheitId', () => {
    render(
      <AmpelWarnBadgeList
        einsatzId="einsatz-1"
        einheitName="Abschnitt Nord"
        badges={[baseBadge({ id: 'psa:group-1:einheit-1', type: 'PSA_QUITTUNG_UEBERFAELLIG', sortRank: 20, propagationGroupId: 'group-1', ueberfaelligSeitMin: 75 })]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Quittung überfällig (01:15)' });
    expect(link).toHaveAttribute('data-search', JSON.stringify({ focusGroup: 'group-1', einheitId: 'einheit-1' }));
  });

  it('behält in der Card-Variante das 44-px-Touch-Ziel bei', () => {
    render(<AmpelWarnBadgeList einsatzId="einsatz-1" einheitName="Abschnitt Nord" badges={[baseBadge({})]} variant="card" />);

    expect(screen.getByRole('link', { name: /Gefährdung ohne Schutzmaßnahme/ }).className).toContain('min-h-11');
  });

  it('fasst mehr als drei Badges als Overflow zusammen', () => {
    const badges = Array.from({ length: 5 }, (_, index) => baseBadge({ id: `gefahr:gef-${index}:item-${index}`, gefaehrdungsbeurteilungId: `gef-${index}`, gefaehrdungItemId: `item-${index}` }));

    render(<AmpelWarnBadgeList einsatzId="einsatz-1" einheitName="Abschnitt Nord" badges={badges} />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByLabelText('2 weitere Warnungen für Abschnitt Nord')).toHaveTextContent('+2 weitere');
  });

  it('formatiert Überfälligkeit defensiv', () => {
    expect(formatOverdueDuration(75)).toBe('01:15');
    expect(formatOverdueDuration(-1)).toBe('00:00');
    expect(formatOverdueDuration(Number.NaN)).toBe('00:00');
  });
});
