/**
 * Schema-Validation Tests für die Alarmierung-Route.
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

vi.mock('@/features/alarmierung/ui/pages/AlarmierungPage', () => ({
  AlarmierungPage: () => null,
}));

describe('Route /app/einsatz/$einsatzId/kommunikation/alarmierung', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parsed tab=liste als Default', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({});
    expect(search.tab).toBe('liste');
  });

  it('akzeptiert tab=timeline', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'timeline' });
    expect(search.tab).toBe('timeline');
  });

  it('fällt bei ungültigem Tab auf Default zurück', async () => {
    const { Route } = await import('../alarmierung');
    const search = (Route as { validateSearch: (s: unknown) => { tab: string } }).validateSearch({ tab: 'kanalplan' });
    expect(search.tab).toBe('liste');
  });
});
