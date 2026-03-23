import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineConfirmation } from '../InlineConfirmation.atom';
import { useInlineConfirmation } from '../../hooks/use-inline-confirmation';
import { renderHook } from '@testing-library/react';

describe('InlineConfirmation', () => {
  it('sollte Nachricht anzeigen', () => {
    render(<InlineConfirmation message="Erfolgreich gespeichert" variant="success" />);
    expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();
  });

  it('sollte aria-live und role Attribute haben', () => {
    render(<InlineConfirmation message="Test" variant="success" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('sollte Dismiss-Button bei onDismiss zeigen', async () => {
    const onDismiss = vi.fn();
    render(<InlineConfirmation message="Test" variant="error" onDismiss={onDismiss} />);

    const button = screen.getByLabelText('Meldung schließen');
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('sollte keinen Dismiss-Button ohne onDismiss zeigen', () => {
    render(<InlineConfirmation message="Test" variant="warning" />);
    expect(screen.queryByLabelText('Meldung schließen')).not.toBeInTheDocument();
  });
});

describe('useInlineConfirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sollte initial null sein', () => {
    const { result } = renderHook(() => useInlineConfirmation());
    expect(result.current.confirmation).toBeNull();
  });

  it('sollte Confirmation nach show() setzen', () => {
    const { result } = renderHook(() => useInlineConfirmation());

    act(() => {
      result.current.show('Test', 'success');
    });

    expect(result.current.confirmation).toEqual({ message: 'Test', variant: 'success' });
  });

  it('sollte nach duration auto-dismiss', () => {
    const { result } = renderHook(() => useInlineConfirmation(1000));

    act(() => {
      result.current.show('Test', 'success');
    });

    expect(result.current.confirmation).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.confirmation).toBeNull();
  });

  it('sollte manuelles dismiss unterstuetzen', () => {
    const { result } = renderHook(() => useInlineConfirmation());

    act(() => {
      result.current.show('Test', 'error');
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.confirmation).toBeNull();
  });

  it('sollte Timer bei erneutem show() zuruecksetzen', () => {
    const { result } = renderHook(() => useInlineConfirmation(2000));

    act(() => {
      result.current.show('First', 'success');
    });

    act(() => {
      vi.advanceTimersByTime(1500); // 1.5s von 2s
    });

    act(() => {
      result.current.show('Second', 'warning'); // Reset Timer
    });

    act(() => {
      vi.advanceTimersByTime(1500); // Noch 1.5s - erster waere weg, zweiter nicht
    });

    expect(result.current.confirmation).toEqual({ message: 'Second', variant: 'warning' });

    act(() => {
      vi.advanceTimersByTime(500); // Jetzt 2s gesamt
    });

    expect(result.current.confirmation).toBeNull();
  });
});
