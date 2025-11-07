import { Input } from '@atoms/input.atom';
import { Textarea } from '@atoms/textarea.atom';
import { Label } from '@atoms/label.atom';
import { ColorPicker } from '@molecules/form/ColorPicker.molecule';
import { RangeSlider } from '@molecules/form/RangeSlider.molecule';

export interface PropertyPanelContentProps {
  /** Aktuelles Label */
  label: string;
  /** Aktuelle Farbe */
  color: string;
  /** Aktuelle Linienstärke */
  strokeWidth: number;
  /** Aktuelle Transparenz */
  fillOpacity: number;
  /** Aktuelle Beschreibung */
  description: string;
  /** Callbacks für Property-Änderungen */
  onChange: {
    label: (value: string) => void;
    color: (value: string) => void;
    strokeWidth: (value: number) => void;
    fillOpacity: (value: number) => void;
    description: (value: string) => void;
  };
  /** ID-Suffix für eindeutige IDs (z.B. "desktop" oder "mobile") */
  idSuffix: string;
}

/**
 * PropertyPanelContent - Shared Form Content
 *
 * Wiederverwendbare Form-Felder für Desktop und Mobile PropertyPanel.
 * Verwendet Atom- und Molecule-Komponenten für konsistentes Design.
 *
 * @param label - Aktuelles Label
 * @param color - Aktuelle Farbe
 * @param strokeWidth - Aktuelle Linienstärke
 * @param fillOpacity - Aktuelle Transparenz
 * @param description - Aktuelle Beschreibung
 * @param onChange - Callbacks für alle Property-Änderungen
 * @param idSuffix - Suffix für eindeutige Element-IDs
 */
export const PropertyPanelContent: React.FC<PropertyPanelContentProps> = ({ label, color, strokeWidth, fillOpacity, description, onChange, idSuffix }) => {
  return (
    <div className="space-y-4">
      {/* Label Input */}
      <div>
        <Label htmlFor={`shape-label-${idSuffix}`}>Label</Label>
        <Input id={`shape-label-${idSuffix}`} type="text" value={label} onChange={(e) => onChange.label(e.target.value)} placeholder="Beschriftung hinzufügen..." fullWidth />
      </div>

      {/* Color Picker */}
      <ColorPicker id={`shape-color-${idSuffix}`} label="Farbe" value={color} onChange={onChange.color} />

      {/* Stroke Width Slider */}
      <RangeSlider id={`shape-stroke-width-${idSuffix}`} label="Linienstärke: {value}px" value={strokeWidth} min={1} max={10} onChange={onChange.strokeWidth} />

      {/* Fill Opacity Slider */}
      <RangeSlider
        id={`shape-fill-opacity-${idSuffix}`}
        label="Transparenz"
        value={fillOpacity}
        min={0}
        max={1}
        step={0.1}
        formatValue={(val) => `${Math.round(val * 100)}%`}
        onChange={onChange.fillOpacity}
      />

      {/* Description Textarea */}
      <div>
        <Label htmlFor={`shape-description-${idSuffix}`}>Beschreibung</Label>
        <Textarea id={`shape-description-${idSuffix}`} value={description} onChange={(e) => onChange.description(e.target.value)} rows={3} placeholder="Beschreibung hinzufügen..." fullWidth />
      </div>
    </div>
  );
};
