import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PSAProfileMultiSelect } from '../PSAProfileMultiSelect';

describe('PSAProfileMultiSelect (Story 3.1)', () => {
  it('rendert alle 5 Chips in Profil-Reihenfolge', () => {
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map()} onToggle={() => {}} />);
    const chips = screen.getAllByRole('checkbox');
    expect(chips).toHaveLength(5);
    expect(chips[0]).toHaveAttribute('aria-label', 'PSA-Profil Basis');
    expect(chips[4]).toHaveAttribute('aria-label', 'PSA-Profil Vollschutz');
  });

  it('zeigt aktiven State und Pending-Diff', () => {
    render(
      <PSAProfileMultiSelect
        currentActive={new Set(['BASIS'])}
        pendingMap={new Map<'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ', boolean>([['INFEKTION', true]])}
        onToggle={() => {}}
      />,
    );
    const basis = screen.getByRole('checkbox', { name: 'PSA-Profil Basis' });
    const infektion = screen.getByRole('checkbox', { name: 'PSA-Profil Infektion' });
    expect(basis).toHaveAttribute('aria-checked', 'true');
    expect(infektion).toHaveAttribute('aria-checked', 'true');
    expect(infektion).toHaveAttribute('data-pending', 'true');
  });

  it('reicht Toggle für ein Profil durch', () => {
    const onToggle = vi.fn();
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'PSA-Profil Verkehrsunfall' }));
    expect(onToggle).toHaveBeenCalledWith('VU');
  });

  it('zeigt "Keine Änderung" wenn pendingMap leer', () => {
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map()} onToggle={() => {}} />);
    expect(screen.getByText('Keine Änderung')).toBeInTheDocument();
  });

  it('zeigt Anzahl der vorgemerkten Änderungen', () => {
    render(
      <PSAProfileMultiSelect
        currentActive={new Set()}
        pendingMap={
          new Map<'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ', boolean>([
            ['BASIS', true],
            ['INFEKTION', true],
          ])
        }
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText('2 Änderungen vorgemerkt')).toBeInTheDocument();
  });
});

describe('PSAProfileMultiSelect Bulk-Modus (Story 3.2 AC3)', () => {
  type Profil = 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ';

  it('zeigt mixed-Status mit aria-checked="mixed" und Badge "auf 2 von 3 aktiv"', () => {
    const aktive = new Map<string, ReadonlyArray<Profil>>([
      ['einheit-1', ['BASIS', 'INFEKTION']],
      ['einheit-2', ['BASIS']],
      ['einheit-3', ['BASIS', 'INFEKTION']],
    ]);
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map<Profil, boolean>()} onToggle={() => {}} aktiveProfileProEinheit={aktive} />);
    const infektion = screen.getByTestId('psa-chip-infektion');
    expect(infektion.getAttribute('aria-checked')).toBe('mixed');
    expect(infektion.getAttribute('data-mixed')).toBe('true');
    expect(infektion.textContent).toContain('auf 2 von 3 aktiv');
  });

  it('all-active Status: aria-checked="true", kein mixed-Badge', () => {
    const aktive = new Map<string, ReadonlyArray<Profil>>([
      ['einheit-1', ['BASIS']],
      ['einheit-2', ['BASIS']],
    ]);
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map<Profil, boolean>()} onToggle={() => {}} aktiveProfileProEinheit={aktive} />);
    const basis = screen.getByTestId('psa-chip-basis');
    expect(basis.getAttribute('aria-checked')).toBe('true');
    expect(basis.getAttribute('data-mixed')).toBeNull();
  });

  it('none-active Status: aria-checked="false"', () => {
    const aktive = new Map<string, ReadonlyArray<Profil>>([
      ['einheit-1', ['BASIS']],
      ['einheit-2', ['BASIS']],
    ]);
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map<Profil, boolean>()} onToggle={() => {}} aktiveProfileProEinheit={aktive} />);
    const cbrn = screen.getByTestId('psa-chip-cbrn_patient');
    expect(cbrn.getAttribute('aria-checked')).toBe('false');
  });

  it('Toggle eines mixed-Chips ruft onToggle (Set-Operation auf alle Einheiten)', () => {
    const aktive = new Map<string, ReadonlyArray<Profil>>([
      ['einheit-1', ['BASIS']],
      ['einheit-2', []],
    ]);
    const onToggle = vi.fn();
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map<Profil, boolean>()} onToggle={onToggle} aktiveProfileProEinheit={aktive} />);
    fireEvent.click(screen.getByTestId('psa-chip-basis'));
    expect(onToggle).toHaveBeenCalledWith('BASIS');
  });

  it('pendingMap-Override für ein mixed-Profil entfernt mixed-Stil und zeigt Ziel-Aktivität', () => {
    const aktive = new Map<string, ReadonlyArray<Profil>>([
      ['einheit-1', ['BASIS']],
      ['einheit-2', []],
    ]);
    render(<PSAProfileMultiSelect currentActive={new Set()} pendingMap={new Map<Profil, boolean>([['BASIS', true]])} onToggle={() => {}} aktiveProfileProEinheit={aktive} />);
    const basis = screen.getByTestId('psa-chip-basis');
    expect(basis.getAttribute('data-mixed')).toBeNull();
    expect(basis.getAttribute('aria-checked')).toBe('true');
    expect(basis.getAttribute('data-pending')).toBe('true');
  });
});
