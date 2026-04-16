/**
 * Schema-Validation Tests für die Funk-Route.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateFileRoute = vi.fn(() => (config: unknown) => config);

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: mockCreateFileRoute,
    useNavigate: () => vi.fn(),
    useParams: () => ({ einsatzId: 'e1' }),
  };
});

vi.mock('@/features/funkverkehr/ui/pages/FunkverkehrPage', () => ({
  FunkverkehrPage: () => null,
}));

describe('Route /app/einsatz/$einsatzId/kommunikation/funk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parsed tab=kanalplan als Default', async () => {
    const { Route } = await import('../funk');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({});
    expect(search.tab).toBe('kanalplan');
  });

  it('akzeptiert tab=protokoll', async () => {
    const { Route } = await import('../funk');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'protokoll' });
    expect(search.tab).toBe('protokoll');
  });

  it('fällt bei ungültigem Tab auf Default zurück', async () => {
    const { Route } = await import('../funk');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'unknown' });
    expect(search.tab).toBe('kanalplan');
  });
});
