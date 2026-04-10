/**
 * Unit Tests für DrawStylePanel Molecule
 *
 * Verifiziert den Stil-Editor für Zeichnungsobjekte:
 * - Farbauswahl (Swatches)
 * - Linienstärke-Buttons
 * - Füllung Toggle + Deckkraft-Slider
 * - Schraffur-Muster + Anpassungs-Disclosure
 * - Messanzeige
 * - Label-Bearbeitung
 * - Read-Only-Modus
 * - Sichtbarkeits-Steuerung (isVisible)
 * - Geometrie-abhängige Steuerung (Point vs. Polygon)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawStylePanel, type DrawStylePanelProps } from '../DrawStylePanel.molecule';
import type { DrawingStyle } from '../../../drawing/types';

function createDefaultStyle(): DrawingStyle {
  return {
    color: '#3b82f6',
    opacity: 1,
    strokeWidth: 2,
    fillColor: '#3b82f6',
    fillEnabled: true,
    fillOpacity: 0.2,
    hatch: { type: 'none', spacing: 12, width: 1.5, color: '' },
  };
}

function createDefaultProps(overrides?: Partial<DrawStylePanelProps>): DrawStylePanelProps {
  return {
    style: createDefaultStyle(),
    onStyleChange: vi.fn(),
    isVisible: true,
    ...overrides,
  };
}

describe('DrawStylePanel', () => {
  describe('Sichtbarkeit', () => {
    it('sollte nichts rendern wenn isVisible=false', () => {
      const { container } = render(<DrawStylePanel {...createDefaultProps({ isVisible: false })} />);
      expect(container.firstChild).toBeNull();
    });

    it('sollte rendern wenn isVisible=true', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByText('Farbe')).toBeInTheDocument();
    });
  });

  describe('Farbauswahl', () => {
    it('sollte alle Farbswatches rendern', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByLabelText('Rot')).toBeInTheDocument();
      expect(screen.getByLabelText('Orange')).toBeInTheDocument();
      expect(screen.getByLabelText('Gelb')).toBeInTheDocument();
      expect(screen.getByLabelText('Grün')).toBeInTheDocument();
      expect(screen.getByLabelText('Blau')).toBeInTheDocument();
      expect(screen.getByLabelText('Lila')).toBeInTheDocument();
      expect(screen.getByLabelText('Pink')).toBeInTheDocument();
      expect(screen.getByLabelText('Dunkel')).toBeInTheDocument();
    });

    it('sollte bei Klick auf Farbe onStyleChange aufrufen', async () => {
      const onStyleChange = vi.fn();
      render(<DrawStylePanel {...createDefaultProps({ onStyleChange })} />);

      await userEvent.click(screen.getByLabelText('Rot'));

      expect(onStyleChange).toHaveBeenCalledWith({ color: '#ef4444', fillColor: '#ef4444' });
    });
  });

  describe('Linienstärke', () => {
    it('sollte alle Stärke-Optionen rendern', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByText('Dünn')).toBeInTheDocument();
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('Dick')).toBeInTheDocument();
    });

    it('sollte bei Klick auf Stärke onStyleChange aufrufen', async () => {
      const onStyleChange = vi.fn();
      render(<DrawStylePanel {...createDefaultProps({ onStyleChange })} />);

      await userEvent.click(screen.getByText('Dick'));

      expect(onStyleChange).toHaveBeenCalledWith({ strokeWidth: 4 });
    });

    it('sollte Linienstärke bei Point-Geometrie ausblenden', () => {
      render(<DrawStylePanel {...createDefaultProps({ geometryType: 'Point' })} />);
      expect(screen.queryByText('Dünn')).not.toBeInTheDocument();
      expect(screen.queryByText('Linienstärke')).not.toBeInTheDocument();
    });
  });

  describe('Füllung', () => {
    it('sollte Füll-Checkbox rendern', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByText('Füllung')).toBeInTheDocument();
    });

    it('sollte Deckkraft-Slider rendern wenn Füllung aktiv', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByLabelText('Füll-Deckkraft')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('sollte Deckkraft-Slider ausblenden wenn Füllung deaktiviert', () => {
      const style = createDefaultStyle();
      style.fillEnabled = false;
      render(<DrawStylePanel {...createDefaultProps({ style })} />);
      expect(screen.queryByLabelText('Füll-Deckkraft')).not.toBeInTheDocument();
    });

    it('sollte bei Toggle onStyleChange mit fillEnabled aufrufen', async () => {
      const onStyleChange = vi.fn();
      render(<DrawStylePanel {...createDefaultProps({ onStyleChange })} />);

      const checkbox = screen.getByRole('checkbox', { name: /Füllung/i });
      await userEvent.click(checkbox);

      expect(onStyleChange).toHaveBeenCalledWith({ fillEnabled: false });
    });

    it('sollte Füllung bei Point-Geometrie ausblenden', () => {
      render(<DrawStylePanel {...createDefaultProps({ geometryType: 'Point' })} />);
      expect(screen.queryByText('Füllung')).not.toBeInTheDocument();
    });
  });

  describe('Schraffur', () => {
    it('sollte Schraffur-Optionen rendern', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.getByText('Schraffur')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur: Keine')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur: Diagonal')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur: Kreuz')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur: Horizontal')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur: Vertikal')).toBeInTheDocument();
    });

    it('sollte bei Klick auf Schraffur-Muster onStyleChange aufrufen', async () => {
      const onStyleChange = vi.fn();
      render(<DrawStylePanel {...createDefaultProps({ onStyleChange })} />);

      await userEvent.click(screen.getByLabelText('Schraffur: Diagonal'));

      expect(onStyleChange).toHaveBeenCalledWith({
        hatch: expect.objectContaining({ type: 'diagonal' }),
      });
    });

    it('sollte "Anpassen..."-Button bei aktivem Schraffurmuster zeigen', () => {
      const style = createDefaultStyle();
      style.hatch = { type: 'diagonal', spacing: 12, width: 1.5, color: '' };
      render(<DrawStylePanel {...createDefaultProps({ style })} />);

      expect(screen.getByText('Anpassen…')).toBeInTheDocument();
    });

    it('sollte "Anpassen..."-Button bei keinem Schraffurmuster verbergen', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.queryByText('Anpassen…')).not.toBeInTheDocument();
    });

    it('sollte erweiterte Schraffur-Optionen bei Klick auf "Anpassen..." zeigen', async () => {
      const style = createDefaultStyle();
      style.hatch = { type: 'diagonal', spacing: 12, width: 1.5, color: '' };
      render(<DrawStylePanel {...createDefaultProps({ style })} />);

      await userEvent.click(screen.getByText('Anpassen…'));

      expect(screen.getByText('Abstand')).toBeInTheDocument();
      expect(screen.getByText('Stärke')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur-Abstand')).toBeInTheDocument();
      expect(screen.getByLabelText('Schraffur-Strichstärke')).toBeInTheDocument();
    });

    it('sollte bei Schraffurfarbe "Auto" Checkbox zeigen', async () => {
      const style = createDefaultStyle();
      style.hatch = { type: 'diagonal', spacing: 12, width: 1.5, color: '' };
      render(<DrawStylePanel {...createDefaultProps({ style })} />);

      await userEvent.click(screen.getByText('Anpassen…'));

      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('sollte Schraffur-Farbswatches bei manueller Farbe zeigen', async () => {
      const style = createDefaultStyle();
      style.hatch = { type: 'diagonal', spacing: 12, width: 1.5, color: '#ef4444' };
      render(<DrawStylePanel {...createDefaultProps({ style })} />);

      await userEvent.click(screen.getByText('Anpassen…'));

      expect(screen.getByLabelText('Schraffurfarbe: Rot')).toBeInTheDocument();
    });
  });

  describe('Messanzeige', () => {
    it('sollte Messung anzeigen wenn vorhanden', () => {
      render(
        <DrawStylePanel
          {...createDefaultProps({
            measurement: { label: '1.234 m²', area: 1234, length: 0 },
          })}
        />,
      );

      expect(screen.getByText('1.234 m²')).toBeInTheDocument();
    });

    it('sollte keine Messung anzeigen wenn nicht vorhanden', () => {
      render(<DrawStylePanel {...createDefaultProps()} />);
      expect(screen.queryByText(/m²/)).not.toBeInTheDocument();
    });
  });

  describe('Label-Bearbeitung', () => {
    it('sollte Beschriftungs-Eingabe rendern wenn Label vorhanden', () => {
      render(
        <DrawStylePanel
          {...createDefaultProps({
            label: 'Test',
            onLabelChange: vi.fn(),
          })}
        />,
      );

      expect(screen.getByText('Beschriftung')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    it('sollte bei Label-Änderung onLabelChange aufrufen', async () => {
      const onLabelChange = vi.fn();
      render(
        <DrawStylePanel
          {...createDefaultProps({
            label: '',
            onLabelChange,
          })}
        />,
      );

      await userEvent.type(screen.getByPlaceholderText('Text eingeben...'), 'Hallo');

      expect(onLabelChange).toHaveBeenCalled();
    });
  });

  describe('Read-Only-Modus', () => {
    it('sollte Bearbeitungs-Bereiche ausblenden', () => {
      render(<DrawStylePanel {...createDefaultProps({ readOnly: true })} />);

      expect(screen.getByText('Gesperrt — nur Ansicht')).toBeInTheDocument();
      expect(screen.queryByText('Farbe')).not.toBeInTheDocument();
      expect(screen.queryByText('Linienstärke')).not.toBeInTheDocument();
      expect(screen.queryByText('Füllung')).not.toBeInTheDocument();
    });

    it('sollte Messung trotzdem anzeigen', () => {
      render(
        <DrawStylePanel
          {...createDefaultProps({
            readOnly: true,
            measurement: { label: '500 m', area: 0, length: 500 },
          })}
        />,
      );

      expect(screen.getByText('500 m')).toBeInTheDocument();
    });
  });
});
