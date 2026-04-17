import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAkutConfirm } from '../use-akut-confirm';

function Harness({ onCommit, onCancel }: { onCommit: (p: { gefahrentyp: 'BRAND'; schutzobjekt: 'MENSCHEN'; warnstufe: 'AKUT' | 'HOCH' }) => void; onCancel?: () => void }) {
  const { requestChange, dialog, isOpen } = useAkutConfirm({ onCommit, onCancel: onCancel ? () => onCancel() : undefined });
  return (
    <div>
      <button
        onClick={() =>
          requestChange({
            gefahrentyp: 'BRAND',
            schutzobjekt: 'MENSCHEN',
            previous: 'HOCH',
            next: 'AKUT',
          })
        }
      >
        upgrade-akut
      </button>
      <button
        onClick={() =>
          requestChange({
            gefahrentyp: 'BRAND',
            schutzobjekt: 'MENSCHEN',
            previous: 'NIEDRIG',
            next: 'MITTEL',
          })
        }
      >
        mitte
      </button>
      <span data-testid="is-open">{isOpen ? 'yes' : 'no'}</span>
      {dialog}
    </div>
  );
}

describe('useAkutConfirm', () => {
  it('commit läuft direkt, wenn nicht auf AKUT hochgestuft wird', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onCommit={onCommit} />);
    await user.click(screen.getByText('mitte'));
    expect(onCommit).toHaveBeenCalledWith({ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'MITTEL' });
    expect(screen.getByTestId('is-open').textContent).toBe('no');
  });

  it('öffnet Dialog beim Hochstufen auf AKUT, Confirm ruft onCommit', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onCommit={onCommit} />);
    await user.click(screen.getByText('upgrade-akut'));
    expect(screen.getByTestId('is-open').textContent).toBe('yes');
    expect(onCommit).not.toHaveBeenCalled();

    await user.click(screen.getByText('AKUT senden'));
    expect(onCommit).toHaveBeenCalledWith({ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'AKUT' });
  });

  it('Cancel-Button schließt Dialog und ruft onCancel, kein Commit', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<Harness onCommit={onCommit} onCancel={onCancel} />);
    await user.click(screen.getByText('upgrade-akut'));
    await user.click(screen.getByText('Abbrechen'));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByTestId('is-open').textContent).toBe('no');
  });

  it('AKUT → AKUT (No-Op) triggert keinen Dialog', async () => {
    const onCommit = vi.fn();
    function NoopHarness() {
      const { requestChange, dialog, isOpen } = useAkutConfirm({ onCommit });
      return (
        <div>
          <button
            onClick={() =>
              requestChange({
                gefahrentyp: 'BRAND',
                schutzobjekt: 'MENSCHEN',
                previous: 'AKUT',
                next: 'AKUT',
              })
            }
          >
            noop
          </button>
          <span data-testid="is-open">{isOpen ? 'yes' : 'no'}</span>
          {dialog}
        </div>
      );
    }
    const user = userEvent.setup();
    render(<NoopHarness />);
    await act(async () => {
      await user.click(screen.getByText('noop'));
    });
    expect(screen.getByTestId('is-open').textContent).toBe('no');
    expect(onCommit).toHaveBeenCalledWith({ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'AKUT' });
  });
});
