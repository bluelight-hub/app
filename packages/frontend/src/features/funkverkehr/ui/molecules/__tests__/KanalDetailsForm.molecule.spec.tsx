import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KanalDetailsForm, type KanalDetailsShape } from '../KanalDetailsForm.molecule';

describe('KanalDetailsForm', () => {
  it('zeigt die passenden Felder für TMO', () => {
    const value: KanalDetailsShape = { type: 'tmo', sprechgruppe: 'SG1' };
    render(<KanalDetailsForm value={value} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Sprechgruppe/)).toHaveValue('SG1');
    expect(screen.getByLabelText(/GSSI/)).toBeInTheDocument();
  });

  it('zeigt Frequenz-Feld für Analog', () => {
    const value: KanalDetailsShape = { type: 'analog', band: '4m', frequenz: '170.500' };
    render(<KanalDetailsForm value={value} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Frequenz/)).toHaveValue('170.500');
  });

  it('wechselt bei Radio-Click zu sauberem Default-DTO', () => {
    const value: KanalDetailsShape = { type: 'tmo', sprechgruppe: 'SG1' };
    const handleChange = vi.fn();
    render(<KanalDetailsForm value={value} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'dmo' }));
    expect(handleChange).toHaveBeenCalledWith({ type: 'dmo', dmoKanal: '' });
  });

  it('rendert Fehler-Text und setzt aria-invalid', () => {
    const value: KanalDetailsShape = { type: 'tmo', sprechgruppe: '' };
    render(<KanalDetailsForm value={value} onChange={vi.fn()} errors={{ sprechgruppe: 'Bitte ausfüllen' }} />);
    expect(screen.getByText('Bitte ausfüllen')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sprechgruppe/)).toHaveAttribute('aria-invalid', 'true');
  });
});
