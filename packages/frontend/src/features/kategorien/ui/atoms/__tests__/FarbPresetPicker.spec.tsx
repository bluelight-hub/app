/**
 * Unit Tests fuer FarbPresetPicker Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.1:** Kategorie erstellen
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FarbPresetPicker } from '../FarbPresetPicker';
import { KATEGORIE_FARB_PRESETS } from '../../../schemas/kategorie.schema';

describe('FarbPresetPicker', () => {
  const defaultProps = {
    value: KATEGORIE_FARB_PRESETS[0].hex,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering (Story 8.1)', () => {
    it('should render all 10 color presets', () => {
      // Given ein FarbPresetPicker
      render(<FarbPresetPicker {...defaultProps} />);

      // Then werden alle 10 Farben als Buttons gerendert
      KATEGORIE_FARB_PRESETS.forEach((preset) => {
        expect(screen.getByLabelText(preset.name)).toBeInTheDocument();
      });
    });

    it('should have role="radiogroup"', () => {
      // Given ein FarbPresetPicker
      render(<FarbPresetPicker {...defaultProps} />);

      // Then hat der Container die radiogroup-Rolle
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have aria-label="Farbauswahl"', () => {
      // Given ein FarbPresetPicker
      render(<FarbPresetPicker {...defaultProps} />);

      // Then hat der Container das richtige aria-label
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Farbauswahl');
    });
  });

  describe('Selection State', () => {
    it('should mark selected color with aria-checked="true"', () => {
      // Given ein FarbPresetPicker mit gewählter Farbe (Rot = Index 0)
      const selectedColor = KATEGORIE_FARB_PRESETS[0].hex;
      render(<FarbPresetPicker value={selectedColor} onChange={vi.fn()} />);

      // Then ist der Rot-Button als checked markiert
      const rotButton = screen.getByLabelText('Rot');
      expect(rotButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark non-selected colors with aria-checked="false"', () => {
      // Given ein FarbPresetPicker mit gewählter Farbe (Rot = Index 0)
      const selectedColor = KATEGORIE_FARB_PRESETS[0].hex;
      render(<FarbPresetPicker value={selectedColor} onChange={vi.fn()} />);

      // Then sind alle anderen Buttons nicht checked
      const blauButton = screen.getByLabelText('Blau');
      expect(blauButton).toHaveAttribute('aria-checked', 'false');

      const gruenButton = screen.getByLabelText('Grün');
      expect(gruenButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Interaction', () => {
    it('should call onChange when clicking a color', async () => {
      // Given ein FarbPresetPicker mit Rot ausgewaehlt (Index 0)
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FarbPresetPicker value={KATEGORIE_FARB_PRESETS[0].hex} onChange={onChange} />);

      // When der Benutzer auf Blau klickt (Index 5)
      const blauButton = screen.getByLabelText('Blau');
      await user.click(blauButton);

      // Then wird onChange mit der blauen Farbe aufgerufen
      expect(onChange).toHaveBeenCalledWith(KATEGORIE_FARB_PRESETS[5].hex);
      expect(onChange).toHaveBeenCalledOnce();
    });

    it('should call onChange with correct hex code for each color', async () => {
      // Given ein FarbPresetPicker
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FarbPresetPicker value={KATEGORIE_FARB_PRESETS[0].hex} onChange={onChange} />);

      // When der Benutzer auf Gelb klickt (Index 2)
      const gelbButton = screen.getByLabelText('Gelb');
      await user.click(gelbButton);

      // Then wird onChange mit dem korrekten Hex-Code aufgerufen
      expect(onChange).toHaveBeenCalledWith('#eab308');
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label for each color', () => {
      // Given ein FarbPresetPicker
      render(<FarbPresetPicker {...defaultProps} />);

      // Then hat jeder Button ein aria-label
      expect(screen.getByLabelText('Blau')).toBeInTheDocument();
      expect(screen.getByLabelText('Rot')).toBeInTheDocument();
      expect(screen.getByLabelText('Grün')).toBeInTheDocument();
      expect(screen.getByLabelText('Gelb')).toBeInTheDocument();
      expect(screen.getByLabelText('Lila')).toBeInTheDocument();
      expect(screen.getByLabelText('Pink')).toBeInTheDocument();
      expect(screen.getByLabelText('Orange')).toBeInTheDocument();
      expect(screen.getByLabelText('Türkis')).toBeInTheDocument();
      expect(screen.getByLabelText('Grau')).toBeInTheDocument();
      expect(screen.getByLabelText('Indigo')).toBeInTheDocument();
    });

    it('should render each color with role="radio"', () => {
      // Given ein FarbPresetPicker
      render(<FarbPresetPicker {...defaultProps} />);

      // Then haben alle Buttons die radio-Rolle
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(10);
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      // Given ein FarbPresetPicker mit custom className
      const { container } = render(<FarbPresetPicker {...defaultProps} className="custom-class" />);

      // Then wird die custom className angewendet
      const radiogroup = container.querySelector('[role="radiogroup"]');
      expect(radiogroup).toHaveClass('custom-class');
    });
  });
});
