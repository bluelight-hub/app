import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, type AmpelProjectionDto } from '@bluelight-hub/shared/client';
import { AmpelDashboardRow } from '../AmpelDashboardRow';

function projection(overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return {
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    status: AmpelProjectionDtoStatusEnum.Gelb,
    aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis],
    offeneGefaehrdungenHoch: 0,
    ausstehendePsaQuittungen: 2,
    ausstehendeRegelQuittungen: 1,
    offeneVorfaelle: 1,
    ungeloesteRueckmeldungen: 3,
    letzteAenderungAm: '2026-05-08T07:15:00.000Z' as unknown as Date,
    letzteAenderungVonUserId: null,
    ...overrides,
  };
}

describe('AmpelDashboardRow', () => {
  it('rendert Status mit Icon, Text und kompakten Kennzahlen', () => {
    render(<AmpelDashboardRow projection={projection()} einheitName="Abschnitt Nord" selected={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('option', { name: /Abschnitt Nord/ })).toBeInTheDocument();
    expect(screen.getByText('Gelb')).toBeInTheDocument();
    expect(screen.getByTestId('ampel-status-icon')).toBeInTheDocument();
    expect(screen.getByText('1 Vorfall')).toBeInTheDocument();
    expect(screen.getByText('3 Rückmeldungen')).toBeInTheDocument();
    expect(screen.getByText('3 Quittungen')).toBeInTheDocument();
  });

  it('macht Auswahl semantisch sichtbar', () => {
    render(<AmpelDashboardRow projection={projection()} einheitName="Abschnitt Nord" selected={true} onSelect={vi.fn()} />);

    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('ruft onSelect per Klick, Enter und Space auf', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AmpelDashboardRow projection={projection()} einheitName="Abschnitt Nord" selected={false} onSelect={onSelect} />);

    const row = screen.getByRole('option');
    await user.click(row);
    row.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('fällt bei fehlendem Namen auf die gekürzte ID zurück', () => {
    render(<AmpelDashboardRow projection={projection({ einheitId: 'clvabcdef1234567890xyz' })} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('clvabc…0xyz')).toBeInTheDocument();
  });

  it('bleibt bei unbekanntem Status drift-sicher', () => {
    render(<AmpelDashboardRow projection={projection({ status: 'NEU' as AmpelProjectionDtoStatusEnum })} einheitName="Abschnitt Nord" selected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
  });

  it('hält die Zielhöhe im 44-56-px-Korridor', () => {
    render(<AmpelDashboardRow projection={projection()} einheitName="Abschnitt Nord" selected={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('option').className).toContain('min-h-11');
    expect(screen.getByRole('option').className).toContain('h-14');
    expect(screen.getByRole('option').className).toContain('overflow-hidden');
  });

  it('kürzt Worst-Case-Profil- und Kennzahltexte innerhalb der kompakten Row', () => {
    render(
      <AmpelDashboardRow
        projection={projection({
          aktivePsaProfile: [
            AmpelProjectionDtoAktivePsaProfileEnum.Basis,
            AmpelProjectionDtoAktivePsaProfileEnum.Infektion,
            AmpelProjectionDtoAktivePsaProfileEnum.Vu,
            AmpelProjectionDtoAktivePsaProfileEnum.CbrnPatient,
            AmpelProjectionDtoAktivePsaProfileEnum.Vollschutz,
          ],
          offeneVorfaelle: 12,
          ungeloesteRueckmeldungen: 7,
          ausstehendePsaQuittungen: 9,
          ausstehendeRegelQuittungen: 4,
        })}
        einheitName="Abschnitt mit sehr langem Namen"
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Basis, Infektion/).className).toContain('truncate');
    expect(screen.getByRole('option').className).toContain('overflow-hidden');
  });
});
