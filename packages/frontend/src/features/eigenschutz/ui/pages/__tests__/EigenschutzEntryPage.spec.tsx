/**
 * Spec für die `EigenschutzEntryPage`.
 *
 * Story 2.1 ergänzt einen Call-to-Action, der auf die Gefährdungsbeurteilungs-
 * Route verlinkt; das Rendering ist konditional (nur bei `einsatzId`).
 *
 * Story 3.10 AC9 ergänzt den „Konflikte"-Eintrag mit Count-Badge — der Count
 * stammt aus `useSyncConflicts`.
 */

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import type { SyncConflictListItemDto } from '@bluelight-hub/shared/client';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    syncConflicts: { data: [] as SyncConflictListItemDto[] },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    // `Link` ist zum Rendern ausreichend — wir brauchen keinen echten Router.
    Link: ({
      to,
      params,
      activeProps,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      activeProps?: Record<string, unknown>;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      void activeProps;
      return (
        <a href={to} data-params={JSON.stringify(params ?? {})} {...(rest as Record<string, unknown>)}>
          {children}
        </a>
      );
    },
  };
});

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useSyncConflicts: () => mocks.syncConflicts,
}));

import { EigenschutzEntryPage } from '../EigenschutzEntryPage';

beforeEach(() => {
  mocks.syncConflicts = { data: [] };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('EigenschutzEntryPage', () => {
  it('rendert Überschrift und Subtext', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Eigenschutz' })).toBeInTheDocument();
    expect(screen.getByText(/Arbeitsschutz und Sicherheitsmaßnahmen/)).toBeInTheDocument();
  });

  it('zeigt den Gefährdungsbeurteilungen-Link bei vorhandener einsatzId', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-42" />);

    const link = screen.getByTestId('eigenschutz-gefaehrdungen-link');
    expect(link).toHaveTextContent('Gefährdungsbeurteilungen verwalten');
  });

  it('blendet den Link ohne einsatzId aus', () => {
    renderWithProviders(<EigenschutzEntryPage />);

    expect(screen.queryByTestId('eigenschutz-gefaehrdungen-link')).toBeNull();
    expect(screen.queryByTestId('eigenschutz-sync-konflikte-link')).toBeNull();
  });

  it('rendert den Konflikte-Link bei vorhandener einsatzId', () => {
    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-42" />);

    const link = screen.getByTestId('eigenschutz-sync-konflikte-link');
    expect(link).toHaveTextContent('Konflikte');
    expect(link.getAttribute('href')).toBe('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sync-konflikte');
    expect(link.getAttribute('data-params')).toBe(JSON.stringify({ einsatzId: 'einsatz-42' }));
  });

  it('zeigt das Count-Badge, wenn offene Konflikte vorhanden sind', () => {
    mocks.syncConflicts = {
      data: [{ id: 'c-1' } as SyncConflictListItemDto, { id: 'c-2' } as SyncConflictListItemDto, { id: 'c-3' } as SyncConflictListItemDto],
    };

    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    const badge = screen.getByTestId('eigenschutz-sync-konflikte-badge');
    expect(badge).toHaveTextContent('3');
    expect(badge).toHaveAttribute('aria-label', '3 offene Konflikte');
  });

  it('blendet das Count-Badge aus, wenn keine Konflikte vorhanden sind', () => {
    mocks.syncConflicts = { data: [] };

    renderWithProviders(<EigenschutzEntryPage einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('eigenschutz-sync-konflikte-badge')).toBeNull();
  });
});
