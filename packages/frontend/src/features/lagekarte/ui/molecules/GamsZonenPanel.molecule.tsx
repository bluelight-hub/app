/**
 * GamsZonenPanel — Konfigurationspanel für GAMS-Gefahrenzonen-Radien
 *
 * Erscheint als Popup nach Klick auf die Karte im GAMS-Modus.
 * Erlaubt die Anpassung der 4 Zonen-Radien vor der Platzierung.
 */

import { useState } from 'react';
import { GAMS_DEFAULT_RADIEN, GAMS_ZONEN_FARBEN, GAMS_ZONEN_NAMEN } from '../../drawing/types';

interface GamsZonenPanelProps {
  /** Bestätigt die Platzierung mit den eingegebenen Radien */
  onConfirm: (radien: [number, number, number, number]) => void;
  /** Bricht die Platzierung ab */
  onCancel: () => void;
}

export function GamsZonenPanel({ onConfirm, onCancel }: GamsZonenPanelProps) {
  const [radien, setRadien] = useState<[number, number, number, number]>([...GAMS_DEFAULT_RADIEN]);

  const updateRadius = (index: number, value: number) => {
    setRadien((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[index] = Math.max(0, value);
      return next;
    });
  };

  return (
    <div className="flex w-64 flex-col gap-3 p-1">
      <p className="text-sm font-medium text-text-primary">GAMS-Gefahrenzonen</p>

      {GAMS_ZONEN_NAMEN.map((name, i) => (
        <label key={name} className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: GAMS_ZONEN_FARBEN[i] }} />
          <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{name}</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              step={10}
              value={radien[i]}
              onChange={(e) => updateRadius(i, Number(e.target.value))}
              className="bg-surface-secondary w-16 rounded border border-border-subtle px-1.5 py-0.5 text-right text-xs text-text-primary tabular-nums focus:border-action-primary focus:outline-none"
            />
            <span className="text-xs text-text-muted">m</span>
          </div>
        </label>
      ))}

      <div className="flex justify-end gap-2 border-t border-border-subtle pt-2">
        <button type="button" onClick={onCancel} className="rounded px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary">
          Abbrechen
        </button>
        <button type="button" onClick={() => onConfirm(radien)} className="rounded bg-action-primary px-2.5 py-1 text-xs text-white transition-colors hover:bg-action-primary/90">
          Platzieren
        </button>
      </div>
    </div>
  );
}
