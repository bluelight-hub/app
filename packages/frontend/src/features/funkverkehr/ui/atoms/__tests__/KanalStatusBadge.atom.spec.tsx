import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KanalStatusBadge } from '../KanalStatusBadge.atom';

describe('KanalStatusBadge', () => {
  it.each([
    ['aktiv', 'Aktiv'],
    ['inaktiv', 'Inaktiv'],
    ['archiviert', 'Archiviert'],
  ] as const)('rendert Label "%s" → "%s"', (status, label) => {
    render(<KanalStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: `Kanalstatus: ${label}` })).toBeInTheDocument();
  });

  it('trägt den Status als data-Attribut für Selector-basierte Styles', () => {
    const { container } = render(<KanalStatusBadge status="archiviert" />);
    expect(container.querySelector('[data-status="archiviert"]')).toBeInTheDocument();
  });
});
