/**
 * Smoke-Spec für die `EigenschutzEntryPage`.
 *
 * Story 2.1 ergänzt einen Call-to-Action, der auf die Gefährdungsbeurteilungs-
 * Route verlinkt; das Rendering ist konditional (nur bei `einsatzId`), daher
 * zwei Test-Cases.
 */

import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    // `Link` ist zum Rendern ausreichend — wir brauchen keinen echten Router.
    Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={to} data-params={JSON.stringify(params ?? {})} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

import { EigenschutzEntryPage } from '../EigenschutzEntryPage';

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
  });
});
