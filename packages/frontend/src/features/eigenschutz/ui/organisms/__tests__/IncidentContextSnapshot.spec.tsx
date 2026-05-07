/**
 * Spec für `IncidentContextSnapshot` (Story 5.2 AC12).
 *
 * Verifiziert: Header-Format, drei Kontextblöcke, EmptyState bei `{}` / Drift,
 * Klickpfad „Im Kontext zeigen" für Gefährdungsbeurteilung.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode } & Record<string, unknown>) => (
      <a data-mock-link data-to={to} data-params={JSON.stringify(params ?? {})} {...rest}>
        {children}
      </a>
    ),
  };
});

import { IncidentContextSnapshot } from '../IncidentContextSnapshot';

const VALID_SNAPSHOT = {
  schemaVersion: 1 as const,
  snapshotAt: '2026-05-06T10:30:00.000+02:00',
  einsatzId: 'cl9einsatz12345678901234',
  einheitId: 'cl9einheit12345678901234a',
  gefaehrdungsbeurteilung: {
    versionId: 'cl9gbversion123456789012',
    version: 2,
    gueltigVon: '2026-05-01T08:00:00.000+02:00',
    items: [{ title: 'Glatteis im Eingangsbereich', risikoklasse: 'GELB' as const }],
  },
  aktivePsaProfile: [
    {
      id: 'cl9psa1234567890123456789',
      profil: 'BASIS' as const,
      gueltigVon: '2026-05-01T08:00:00.000+02:00',
      gueltigBis: null,
      begruendung: 'Routine',
      propagationGroupId: 'cl9pg12345678901234567890',
    },
  ],
  sicherheitsregeln: [
    {
      regelId: 'cl9regel1234567890123456a',
      versionId: 'cl9regelv12345678901234ab',
      version: 1,
      titel: 'Reflexweste tragen',
      inhalt: 'Bei Außeneinsätzen Pflicht.',
      einsatzweit: true,
      einheitIds: [],
      gueltigVon: '2026-05-01T08:00:00.000+02:00',
    },
  ],
};

describe('IncidentContextSnapshot (Story 5.2 AC12)', () => {
  it('rendert Header mit Vorfall-Zeitpunkt im DD.MM.YYYY-Format', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={VALID_SNAPSHOT} />);
    const header = screen.getByTestId('incident-snapshot-header');
    expect(header).toHaveTextContent('Stand zum Vorfall-Zeitpunkt');
    expect(header).toHaveTextContent('06.05.2026');
  });

  it('rendert Gefährdungsbeurteilungs-Block mit Items + Versions-Link', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={VALID_SNAPSHOT} />);
    const block = screen.getByTestId('incident-snapshot-gefaehrdungsbeurteilung');
    expect(block).toHaveTextContent('Glatteis im Eingangsbereich');
    expect(block).toHaveTextContent('Version 2');
    expect(screen.getByTestId('incident-snapshot-gefaehrdungsbeurteilung-link')).toBeInTheDocument();
  });

  it('rendert PSA-Profil-Block im Präteritum („PSA war: …")', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={VALID_SNAPSHOT} />);
    const block = screen.getByTestId('incident-snapshot-psa-profile');
    expect(block).toHaveTextContent('PSA war: BASIS');
  });

  it('rendert Sicherheitsregel-Block mit titel/inhalt + einsatzweit-Markierung', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={VALID_SNAPSHOT} />);
    const block = screen.getByTestId('incident-snapshot-sicherheitsregeln');
    expect(block).toHaveTextContent('Reflexweste tragen');
    expect(block).toHaveTextContent('einsatzweit');
    expect(block).toHaveTextContent('Bei Außeneinsätzen Pflicht.');
  });

  it('rendert EmptyState (Variante legacy) bei 5.1-Stub `{}`', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={{}} />);
    const empty = screen.getByTestId('incident-snapshot-unavailable');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute('data-variant', 'legacy');
    expect(empty).toHaveTextContent('vor Story 5.2 erfasst');
  });

  it('rendert EmptyState (Variante corrupt) bei korruptem Snapshot (Zod-Drift)', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={{ schemaVersion: 99 }} />);
    const empty = screen.getByTestId('incident-snapshot-unavailable');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute('data-variant', 'corrupt');
    expect(empty).toHaveTextContent('Datenfehler');
  });

  it('Container-Section trägt aria-readonly + aria-label mit Zeitangabe', () => {
    renderWithProviders(<IncidentContextSnapshot einsatzId="cl9einsatz12345678901234" rawSnapshot={VALID_SNAPSHOT} />);
    const section = screen.getByTestId('incident-context-snapshot');
    expect(section).toHaveAttribute('aria-readonly', 'true');
    expect(section.getAttribute('aria-label') ?? '').toContain('06.05.2026');
  });
});
