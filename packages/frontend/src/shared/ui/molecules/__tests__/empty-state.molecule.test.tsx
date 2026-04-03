import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../empty-state.molecule';
import { PiUsers } from 'react-icons/pi';

describe('EmptyState', () => {
  it('rendert Titel und Beschreibung', () => {
    render(<EmptyState icon={PiUsers} title="Keine Benutzer" description="Es wurden noch keine Benutzer angelegt." />);
    expect(screen.getByText('Keine Benutzer')).toBeInTheDocument();
    expect(screen.getByText('Es wurden noch keine Benutzer angelegt.')).toBeInTheDocument();
  });

  it('rendert Icon', () => {
    render(<EmptyState icon={PiUsers} title="Keine Benutzer" description="Beschreibung" />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('rendert CTA-Button und ruft onClick auf', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<EmptyState icon={PiUsers} title="Keine Benutzer" description="Beschreibung" action={{ label: 'Benutzer anlegen', onClick: handleClick }} />);
    const button = screen.getByRole('button', { name: 'Benutzer anlegen' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('rendert sekundäre Aktion', async () => {
    const user = userEvent.setup();
    const handleSecondary = vi.fn();
    render(<EmptyState icon={PiUsers} title="Keine Benutzer" description="Beschreibung" secondaryAction={{ label: 'Einladung senden', onClick: handleSecondary }} />);
    const button = screen.getByRole('button', { name: 'Einladung senden' });
    await user.click(button);
    expect(handleSecondary).toHaveBeenCalledOnce();
  });

  it('rendert ohne Aktionen', () => {
    render(<EmptyState icon={PiUsers} title="Keine Benutzer" description="Beschreibung" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
