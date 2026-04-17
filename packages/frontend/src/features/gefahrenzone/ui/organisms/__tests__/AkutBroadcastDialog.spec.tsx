import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AkutBroadcastDialog } from '../AkutBroadcastDialog';

describe('AkutBroadcastDialog', () => {
  it('zeigt Gefahrentyp und Schutzobjekt im Dialog-Text', () => {
    render(<AkutBroadcastDialog isOpen gefahrentyp="BRAND" schutzobjekt="MENSCHEN" onConfirm={() => undefined} onCancel={() => undefined} />);
    expect(screen.getByText('AKUT-Warnstufe senden?')).toBeInTheDocument();
    expect(screen.getByText(/Du bist dabei/)).toBeInTheDocument();
  });

  it('„AKUT senden" ruft onConfirm', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<AkutBroadcastDialog isOpen gefahrentyp="BRAND" schutzobjekt="MENSCHEN" onConfirm={onConfirm} onCancel={() => undefined} />);
    await user.click(screen.getByText('AKUT senden'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('„Abbrechen" ruft onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<AkutBroadcastDialog isOpen gefahrentyp="BRAND" schutzobjekt="MENSCHEN" onConfirm={() => undefined} onCancel={onCancel} />);
    await user.click(screen.getByText('Abbrechen'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Esc schließt (onClose/onCancel)', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<AkutBroadcastDialog isOpen gefahrentyp="BRAND" schutzobjekt="MENSCHEN" onConfirm={() => undefined} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('rendert nichts wenn isOpen=false', () => {
    render(<AkutBroadcastDialog isOpen={false} gefahrentyp={null} schutzobjekt={null} onConfirm={() => undefined} onCancel={() => undefined} />);
    expect(screen.queryByText('AKUT-Warnstufe senden?')).not.toBeInTheDocument();
  });
});
