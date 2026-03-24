/**
 * Tests für ServerColorPicker Molecule
 *
 * Testet die Farb-Auswahl Komponente mit Grid-Layout,
 * Keyboard-Navigation und Accessibility-Features.
 *
 * @module features/server/ui/molecules/__tests__/ServerColorPicker
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerColorPicker } from '../ServerColorPicker';
import { SERVER_COLOR_PRESETS } from '../../../utils/server-color.utils';

describe('ServerColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render all color options from presets', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const radioGroup = screen.getByRole('radiogroup');
      const options = within(radioGroup).getAllByRole('radio');
      expect(options).toHaveLength(SERVER_COLOR_PRESETS.length);
    });

    it('should render radiogroup with correct label', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const radioGroup = screen.getByRole('radiogroup', { name: /farbe auswählen/i });
      expect(radioGroup).toBeInTheDocument();
    });

    it('should render color buttons with correct names', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByRole('radio', { name: /himmelblau/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /smaragd/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /bernstein/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /rose/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /violett/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /cyan/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /orange/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /fuchsia/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /grau/i })).toBeInTheDocument();
    });

    it('should render "Keine Farbe" reset option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);

      // Then
      expect(screen.getByRole('radio', { name: /keine farbe/i })).toBeInTheDocument();
    });

    it('should not render reset option when value is undefined', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.queryByRole('radio', { name: /keine farbe/i })).not.toBeInTheDocument();
    });

    it('should render in 3-column grid layout', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveClass('grid-cols-3');
    });
  });

  // =====================================================
  // Selection State Tests
  // =====================================================

  describe('Selection State', () => {
    it('should highlight selected color with aria-checked', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(skyButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should not highlight unselected colors', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);

      // Then
      const emeraldButton = screen.getByRole('radio', { name: /smaragd/i });
      expect(emeraldButton).toHaveAttribute('aria-checked', 'false');
    });

    it('should show ring styling on selected color', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="emerald" onChange={onChange} />);

      // Then
      const emeraldButton = screen.getByRole('radio', { name: /smaragd/i });
      expect(emeraldButton).toHaveClass('ring-2');
      expect(emeraldButton).toHaveClass('ring-offset-2');
    });

    it('should not show ring on unselected colors', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="emerald" onChange={onChange} />);

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(skyButton).not.toHaveClass('ring-2');
    });

    it('should have no selection when value is undefined', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      for (const option of options) {
        expect(option).toHaveAttribute('aria-checked', 'false');
      }
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onChange when color is clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /smaragd/i }));

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('emerald');
    });

    it('should call onChange with undefined when reset clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /keine farbe/i }));

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('should select color on Enter key press', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);
      const violettButton = screen.getByRole('radio', { name: /violett/i });
      violettButton.focus();
      await user.keyboard('{Enter}');

      // Then
      expect(onChange).toHaveBeenCalledWith('violet');
    });

    it('should select color on Space key press', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);
      const roseButton = screen.getByRole('radio', { name: /rose/i });
      roseButton.focus();
      await user.keyboard(' ');

      // Then
      expect(onChange).toHaveBeenCalledWith('rose');
    });

    it('should not call onChange when clicking already selected color', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /himmelblau/i }));

      // Then
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Keyboard Navigation Tests
  // =====================================================

  describe('Keyboard Navigation', () => {
    it('should navigate with ArrowRight key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      skyButton.focus();
      await user.keyboard('{ArrowRight}');

      // Then
      const emeraldButton = screen.getByRole('radio', { name: /smaragd/i });
      expect(document.activeElement).toBe(emeraldButton);
    });

    it('should navigate with ArrowLeft key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="emerald" onChange={onChange} />);
      const emeraldButton = screen.getByRole('radio', { name: /smaragd/i });
      emeraldButton.focus();
      await user.keyboard('{ArrowLeft}');

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(document.activeElement).toBe(skyButton);
    });

    it('should navigate with ArrowDown key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} />);
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      skyButton.focus();
      await user.keyboard('{ArrowDown}');

      // Then
      // In 3-column grid, down from first row goes to 4th item (index 3)
      const roseButton = screen.getByRole('radio', { name: /rose/i });
      expect(document.activeElement).toBe(roseButton);
    });

    it('should navigate with ArrowUp key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="rose" onChange={onChange} />);
      const roseButton = screen.getByRole('radio', { name: /rose/i });
      roseButton.focus();
      await user.keyboard('{ArrowUp}');

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(document.activeElement).toBe(skyButton);
    });

    it('should wrap around at the end of row', async () => {
      // Given - no value selected, so no reset button
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);
      // Dynamisch letztes Element aus Presets nutzen statt hardcoded "slate"
      const lastPreset = SERVER_COLOR_PRESETS[SERVER_COLOR_PRESETS.length - 1];
      const lastColorButton = screen.getByRole('radio', { name: new RegExp(lastPreset.name, 'i') });
      lastColorButton.focus();
      await user.keyboard('{ArrowRight}');

      // Then - should wrap to first item (last preset is last in grid)
      const firstPreset = SERVER_COLOR_PRESETS[0];
      const firstColorButton = screen.getByRole('radio', { name: new RegExp(firstPreset.name, 'i') });
      expect(document.activeElement).toBe(firstColorButton);
    });
  });

  // =====================================================
  // Disabled State Tests
  // =====================================================

  describe('Disabled State', () => {
    it('should disable all options when disabled prop is true', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} disabled />);

      // Then
      const options = screen.getAllByRole('radio');
      for (const option of options) {
        expect(option).toHaveAttribute('aria-disabled', 'true');
      }
    });

    it('should not call onChange when disabled', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} disabled />);
      await user.click(screen.getByRole('radio', { name: /smaragd/i }));

      // Then
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should have reduced opacity when disabled', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} disabled />);

      // Then
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveClass('opacity-50');
    });

    it('should not be keyboard navigable when disabled', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="sky" onChange={onChange} disabled />);

      // Then
      const options = screen.getAllByRole('radio');
      for (const option of options) {
        expect(option).toHaveAttribute('tabIndex', '-1');
      }
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have radiogroup role', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have radio role for each option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThanOrEqual(9);
    });

    it('should have descriptive aria-label for radiogroup', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-label', 'Farbe auswählen');
    });

    it('should have aria-label for each color option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(skyButton).toHaveAccessibleName();
    });

    it('should announce selected state via aria-checked', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="amber" onChange={onChange} />);

      // Then
      const amberButton = screen.getByRole('radio', { name: /bernstein/i });
      expect(amberButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should have first focusable item with tabIndex 0', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const firstOption = screen.getAllByRole('radio')[0];
      expect(firstOption).toHaveAttribute('tabIndex', '0');
    });

    it('should have other items with tabIndex -1', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      for (let i = 1; i < options.length; i++) {
        expect(options[i]).toHaveAttribute('tabIndex', '-1');
      }
    });

    it('should move tabIndex to selected item', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="violet" onChange={onChange} />);

      // Then
      const violetButton = screen.getByRole('radio', { name: /violett/i });
      expect(violetButton).toHaveAttribute('tabIndex', '0');
    });
  });

  // =====================================================
  // Styling Tests
  // =====================================================

  describe('Styling', () => {
    it('should apply background color to each option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const skyButton = screen.getByRole('radio', { name: /himmelblau/i });
      expect(skyButton).toHaveClass('bg-sky-500');
    });

    it('should have rounded styling', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      expect(options[0]).toHaveClass('rounded-full');
    });

    it('should have hover scale effect', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      expect(options[0]).toHaveClass('hover:scale-110');
    });

    it('should have focus-visible ring styling', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      expect(options[0]).toHaveClass('focus-visible:shadow-focus-ring');
    });

    it('should have transition for smooth animations', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      expect(options[0]).toHaveClass('transition-transform');
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle invalid color value gracefully', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value="invalid-color" onChange={onChange} />);

      // Then
      const options = screen.getAllByRole('radio');
      for (const option of options) {
        expect(option).toHaveAttribute('aria-checked', 'false');
      }
    });

    it('should handle rapid clicking on same already-selected color', async () => {
      // Given - emerald is already selected
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When - clicking already selected color multiple times
      render(<ServerColorPicker value="emerald" onChange={onChange} />);
      const emeraldButton = screen.getByRole('radio', { name: /smaragd/i });
      await user.click(emeraldButton);
      await user.click(emeraldButton);
      await user.click(emeraldButton);

      // Then - should not call onChange since color is already selected
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should merge custom className', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerColorPicker value={undefined} onChange={onChange} className="custom-class mt-4" />);

      // Then
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveClass('custom-class');
      expect(radioGroup).toHaveClass('mt-4');
    });
  });
});
