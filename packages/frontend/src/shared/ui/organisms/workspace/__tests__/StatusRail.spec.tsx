import { render, screen, within } from '@testing-library/react';
import { PiWarning } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { StatusRail } from '../StatusRail';

describe('StatusRail', () => {
  it('rendert Status mit Live-Status-Semantik statt als Formular-Output', () => {
    const { container } = render(
      <StatusRail
        items={[
          {
            id: 'connection',
            label: 'Degradierte Verbindung',
            value: '3 min',
            description: 'Verbindung instabil',
            tone: 'warning',
            icon: PiWarning,
            nextActionLabel: 'Nächster Schritt',
            nextActionDescription: 'Erneut synchronisieren oder später erneut prüfen',
          },
          {
            id: 'assignment',
            label: 'Arbeitszugriff blockiert',
            description: 'Person auswählen, um den Einsatz zu bearbeiten',
            tone: 'blocked',
            icon: PiWarning,
            role: 'alert',
          },
        ]}
      />,
    );

    const region = screen.getByRole('region', { name: 'Workspace-Status' });
    const statuses = screen.getAllByRole('status');
    const [status] = statuses;

    expect(screen.getByText('Degradierte Verbindung')).toBeInTheDocument();
    expect(screen.getByText('3 min')).toBeInTheDocument();
    expect(screen.getByText('Verbindung instabil')).toBeInTheDocument();
    expect(screen.getByText(/Nächster Schritt: Erneut synchronisieren oder später erneut prüfen/)).toBeInTheDocument();
    expect(screen.getByText('Arbeitszugriff blockiert')).toBeInTheDocument();
    expect(screen.getByText('Person auswählen, um den Einsatz zu bearbeiten')).toBeInTheDocument();
    expect(region).toBeInTheDocument();
    expect(status).toHaveTextContent('Degradierte Verbindung');
    expect(status).toHaveTextContent('3 min');
    expect(status).toHaveTextContent('Verbindung instabil');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    expect(status.tagName).not.toBe('OUTPUT');
    expect(statuses).toHaveLength(1);
    expect(within(region).getByText('Arbeitszugriff blockiert')).toBeInTheDocument();
    expect(container.querySelector('output')).toBeNull();
  });
});
