import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FunkspruchBubble } from '../FunkspruchBubble.molecule';

const buildEintrag = (overrides: Partial<{ funkPrioritaet: 'routine' | 'prioritaet' | 'notfall' }> = {}) => ({
  id: 'e-1',
  sequenceNumber: 1,
  text: 'Hilfe angefordert',
  kategorie: 'KOMMUNIKATION',
  absender: 'RK 83/1',
  empfaenger: 'LST',
  timestamp: new Date('2026-04-15T12:00:00Z'),
  ereignisZeitpunkt: new Date('2026-04-15T12:00:00Z'),
  erfasstAm: new Date('2026-04-15T12:00:01Z'),
  isKorrigiert: false,
  kontext: { type: 'funkspruch' as const, kanalId: 'k1', funkPrioritaet: overrides.funkPrioritaet ?? 'routine' },
});

describe('FunkspruchBubble', () => {
  it('rendert Absender, Empfänger und Text', () => {
    // @ts-expect-error test fixture shape
    render(<FunkspruchBubble eintrag={buildEintrag()} kanal={{ id: 'k1', name: 'Führung 1' }} />);

    expect(screen.getByText(/RK 83\/1 → LST/)).toBeInTheDocument();
    expect(screen.getByText('Hilfe angefordert')).toBeInTheDocument();
    expect(screen.getByText('Führung 1')).toBeInTheDocument();
  });

  it('pulsiert bei Notfall', () => {
    const { container } = render(
      // @ts-expect-error test fixture shape
      <FunkspruchBubble eintrag={buildEintrag({ funkPrioritaet: 'notfall' })} kanal={{ id: 'k1', name: 'Führung 1' }} />,
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
