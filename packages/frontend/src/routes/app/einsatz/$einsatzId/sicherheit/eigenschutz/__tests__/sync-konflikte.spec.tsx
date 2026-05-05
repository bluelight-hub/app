/**
 * Schema- und Komponenten-Tests für die Sync-Konflikte-Route (Story 3.10 AC9).
 *
 * Pattern: `alarmierung.spec.ts` (Z. 1–92) — `createFileRoute` wird so
 * gemockt, dass die exportierte `Route` ein einfaches Konfig-Objekt ist; die
 * `validateSearch`-Funktion und `component`-Property sind direkt prüfbar,
 * ohne einen echten Router zu mounten.
 */

import { render } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseParams = vi.fn(() => ({ einsatzId: 'einsatz-1' }));

const mockCreateFileRoute = vi.fn(() => (config: unknown) => ({
  ...(config as object),
  useParams: mockUseParams,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: mockCreateFileRoute,
    useParams: () => mockUseParams(),
  };
});

const syncConflictsPageMock = vi.fn((_props: unknown) => null);

vi.mock('@/features/eigenschutz/ui/pages/SyncConflictsPage', () => ({
  SyncConflictsPage: (props: unknown) => syncConflictsPageMock(props),
}));

type RouteShape = {
  validateSearch: (s: unknown) => unknown;
  component: () => ReactElement;
};

describe('Route /app/einsatz/$einsatzId/sicherheit/eigenschutz/sync-konflikte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1' });
  });

  describe('validateSearch (Zod-Schema)', () => {
    it('akzeptiert ein leeres Search-Objekt', async () => {
      const { Route } = await import('../sync-konflikte');
      const validate = (Route as unknown as RouteShape).validateSearch;
      // Das Schema ist `.optional()` — `undefined` wird zu `{}` normalisiert
      // (Story 3.10 F6: safeParse-Fallback).
      expect(validate(undefined)).toEqual({});
    });

    it('parst entityType + einheitId', async () => {
      const { Route } = await import('../sync-konflikte');
      const validate = (Route as unknown as RouteShape).validateSearch;
      const result = validate({ entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-7' });
      expect(result).toEqual({ entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-7' });
    });

    it('akzeptiert GEFAEHRDUNGSBEURTEILUNG_ITEM als entityType', async () => {
      const { Route } = await import('../sync-konflikte');
      const validate = (Route as unknown as RouteShape).validateSearch;
      const result = validate({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' }) as { entityType?: string } | undefined;
      expect(result?.entityType).toBe('GEFAEHRDUNGSBEURTEILUNG_ITEM');
    });

    it('Story 3.10 F6: kaputter Deep-Link (entityType=BOGUS) wirft NICHT, fällt auf leeres Filter-Objekt zurück', async () => {
      const { Route } = await import('../sync-konflikte');
      const validate = (Route as unknown as RouteShape).validateSearch;
      // safeParse-Fallback: ungültige Search-Params dürfen die Route nicht
      // sprengen. Die Komponente rendert die Liste mit leerem Filter.
      expect(() => validate({ entityType: 'BOGUS' })).not.toThrow();
      expect(validate({ entityType: 'BOGUS' })).toEqual({});
    });

    it('Story 3.10 F6: andere kaputte Search-Param-Typen fallen ebenfalls auf {} zurück', async () => {
      const { Route } = await import('../sync-konflikte');
      const validate = (Route as unknown as RouteShape).validateSearch;
      // einheitId muss ein String sein — eine Zahl ist ungültig.
      expect(() => validate({ einheitId: 42 })).not.toThrow();
      expect(validate({ einheitId: 42 })).toEqual({});
    });
  });

  describe('SyncConflictsRouteComponent', () => {
    it('rendert SyncConflictsPage mit der einsatzId aus Route.useParams', async () => {
      mockUseParams.mockReturnValue({ einsatzId: 'einsatz-42' });

      const { Route } = await import('../sync-konflikte');
      const Component = (Route as unknown as RouteShape).component;

      render(createElement(Component));

      expect(syncConflictsPageMock).toHaveBeenCalledTimes(1);
      const props = syncConflictsPageMock.mock.calls[0]?.[0] as { einsatzId: string };
      expect(props.einsatzId).toBe('einsatz-42');
    });
  });
});
