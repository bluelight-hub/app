import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ItemTypeFilterControl } from '../ItemTypeFilter';

describe('ItemTypeFilterControl', () => {
  // --- AC2: Filtermöglichkeit nach Typ ---

  describe('Rendering', () => {
    it('should render three filter options', () => {
      // Given ein Filter-Control
      render(<ItemTypeFilterControl value="alle" onChange={() => {}} />);

      // Then gibt es drei Radio-Buttons
      const buttons = screen.getAllByRole('radio');
      expect(buttons).toHaveLength(3);
    });

    it('should render labels "Alle", "Erinnerungen", "Notizen"', () => {
      // Given ein Filter-Control
      render(<ItemTypeFilterControl value="alle" onChange={() => {}} />);

      // Then sind alle Labels sichtbar
      expect(screen.getByText('Alle')).toBeInTheDocument();
      expect(screen.getByText('Erinnerungen')).toBeInTheDocument();
      expect(screen.getByText('Notizen')).toBeInTheDocument();
    });

    it('should have radiogroup role', () => {
      // Given ein Filter-Control
      render(<ItemTypeFilterControl value="alle" onChange={() => {}} />);

      // Then hat der Container die radiogroup-Rolle
      expect(screen.getByRole('radiogroup', { name: 'Typ-Filter' })).toBeInTheDocument();
    });
  });

  // --- AC2: Aktiver Filter visuell erkennbar ---

  describe('Aktiver Filter', () => {
    it('should mark "Alle" as checked when value is "alle"', () => {
      // Given Filter auf "alle"
      render(<ItemTypeFilterControl value="alle" onChange={() => {}} />);

      // Then ist "Alle" als checked markiert
      const alleButton = screen.getByText('Alle').closest('button');
      expect(alleButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark "Erinnerungen" as checked when value is "erinnerungen"', () => {
      // Given Filter auf "erinnerungen"
      render(<ItemTypeFilterControl value="erinnerungen" onChange={() => {}} />);

      // Then ist "Erinnerungen" als checked markiert
      const button = screen.getByText('Erinnerungen').closest('button');
      expect(button).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark "Notizen" as checked when value is "notizen"', () => {
      // Given Filter auf "notizen"
      render(<ItemTypeFilterControl value="notizen" onChange={() => {}} />);

      // Then ist "Notizen" als checked markiert
      const button = screen.getByText('Notizen').closest('button');
      expect(button).toHaveAttribute('aria-checked', 'true');
    });

    it('should apply active styling to selected filter', () => {
      // Given Filter auf "notizen"
      render(<ItemTypeFilterControl value="notizen" onChange={() => {}} />);

      // Then hat der aktive Button die hervorgehobene Klasse
      const button = screen.getByText('Notizen').closest('button');
      expect(button?.className).toContain('bg-white');
      expect(button?.className).toContain('shadow-sm');
    });

    it('should not apply active styling to unselected filters', () => {
      // Given Filter auf "notizen"
      render(<ItemTypeFilterControl value="notizen" onChange={() => {}} />);

      // Then haben die anderen Buttons keine Highlight-Klasse
      const alleButton = screen.getByText('Alle').closest('button');
      expect(alleButton?.className).not.toContain('bg-white');
    });
  });

  // --- Interaktion ---

  describe('Interaktion', () => {
    it('should call onChange with "erinnerungen" when clicking "Erinnerungen"', async () => {
      // Given ein Filter-Control
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When "Erinnerungen" geklickt wird
      await user.click(screen.getByText('Erinnerungen'));

      // Then wird onChange mit "erinnerungen" aufgerufen
      expect(onChange).toHaveBeenCalledWith('erinnerungen');
    });

    it('should call onChange with "notizen" when clicking "Notizen"', async () => {
      // Given ein Filter-Control
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When "Notizen" geklickt wird
      await user.click(screen.getByText('Notizen'));

      // Then wird onChange mit "notizen" aufgerufen
      expect(onChange).toHaveBeenCalledWith('notizen');
    });

    it('should call onChange with "alle" when clicking "Alle"', async () => {
      // Given Filter auf "erinnerungen"
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="erinnerungen" onChange={onChange} />);

      // When "Alle" geklickt wird
      await user.click(screen.getByText('Alle'));

      // Then wird onChange mit "alle" aufgerufen
      expect(onChange).toHaveBeenCalledWith('alle');
    });
  });

  // --- Keyboard Navigation ---

  describe('Keyboard Navigation', () => {
    it('should navigate to next option with ArrowRight', async () => {
      // Given ein Filter-Control mit "alle" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When ArrowRight gedrückt wird
      const alleButton = screen.getByText('Alle').closest('button')!;
      alleButton.focus();
      await user.keyboard('{ArrowRight}');

      // Then ist der Fokus auf "Erinnerungen"
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      expect(document.activeElement).toBe(erinnerungenButton);
    });

    it('should navigate to previous option with ArrowLeft', async () => {
      // Given ein Filter-Control mit "erinnerungen" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="erinnerungen" onChange={onChange} />);

      // When ArrowLeft gedrückt wird
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      erinnerungenButton.focus();
      await user.keyboard('{ArrowLeft}');

      // Then ist der Fokus auf "Alle"
      const alleButton = screen.getByText('Alle').closest('button')!;
      expect(document.activeElement).toBe(alleButton);
    });

    it('should navigate to next option with ArrowDown', async () => {
      // Given ein Filter-Control mit "alle" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When ArrowDown gedrückt wird
      const alleButton = screen.getByText('Alle').closest('button')!;
      alleButton.focus();
      await user.keyboard('{ArrowDown}');

      // Then ist der Fokus auf "Erinnerungen"
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      expect(document.activeElement).toBe(erinnerungenButton);
    });

    it('should navigate to previous option with ArrowUp', async () => {
      // Given ein Filter-Control mit "erinnerungen" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="erinnerungen" onChange={onChange} />);

      // When ArrowUp gedrückt wird
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      erinnerungenButton.focus();
      await user.keyboard('{ArrowUp}');

      // Then ist der Fokus auf "Alle"
      const alleButton = screen.getByText('Alle').closest('button')!;
      expect(document.activeElement).toBe(alleButton);
    });

    it('should wrap around from last to first with ArrowRight', async () => {
      // Given ein Filter-Control mit "notizen" selektiert (letztes Element)
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="notizen" onChange={onChange} />);

      // When ArrowRight gedrückt wird am Ende
      const notizenButton = screen.getByText('Notizen').closest('button')!;
      notizenButton.focus();
      await user.keyboard('{ArrowRight}');

      // Then ist der Fokus auf "Alle" (wrap-around)
      const alleButton = screen.getByText('Alle').closest('button')!;
      expect(document.activeElement).toBe(alleButton);
    });

    it('should wrap around from first to last with ArrowLeft', async () => {
      // Given ein Filter-Control mit "alle" selektiert (erstes Element)
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When ArrowLeft gedrückt wird am Anfang
      const alleButton = screen.getByText('Alle').closest('button')!;
      alleButton.focus();
      await user.keyboard('{ArrowLeft}');

      // Then ist der Fokus auf "Notizen" (wrap-around)
      const notizenButton = screen.getByText('Notizen').closest('button')!;
      expect(document.activeElement).toBe(notizenButton);
    });

    it('should select focused option with Enter key', async () => {
      // Given ein Filter-Control mit "alle" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When Fokus auf "Erinnerungen" navigiert und Enter gedrückt wird
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      erinnerungenButton.focus();
      await user.keyboard('{Enter}');

      // Then wird onChange mit "erinnerungen" aufgerufen
      expect(onChange).toHaveBeenCalledWith('erinnerungen');
    });

    it('should select focused option with Space key', async () => {
      // Given ein Filter-Control mit "alle" selektiert
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ItemTypeFilterControl value="alle" onChange={onChange} />);

      // When Fokus auf "Notizen" navigiert und Space gedrückt wird
      const notizenButton = screen.getByText('Notizen').closest('button')!;
      notizenButton.focus();
      await user.keyboard(' ');

      // Then wird onChange mit "notizen" aufgerufen
      expect(onChange).toHaveBeenCalledWith('notizen');
    });

    it('should only have tabIndex 0 on selected option (roving tabindex)', () => {
      // Given ein Filter-Control mit "erinnerungen" selektiert
      render(<ItemTypeFilterControl value="erinnerungen" onChange={() => {}} />);

      // Then hat nur "Erinnerungen" tabIndex 0
      const alleButton = screen.getByText('Alle').closest('button')!;
      const erinnerungenButton = screen.getByText('Erinnerungen').closest('button')!;
      const notizenButton = screen.getByText('Notizen').closest('button')!;

      expect(alleButton).toHaveAttribute('tabIndex', '-1');
      expect(erinnerungenButton).toHaveAttribute('tabIndex', '0');
      expect(notizenButton).toHaveAttribute('tabIndex', '-1');
    });
  });

  // --- className Prop ---

  describe('className', () => {
    it('should merge additional className', () => {
      // Given ein Filter-Control mit zusätzlicher className
      render(<ItemTypeFilterControl value="alle" onChange={() => {}} className="mb-4" />);

      // Then wird die Klasse gemerged
      const container = screen.getByRole('radiogroup');
      expect(container.className).toContain('mb-4');
    });
  });
});
