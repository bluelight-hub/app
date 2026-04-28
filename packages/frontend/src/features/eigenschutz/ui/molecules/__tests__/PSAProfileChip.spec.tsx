import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PSAProfileChip } from '../PSAProfileChip';

describe('PSAProfileChip (Story 3.1)', () => {
  it('rendert mit role=checkbox + aria-checked passend zu active', () => {
    const onToggle = vi.fn();
    render(<PSAProfileChip profil="BASIS" active={true} onToggle={onToggle} />);
    const chip = screen.getByRole('checkbox', { name: /Basis/i });
    expect(chip).toHaveAttribute('aria-checked', 'true');
  });

  it('toggelt mit Click', () => {
    const onToggle = vi.fn();
    render(<PSAProfileChip profil="INFEKTION" active={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('toggelt mit Space + Enter', () => {
    const onToggle = vi.fn();
    render(<PSAProfileChip profil="VU" active={false} onToggle={onToggle} />);
    const chip = screen.getByRole('checkbox');
    fireEvent.keyDown(chip, { key: ' ' });
    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('zeigt optimisticActive bevor Server bestätigt', () => {
    const onToggle = vi.fn();
    render(<PSAProfileChip profil="CBRN_PATIENT" active={false} optimisticActive={true} pendingChange onToggle={onToggle} />);
    const chip = screen.getByRole('checkbox');
    expect(chip).toHaveAttribute('aria-checked', 'true');
    expect(chip).toHaveAttribute('data-pending', 'true');
  });

  it('disabled lehnt Toggle ab', () => {
    const onToggle = vi.fn();
    render(<PSAProfileChip profil="VOLLSCHUTZ" active={false} disabled onToggle={onToggle} />);
    const chip = screen.getByRole('checkbox');
    fireEvent.click(chip);
    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(onToggle).not.toHaveBeenCalled();
  });
});
