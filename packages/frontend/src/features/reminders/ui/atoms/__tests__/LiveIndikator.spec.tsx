import { render, screen } from '@testing-library/react';

import { LiveIndikator } from '../LiveIndikator';

describe('LiveIndikator', () => {
  it('should show connected state with pulse animation', () => {
    // Given
    const { container } = render(<LiveIndikator isConnected={true} />);

    // Then
    expect(screen.getByText('Live - aktualisiert sich automatisch')).toBeInTheDocument();
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('should show disconnected state with warning styling', () => {
    // Given
    const { container } = render(<LiveIndikator isConnected={false} />);

    // Then
    expect(screen.getByText('Verbindung unterbrochen')).toBeInTheDocument();
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).not.toBeInTheDocument();
  });
});
