/**
 * Tests für ServerIconPicker Molecule
 *
 * Testet die Icon-Auswahl-Funktionalität mit Grid-Layout,
 * Accessibility und Keyboard Navigation.
 *
 * @module features/server/ui/molecules/__tests__/ServerIconPicker
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SERVER_ICON_PRESETS } from '../../../constants/server-icons';
import { isValidServerIcon } from '../../../utils/server-icon.utils';
import { ServerIconPicker } from '../ServerIconPicker';

describe('ServerIconPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render all icon options plus "no icon" option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then - 8 Icons + 1 "Kein Icon" = 9
      expect(screen.getAllByRole('radio')).toHaveLength(9);
    });

    it('should render the radiogroup container', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should render label text "Icon auswählen"', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByText('Icon auswählen')).toBeInTheDocument();
    });

    it('should render all preset icons with their German names', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      for (const preset of SERVER_ICON_PRESETS) {
        expect(screen.getByRole('radio', { name: new RegExp(preset.name, 'i') })).toBeInTheDocument();
      }
    });

    it('should render "Kein Icon" option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByRole('radio', { name: /kein icon/i })).toBeInTheDocument();
    });

    it('should render in a 5-column grid layout', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveClass('grid-cols-5');
    });
  });

  // =====================================================
  // Selection State Tests
  // =====================================================

  describe('Selection State', () => {
    it('should highlight selected icon with aria-checked', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="building" onChange={onChange} />);

      // Then
      const buildingButton = screen.getByRole('radio', { name: /gebäude/i });
      expect(buildingButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should not highlight unselected icons', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="building" onChange={onChange} />);

      // Then
      const shieldButton = screen.getByRole('radio', { name: /schild/i });
      expect(shieldButton).toHaveAttribute('aria-checked', 'false');
    });

    it('should highlight "Kein Icon" when value is undefined', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const noIconButton = screen.getByRole('radio', { name: /kein icon/i });
      expect(noIconButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should apply ring styling to selected icon', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="shield" onChange={onChange} />);

      // Then
      const shieldButton = screen.getByRole('radio', { name: /schild/i });
      expect(shieldButton).toHaveClass('ring-2');
      expect(shieldButton).toHaveClass('ring-sky-500/35');
    });

    it('should not apply ring styling to unselected icons', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="shield" onChange={onChange} />);

      // Then
      const buildingButton = screen.getByRole('radio', { name: /gebäude/i });
      expect(buildingButton).not.toHaveClass('ring-2');
    });
  });

  // =====================================================
  // Interaction Tests
  // =====================================================

  describe('Interactions', () => {
    it('should call onChange with icon value when clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /gebäude/i }));

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('building');
    });

    it('should call onChange with undefined when "Kein Icon" clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="building" onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /kein icon/i }));

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('should not call onChange when clicking already selected icon', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value="building" onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: /gebäude/i }));

      // Then
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should select icon with Enter key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      const sternButton = screen.getByRole('radio', { name: /stern/i });
      sternButton.focus();
      await user.keyboard('{Enter}');

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('star');
    });

    it('should select icon with Space key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      const herzButton = screen.getByRole('radio', { name: /herz/i });
      herzButton.focus();
      await user.keyboard(' ');

      // Then
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('heart');
    });
  });

  // =====================================================
  // Disabled State Tests
  // =====================================================

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} disabled />);

      // Then
      const buttons = screen.getAllByRole('radio');
      for (const button of buttons) {
        expect(button).toHaveAttribute('aria-disabled', 'true');
      }
    });

    it('should not call onChange when disabled and clicked', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} disabled />);
      await user.click(screen.getByRole('radio', { name: /gebäude/i }));

      // Then
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should apply disabled styling when disabled', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} disabled />);

      // Then
      const buttons = screen.getAllByRole('radio');
      for (const button of buttons) {
        expect(button).toHaveClass('disabled:cursor-not-allowed');
        expect(button).toHaveClass('disabled:opacity-50');
      }
    });

    it('should not respond to keyboard when disabled', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} disabled />);
      const button = screen.getByRole('radio', { name: /stern/i });
      button.focus();
      await user.keyboard('{Enter}');

      // Then
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have radiogroup role on container', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have radio role on each option', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(9);
    });

    it('should have aria-label on radiogroup', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAttribute('aria-label', 'Server-Icon auswählen');
    });

    it('should have accessible names for all icon buttons', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      // Each icon should have a proper accessible name
      expect(screen.getByRole('radio', { name: /gebäude/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /schild/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /stern/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /pin/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /server/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /haus/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /akademie/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /herz/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /kein icon/i })).toBeInTheDocument();
    });

    it('should be focusable via Tab key', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      await user.tab();

      // Then - first focusable element should be focused
      expect(screen.getAllByRole('radio')[0]).toHaveFocus();
    });

    it('should navigate with arrow keys', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      const firstButton = screen.getAllByRole('radio')[0];
      firstButton.focus();
      await user.keyboard('{ArrowRight}');

      // Then - next button should be focused
      expect(screen.getAllByRole('radio')[1]).toHaveFocus();
    });

    it('should wrap around when pressing arrow at edge', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      const firstButton = screen.getAllByRole('radio')[0];
      firstButton.focus();
      await user.keyboard('{ArrowLeft}');

      // Then - should wrap to last button
      const lastButton = screen.getAllByRole('radio')[8];
      expect(lastButton).toHaveFocus();
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================

  describe('Edge Cases', () => {
    it('should validate icon values using isValidServerIcon utility', () => {
      // Given - Test der Validierungs-Utility statt TypeScript zu umgehen
      // (Komponenten-Props sind streng typisiert - Runtime-Validierung erfolgt via Utility)

      // When/Then - Gültige Icons werden akzeptiert
      expect(isValidServerIcon('building')).toBe(true);
      expect(isValidServerIcon('shield')).toBe(true);

      // When/Then - Ungültige Werte werden abgelehnt
      expect(isValidServerIcon('invalid-icon')).toBe(false);
      expect(isValidServerIcon('')).toBe(false);
      expect(isValidServerIcon('unknown')).toBe(false);
    });

    it('should select "Kein Icon" when value is undefined', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then - "Kein Icon" should be selected
      const noIconButton = screen.getByRole('radio', { name: /kein icon/i });
      expect(noIconButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should correctly display all 8 predefined icons', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then - all 8 icons from SERVER_ICON_PRESETS should be present
      expect(SERVER_ICON_PRESETS).toHaveLength(8);
      for (const preset of SERVER_ICON_PRESETS) {
        const button = screen.getByRole('radio', { name: new RegExp(preset.name, 'i') });
        expect(button).toBeInTheDocument();
      }
    });

    it('should handle rapid clicks without issues', async () => {
      // Given
      const user = userEvent.setup();
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);
      const gebaeudeButton = screen.getByRole('radio', { name: /gebäude/i });
      const schildButton = screen.getByRole('radio', { name: /schild/i });

      await user.click(gebaeudeButton);
      await user.click(schildButton);
      await user.click(gebaeudeButton);

      // Then
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, 'building');
      expect(onChange).toHaveBeenNthCalledWith(2, 'shield');
      expect(onChange).toHaveBeenNthCalledWith(3, 'building');
    });
  });

  // =====================================================
  // Styling Tests
  // =====================================================

  describe('Styling', () => {
    it('should have hover styles on buttons', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const buttons = screen.getAllByRole('radio');
      for (const button of buttons) {
        expect(button).toHaveClass('hover:bg-muted');
      }
    });

    it('should accept custom className', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} className="my-custom-class" />);

      // Then
      const container = screen.getByRole('radiogroup').parentElement;
      expect(container).toHaveClass('my-custom-class');
    });

    it('should have dark mode styles', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const buttons = screen.getAllByRole('radio');
      for (const button of buttons) {
        expect(button).toHaveClass('dark:hover:bg-input/50');
      }
    });

    it('should have focus-visible ring on focus', () => {
      // Given
      const onChange = vi.fn();

      // When
      render(<ServerIconPicker value={undefined} onChange={onChange} />);

      // Then
      const buttons = screen.getAllByRole('radio');
      for (const button of buttons) {
        expect(button).toHaveClass('focus-visible:ring-2');
      }
    });
  });
});
