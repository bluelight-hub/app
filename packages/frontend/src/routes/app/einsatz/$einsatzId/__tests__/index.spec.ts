import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateFileRoute = vi.fn(() => (config: unknown) => config);
const mockRedirect = vi.fn((options: unknown) => ({ redirect: options }));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    createFileRoute: mockCreateFileRoute,
    redirect: mockRedirect,
  };
});

describe('Route /app/einsatz/$einsatzId/', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leitet den Index-Einstieg auf die kanonische Übersichtsroute im Workspace um', async () => {
    const { Route } = await import('../index');
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
        to: '/app/einsatz/$einsatzId/übersicht',
        params: { einsatzId: 'einsatz-42' },
      },
    });
  });
});
