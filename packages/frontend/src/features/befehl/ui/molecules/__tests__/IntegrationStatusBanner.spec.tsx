import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationStatusBanner } from '../IntegrationStatusBanner.molecule';
import { updateIntegrationStatus, resetIntegrationStatus } from '../../../api/use-integration-status';

describe('IntegrationStatusBanner', () => {
  beforeEach(() => {
    resetIntegrationStatus();
  });

  it('rendert nichts wenn alle Integrationen CLOSED sind', () => {
    const { container } = render(<IntegrationStatusBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert nichts bei leerem Store', () => {
    const { container } = render(<IntegrationStatusBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('zeigt Banner bei OPEN Integration', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'hiorg-server',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    render(<IntegrationStatusBanner />);

    expect(screen.getByText('Eingeschraenkte Verfuegbarkeit')).toBeInTheDocument();
    expect(screen.getByText(/HiOrg-Server \(Stammdaten\)/)).toBeInTheDocument();
    expect(screen.getByText(/temporaer nicht verfuegbar/)).toBeInTheDocument();
  });

  it('zeigt Banner bei HALF_OPEN Integration', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'etb',
        state: 'HALF_OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    render(<IntegrationStatusBanner />);

    expect(screen.getByText('Eingeschraenkte Verfuegbarkeit')).toBeInTheDocument();
    expect(screen.getByText(/ETB-Integration/)).toBeInTheDocument();
  });

  it('zeigt mehrere Banner fuer mehrere degradierte Integrationen', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'hiorg-server',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
      updateIntegrationStatus({
        serviceName: 'etb',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    render(<IntegrationStatusBanner />);

    const titles = screen.getAllByText('Eingeschraenkte Verfuegbarkeit');
    expect(titles).toHaveLength(2);
  });

  it('verschwindet wenn Integration auf CLOSED wechselt', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'hiorg-server',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    const { rerender } = render(<IntegrationStatusBanner />);
    expect(screen.getByText('Eingeschraenkte Verfuegbarkeit')).toBeInTheDocument();

    // Circuit recovered
    act(() => {
      updateIntegrationStatus({
        serviceName: 'hiorg-server',
        state: 'CLOSED',
        timestamp: new Date().toISOString(),
      });
    });

    rerender(<IntegrationStatusBanner />);
    expect(screen.queryByText('Eingeschraenkte Verfuegbarkeit')).not.toBeInTheDocument();
  });

  it('hat role="status" fuer Accessibility', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'hiorg-server',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    render(<IntegrationStatusBanner />);

    const alertElement = screen.getByRole('status');
    expect(alertElement).toBeInTheDocument();
  });

  it('zeigt generischen Namen fuer unbekannten Service', () => {
    act(() => {
      updateIntegrationStatus({
        serviceName: 'unknown-service',
        state: 'OPEN',
        timestamp: new Date().toISOString(),
      });
    });

    render(<IntegrationStatusBanner />);

    expect(screen.getByText(/unknown-service/)).toBeInTheDocument();
  });
});
