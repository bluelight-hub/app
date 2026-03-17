import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateFileRoute = vi.fn(() => (config: unknown) => config);
const mockRedirect = vi.fn((options: unknown) => ({ redirect: options }));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: mockCreateFileRoute,
  redirect: mockRedirect,
}));

vi.mock('@/features/einsatz/ui/organisms/EinsatzDetailView', () => ({
  EinsatzDetailView: () => null,
}));

describe('Route /app/einsaetze/$einsatzId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leitet den Legacy-Detailpfad auf den kanonischen Workspace-Pfad um', async () => {
    const { Route } = await import('../$einsatzId');
    let thrownValue: unknown;

    try {
      (Route as { beforeLoad: ({ params }: { params: { einsatzId: string } }) => void }).beforeLoad({
        params: { einsatzId: 'einsatz-42' },
      });
    } catch (error) {
      thrownValue = error;
    }

    expect(thrownValue).toEqual({
      redirect: {
        to: '/app/einsatz/$einsatzId',
        params: { einsatzId: 'einsatz-42' },
      },
    });
  });
});
