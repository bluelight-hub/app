/**
 * ZeichenDetailContent - Inhalt des Zeichen-Detail-Panels
 *
 * 6 Sektionen: Vorschau, Label/Notiz (editierbar), Komposition, Position, Metadaten, Aktionen.
 * Visueller Stil konsistent mit DwdPanelContent / NinaPanelContent.
 */

import { useEffect, useState } from 'react';
import { PiClock, PiMapPin, PiNotePencil, PiPuzzlePiece, PiTrash } from 'react-icons/pi';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { ZeichenPreview } from '@/features/taktische-zeichen';
import type { ZeichenDefinition } from '@/features/taktische-zeichen';
import { Button } from '@/shared/ui/atoms/button.atom';

/** Labels für die Kompositions-Felder */
const KOMPOSITION_LABELS: { key: keyof TaktischesZeichenResponseDto['zeichenDefinition']; label: string }[] = [
  { key: 'grundzeichen', label: 'Grundzeichen' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'fachaufgabe', label: 'Fachaufgabe' },
  { key: 'einheit', label: 'Einheit' },
  { key: 'verwaltungsstufe', label: 'Verwaltungsstufe' },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface ZeichenDetailContentProps {
  zeichen: TaktischesZeichenResponseDto;
  onUpdateLabel: (label: string) => void;
  onUpdateNotiz: (notiz: string) => void;
  onRemove: () => void;
  isRemoving: boolean;
}

export function ZeichenDetailContent({ zeichen, onUpdateLabel, onUpdateNotiz, onRemove, isRemoving }: ZeichenDetailContentProps) {
  // Lokaler State für sofortige Input-Reaktion + Debounce
  const [label, setLabel] = useState(zeichen.label ?? '');
  const [notiz, setNotiz] = useState(zeichen.notiz ?? '');

  // Sync wenn sich das Zeichen extern ändert (z.B. nach Mutation-Response)
  useEffect(() => {
    setLabel(zeichen.label ?? '');
  }, [zeichen.label]);

  useEffect(() => {
    setNotiz(zeichen.notiz ?? '');
  }, [zeichen.notiz]);

  // Debounced Save für Label
  useEffect(() => {
    if (label === (zeichen.label ?? '')) return;
    const timer = setTimeout(() => onUpdateLabel(label), 500);
    return () => clearTimeout(timer);
  }, [label, zeichen.label, onUpdateLabel]);

  // Debounced Save für Notiz
  useEffect(() => {
    if (notiz === (zeichen.notiz ?? '')) return;
    const timer = setTimeout(() => onUpdateNotiz(notiz), 500);
    return () => clearTimeout(timer);
  }, [notiz, zeichen.notiz, onUpdateNotiz]);

  const definition: ZeichenDefinition = zeichen.zeichenDefinition;

  return (
    <div className="space-y-0">
      {/* 1. Zeichen-Vorschau */}
      <div className="flex flex-col items-center pb-4">
        <ZeichenPreview definition={definition} size="lg" />
        <h3 className="mt-2 text-base font-semibold text-text-primary">{zeichen.label || definition.grundzeichen}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{[definition.grundzeichen, definition.organisation, definition.fachaufgabe].filter(Boolean).join(' · ')}</p>
      </div>

      {/* 2. Label & Notiz (editierbar) */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiNotePencil className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Label & Notiz</h4>
          </div>
          <div className="mt-2 space-y-2">
            <div>
              <label htmlFor="zeichen-label" className="text-xs text-text-muted">
                Label
              </label>
              <input
                id="zeichen-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Bezeichnung eingeben..."
                className="mt-0.5 w-full rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="zeichen-notiz" className="text-xs text-text-muted">
                Notiz
              </label>
              <textarea
                id="zeichen-notiz"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Notiz hinzufügen..."
                rows={3}
                className="mt-0.5 w-full resize-y rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Zeichen-Komposition */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiPuzzlePiece className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Zeichen-Komposition</h4>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {KOMPOSITION_LABELS.map(({ key, label: fieldLabel }) => {
              const value = definition[key];
              if (!value) return null;
              return (
                <span key={key} className="inline-flex items-center rounded-full border border-border-subtle bg-surface-raised px-2.5 py-0.5 text-body-xs text-text-secondary">
                  <span className="mr-1 text-text-muted">{fieldLabel}:</span>
                  {value}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Position */}
      {zeichen.istPlatziert && zeichen.lat != null && zeichen.lng != null && (
        <section className="space-y-3.5 border-t border-border-subtle pt-3">
          <div>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Position</h4>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
              <div>
                <span className="text-xs text-text-muted">Lat: </span>
                {zeichen.lat.toFixed(5)}°
              </div>
              <div>
                <span className="text-xs text-text-muted">Lng: </span>
                {zeichen.lng.toFixed(5)}°
              </div>
            </div>
            {zeichen.mgrs && (
              <div className="mt-1 text-sm text-text-primary">
                <span className="text-xs text-text-muted">MGRS: </span>
                <span className="font-mono">{zeichen.mgrs}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Metadaten */}
      <section className="space-y-3.5 border-t border-border-subtle pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PiClock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Metadaten</h4>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-text-muted">
            <p>
              Erstellt von <span className="text-text-secondary">{zeichen.createdBy}</span> · {formatDateTime(zeichen.createdAt)}
            </p>
            {zeichen.updatedBy && (
              <p>
                Geändert von <span className="text-text-secondary">{zeichen.updatedBy}</span> · {formatDateTime(zeichen.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 6. Aktionen */}
      <section className="border-t border-border-subtle pt-3">
        <Button intent="danger" size="sm" className="w-full" onClick={onRemove} loading={isRemoving} disabled={isRemoving}>
          <PiTrash className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Von Karte entfernen
        </Button>
      </section>
    </div>
  );
}
