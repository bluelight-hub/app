import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateFileRoute = vi.fn(() => (config: unknown) => config);
const mockRedirect = vi.fn((options: unknown) => ({ redirect: options }));

vi.mock('@/shared/ui/templates/SingleEinsatzLayout', () => ({
  // Der Guard-Test validiert nur beforeLoad; das Layout würde sonst unnötig
  // die komplette Einsatz-Shell samt Seiteneffekten importieren.
  SingleEinsatzLayout: () => null,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    createFileRoute: mockCreateFileRoute,
    redirect: mockRedirect,
  };
});

describe('Route /app/einsatz/$einsatzId Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lässt freigegebene Workspace-Ziele unverändert passieren', async () => {
    const { Route } = await import('../../$einsatzId');
    const beforeLoad = (Route as { beforeLoad: (args: { location: { pathname: string }; params: { einsatzId: string } }) => void }).beforeLoad;

    expect(() =>
      beforeLoad({
        location: { pathname: '/app/einsatz/einsatz-42/führung/etb' },
        params: { einsatzId: 'einsatz-42' },
      }),
    ).not.toThrow();
  });

  it('lässt die freigegebene Überblicks-Lagekarte als kanonisches Ziel passieren', async () => {
    const { Route } = await import('../../$einsatzId');
    const beforeLoad = (Route as { beforeLoad: (args: { location: { pathname: string }; params: { einsatzId: string } }) => void }).beforeLoad;

    expect(() =>
      beforeLoad({
        location: { pathname: '/app/einsatz/einsatz-42/übersicht/karte' },
        params: { einsatzId: 'einsatz-42' },
      }),
    ).not.toThrow();
  });

  it('leitet deaktivierte Workspace-Ziele auf den kanonischen Pfad zurück', async () => {
    const { Route } = await import('../../$einsatzId');
    const beforeLoad = (Route as { beforeLoad: (args: { location: { pathname: string }; params: { einsatzId: string } }) => void }).beforeLoad;
    let thrownValue: unknown;

    try {
      beforeLoad({
        location: { pathname: '/app/einsatz/einsatz-42/kommunikation/funk' },
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

  it('leitet unbekannte Workspace-Subpfade kontrolliert auf den kanonischen Pfad zurück', async () => {
    const { Route } = await import('../../$einsatzId');
    const beforeLoad = (Route as { beforeLoad: (args: { location: { pathname: string }; params: { einsatzId: string } }) => void }).beforeLoad;
    let thrownValue: unknown;

    try {
      beforeLoad({
        location: { pathname: '/app/einsatz/einsatz-42/führung/unbekannt' },
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

  it('leitet deaktivierte Überblicks-Unterseiten kontrolliert auf den kanonischen Pfad zurück', async () => {
    const { Route } = await import('../../$einsatzId');
    const beforeLoad = (Route as { beforeLoad: (args: { location: { pathname: string }; params: { einsatzId: string } }) => void }).beforeLoad;
    let thrownValue: unknown;

    try {
      beforeLoad({
        location: { pathname: '/app/einsatz/einsatz-42/übersicht/statistik' },
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
