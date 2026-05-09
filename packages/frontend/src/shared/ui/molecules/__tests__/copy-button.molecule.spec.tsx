import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyButton } from '../copy-button.molecule';

describe('CopyButton', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      get: () => ({ writeText }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('kopiert den Text und meldet Erfolg per polite Statuszeile', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="https://localhost/detail" idleLabel="Link kopieren" copiedLabel="Link kopiert" copyText={writeText} />);

    await user.click(screen.getByRole('button', { name: 'Link kopieren' }));

    expect(writeText).toHaveBeenCalledWith('https://localhost/detail');
    expect(await screen.findByRole('status')).toHaveTextContent('Link kopiert');
  });

  it('meldet Clipboard-Fehler inline ohne console.error als einzige Rückmeldung', async () => {
    const user = userEvent.setup();
    writeText.mockRejectedValueOnce(new Error('denied'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<CopyButton text="https://localhost/detail" idleLabel="Link kopieren" errorLabel="Link konnte nicht kopiert werden" copyText={writeText} />);

    await user.click(screen.getByRole('button', { name: 'Link kopieren' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Link konnte nicht kopiert werden');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('räumt Statusfeedback nach dem Timer wieder auf', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="https://localhost/detail" copiedLabel="Link kopiert" feedbackDurationMs={10} copyText={writeText} />);

    await user.click(screen.getByRole('button', { name: 'Kopieren' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Link kopiert');

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
