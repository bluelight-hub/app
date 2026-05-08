import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, type AmpelProjectionDto } from '@bluelight-hub/shared/client';
import { AmpelCard } from '../AmpelCard';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={to} data-params={JSON.stringify(params ?? {})} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

const baseProjection: AmpelProjectionDto = {
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-abc123456789',
  status: AmpelProjectionDtoStatusEnum.Gruen,
  aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis],
  offeneGefaehrdungenHoch: 0,
  ausstehendePsaQuittungen: 0,
  ausstehendeRegelQuittungen: 0,
  offeneVorfaelle: 0,
  ungeloesteRueckmeldungen: 0,
  letzteAenderungAm: new Date('2026-05-08T07:15:00.000Z'),
  letzteAenderungVonUserId: null,
};

function projection(overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return { ...baseProjection, ...overrides };
}

describe('AmpelCard', () => {
  it.each([
    [AmpelProjectionDtoStatusEnum.Gruen, 'Grün'],
    [AmpelProjectionDtoStatusEnum.Gelb, 'Gelb'],
    [AmpelProjectionDtoStatusEnum.Rot, 'Rot'],
  ])('rendert Status %s mit Text und Icon', (status, label) => {
    render(<AmpelCard projection={projection({ status })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId('ampel-status-icon')).toBeInTheDocument();
  });

  it('zeigt den aufgelösten Abschnittsnamen', () => {
    render(<AmpelCard projection={projection()} einheitName="Abschnitt Nord" />);

    expect(screen.getByRole('heading', { name: 'Abschnitt Nord' })).toBeInTheDocument();
  });

  it('fällt bei fehlendem Namen defensiv auf eine gekürzte einheitId zurück', () => {
    render(<AmpelCard projection={projection({ einheitId: 'clvabcdef1234567890xyz' })} />);

    expect(screen.getByRole('heading', { name: 'clvabc…0xyz' })).toBeInTheDocument();
  });

  it('rendert aktive PSA-Profile als nicht-interaktive Chips', () => {
    render(<AmpelCard projection={projection({ aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis, AmpelProjectionDtoAktivePsaProfileEnum.Infektion] })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('Basis')).toBeInTheDocument();
    expect(screen.getByText('Infektion')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('macht unbekannte PSA-Profile als Drift sichtbar', () => {
    render(<AmpelCard projection={projection({ aktivePsaProfile: ['NEUES_PROFIL'] as unknown as AmpelProjectionDto['aktivePsaProfile'] })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('Unbekanntes Profil')).toBeInTheDocument();
    expect(screen.getByLabelText('Unbekanntes PSA-Profil: NEUES_PROFIL')).toBeInTheDocument();
  });

  it('zeigt einen leeren PSA-Profil-Zustand', () => {
    render(<AmpelCard projection={projection({ aktivePsaProfile: [] })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('Kein aktives Profil')).toBeInTheDocument();
  });

  it('behandelt gedriftete PSA-Arrays defensiv als leer', () => {
    render(<AmpelCard projection={projection({ aktivePsaProfile: null as unknown as AmpelProjectionDto['aktivePsaProfile'] })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('Kein aktives Profil')).toBeInTheDocument();
  });

  it('summiert offene PSA- und Regel-Quittungen', () => {
    render(<AmpelCard projection={projection({ ausstehendePsaQuittungen: 2, ausstehendeRegelQuittungen: 1 })} einheitName="Abschnitt Nord" />);

    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveTextContent('3 ausstehend');
  });

  it('normalisiert ungültige Zähler, ohne NaN zu rendern', () => {
    render(<AmpelCard projection={projection({ ausstehendePsaQuittungen: Number.NaN, ausstehendeRegelQuittungen: -2 })} einheitName="Abschnitt Nord" />);

    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveTextContent('Quittiert');
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it('zeigt Vorfälle und Rückmeldungen nur bei positiven Zählern', () => {
    render(<AmpelCard projection={projection({ offeneVorfaelle: 2, ungeloesteRueckmeldungen: 1 })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('offene Vorfälle')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('ungelöste Rückmeldung')).toBeInTheDocument();
  });

  it('zeigt den Singular für einen offenen Vorfall korrekt', () => {
    render(<AmpelCard projection={projection({ offeneVorfaelle: 1 })} einheitName="Abschnitt Nord" />);

    expect(screen.getByText('offener Vorfall')).toBeInTheDocument();
  });

  it('formatiert die letzte Änderung als Zeit mit ISO-dateTime', () => {
    render(<AmpelCard projection={projection()} einheitName="Abschnitt Nord" />);

    const time = screen.getByTestId('ampel-card-updated-at');
    expect(time).toHaveAttribute('dateTime', '2026-05-08T07:15:00.000Z');
    expect(time).toHaveTextContent(/\d{2}:\d{2}/);
  });

  it('zeigt ungültige Zeitstempel als unbekannt statt als 1970', () => {
    render(<AmpelCard projection={projection({ letzteAenderungAm: 'kein-datum' as unknown as Date })} einheitName="Abschnitt Nord" />);

    const time = screen.getByTestId('ampel-card-updated-at');
    expect(time).toHaveTextContent('unbekannt');
    expect(time).not.toHaveAttribute('dateTime');
  });

  it('verlinkt die Primäraktion auf die bestehende PSA-Profile-Seite', () => {
    render(<AmpelCard projection={projection()} einheitName="Abschnitt Nord" />);

    const link = screen.getByRole('link', { name: 'PSA für Abschnitt Nord ändern' });
    expect(link).toHaveAttribute('href', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile');
    expect(link).toHaveAttribute('data-params', JSON.stringify({ einsatzId: 'einsatz-1' }));
  });

  it('enthält echte Container-Query-Varianten für schmale Cards', () => {
    render(<AmpelCard projection={projection()} einheitName="Abschnitt Nord" />);

    expect(screen.getByTestId('ampel-card-einheit-abc123456789').className).toContain('@sm:');
  });

  it('rendert keine tote Verlauf-Schaltfläche', () => {
    render(<AmpelCard projection={projection()} einheitName="Abschnitt Nord" />);

    expect(screen.queryByRole('button', { name: 'Verlauf' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Verlauf' })).toBeNull();
  });

  it('macht Status und Zähler für Screenreader zusammen erfassbar', () => {
    render(
      <AmpelCard projection={projection({ status: AmpelProjectionDtoStatusEnum.Rot, offeneVorfaelle: 2, ungeloesteRueckmeldungen: 1, ausstehendePsaQuittungen: 1 })} einheitName="Abschnitt Nord" />,
    );

    expect(screen.getByLabelText('Status Rot: 2 offene Vorfälle, 1 ungelöste Rückmeldung, 1 ausstehende Quittung')).toBeInTheDocument();
  });
});
