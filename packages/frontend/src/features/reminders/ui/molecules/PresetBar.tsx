import { cn } from '@/shared/ui/cn';
import { PiX } from 'react-icons/pi';

import { useFilterPresets, useActivePresetId, applyPreset, removePreset, isPresetActive } from '../../stores/filter-preset.store';
import type { FilterPresetType } from '../../stores/filter-preset.store';

/**
 * PresetBar Molecule (Story 8.9 Task 3)
 *
 * Horizontale Chip-Leiste mit gespeicherten Filter-Presets.
 * AC2: Klick auf Chip aktiviert Preset (setzt alle Filter)
 * AC3: X-Button auf Chip loescht Preset
 * AC5: Aktives Preset visuell hervorgehoben (Primary-Farbe/Ring)
 *
 * Rendert nichts wenn keine Presets vorhanden sind.
 */
export function PresetBar() {
  const presets = useFilterPresets();
  const activePresetId = useActivePresetId();

  // Leerer Zustand: Keine PresetBar rendern
  if (presets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto" role="toolbar" aria-label="Filter-Presets">
      {presets.map((preset) => (
        <PresetChip key={preset.id} preset={preset} isActive={activePresetId === preset.id && isPresetActive(preset)} onApply={() => applyPreset(preset)} onRemove={() => removePreset(preset.id)} />
      ))}
    </div>
  );
}

interface PresetChipProps {
  preset: FilterPresetType;
  isActive: boolean;
  onApply: () => void;
  onRemove: () => void;
}

function PresetChip({ preset, isActive, onApply, onRemove }: PresetChipProps) {
  return (
    <span
      className={cn(
        'group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        'cursor-pointer transition-all duration-150 select-none',
        isActive ? 'bg-action-primary text-text-inverse ring-2 ring-action-primary/50' : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
      )}
    >
      <button
        type="button"
        onClick={onApply}
        className="max-w-[150px] truncate focus:outline-none focus-visible:shadow-focus-ring"
        aria-label={`Preset "${preset.name}" aktivieren`}
        title={preset.name}
      >
        {preset.name}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          'text-current hover:bg-action-secondary',
          'focus:opacity-100 focus:outline-none focus-visible:shadow-focus-ring',
        )}
        aria-label={`Preset "${preset.name}" loeschen`}
      >
        <PiX className="h-3 w-3" />
      </button>
    </span>
  );
}
