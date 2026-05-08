import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AmpelProjectionDtoStatusEnum } from '@bluelight-hub/shared/client';
import { QuittungsSummary, StatusIndicator, buildAmpelStatusAriaLabel, getAmpelStatusMeta } from '../StatusIndicator';

describe('StatusIndicator', () => {
  it.each([
    [AmpelProjectionDtoStatusEnum.Rot, 'Rot'],
    [AmpelProjectionDtoStatusEnum.Gelb, 'Gelb'],
    [AmpelProjectionDtoStatusEnum.Gruen, 'Grün'],
  ])('mappt %s auf Icon und Text %s', (status, label) => {
    render(<StatusIndicator status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId('ampel-status-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('liefert einen vollständigen ARIA-Text mit relevanten Zählern', () => {
    const label = buildAmpelStatusAriaLabel({
      status: AmpelProjectionDtoStatusEnum.Rot,
      offeneVorfaelle: 2,
      ungeloesteRueckmeldungen: 1,
      ausstehendeQuittungen: 3,
    });

    expect(label).toBe('Status Rot: 2 offene Vorfälle, 1 ungelöste Rückmeldung, 3 ausstehende Quittungen');
  });

  it('setzt für Rot eine starke Danger-Prominenz', () => {
    const meta = getAmpelStatusMeta(AmpelProjectionDtoStatusEnum.Rot);

    expect(meta.rootClassName).toContain('border-status-danger-border');
    expect(meta.iconClassName).toContain('text-status-danger-text');
    expect(meta.rootClassName).toContain('ring-1');
  });

  it('zeigt bei unbekanntem Status einen eindeutigen Fallback', () => {
    render(<StatusIndicator status={'UNBEKANNT'} />);

    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    expect(screen.getByLabelText('Status Unbekannt')).toBeInTheDocument();
  });

  it('summiert PSA- und Regel-Quittungen lesbar', () => {
    render(<QuittungsSummary ausstehendePsaQuittungen={2} ausstehendeRegelQuittungen={1} />);

    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveTextContent('3 ausstehend');
    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveAttribute('aria-label', '3 ausstehende Quittungen: 2 PSA, 1 Sicherheitsregel');
  });

  it('zeigt einen ruhigen Erledigt-Zustand ohne offene Quittungen', () => {
    render(<QuittungsSummary ausstehendePsaQuittungen={0} ausstehendeRegelQuittungen={0} />);

    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveTextContent('Quittiert');
    expect(screen.getByTestId('ampel-quittungs-summary')).toHaveAttribute('aria-label', 'Keine ausstehenden Quittungen');
  });
});
