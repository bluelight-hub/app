import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FunkspruchCompactRow } from '../FunkspruchCompactRow.molecule';

describe('FunkspruchCompactRow', () => {
  it('rendert Zeitstempel, Kanal, Absender → Empfänger, Text', () => {
    render(
      // @ts-expect-error test fixture shape
      <FunkspruchCompactRow
        eintrag={{
          id: 'e-1',
          sequenceNumber: 1,
          text: 'Eintreffen',
          kategorie: 'KOMMUNIKATION',
          absender: 'RK 83/1',
          empfaenger: 'LST',
          timestamp: new Date('2026-04-15T12:00:00Z'),
          ereignisZeitpunkt: new Date('2026-04-15T12:00:00Z'),
          erfasstAm: new Date('2026-04-15T12:00:00Z'),
          isKorrigiert: false,
          kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'routine' },
        }}
        kanal={{ id: 'k1', name: 'Führung 1' }}
      />,
    );

    expect(screen.getByText('Führung 1')).toBeInTheDocument();
    expect(screen.getByText(/RK 83\/1 → LST/)).toBeInTheDocument();
    expect(screen.getByText('Eintreffen')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
