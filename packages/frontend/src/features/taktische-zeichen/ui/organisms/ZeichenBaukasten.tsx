/**
 * ZeichenBaukasten — Geführter 4-Schritt-Editor für taktische Zeichen.
 *
 * Schritte: Grundzeichen → Organisation → Fachaufgabe → Einheit.
 * Live-Vorschau des entstehenden Zeichens.
 * Nach Erstellung: Prominenter Platzierungsmodus mit Abbruch-/Neustart-Option.
 */

import { useState } from 'react';
import type { EinheitId, FachaufgabeId, GrundzeichenId, OrganisationId } from 'taktische-zeichen-core';
import { PiCursorClick, PiArrowCounterClockwise, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';
import { GrundzeichenPicker } from '../atoms/GrundzeichenPicker';
import { OrganisationPicker } from '../atoms/OrganisationPicker';
import { FachaufgabePicker } from '../atoms/FachaufgabePicker';
import { EinheitPicker } from '../atoms/EinheitPicker';
import { BaukastenSchritt } from '../molecules/BaukastenSchritt';

const SCHRITTE = ['Grundzeichen', 'Organisation', 'Fachaufgabe', 'Einheit'] as const;
type Schritt = (typeof SCHRITTE)[number];

export interface ZeichenBaukastenProps {
  /** Wird aufgerufen wenn "Erstellen" geklickt wird */
  onErstelleZeichen: (definition: ZeichenDefinition, label?: string) => void;
  /** Ladezustand des Erstell-Vorgangs */
  isCreating?: boolean;
  /** Zeichen wartet auf Platzierung auf der Karte */
  isPendingPlacement?: boolean;
  /** Platzierung abbrechen */
  onCancelPlacement?: () => void;
}

const DEFAULT_GRUNDZEICHEN: GrundzeichenId = 'kraftfahrzeug-gelaendegaengig';

export function ZeichenBaukasten({ onErstelleZeichen, isCreating, isPendingPlacement, onCancelPlacement }: ZeichenBaukastenProps) {
  const [aktiverSchritt, setAktiverSchritt] = useState<number>(0);
  const [grundzeichen, setGrundzeichen] = useState<GrundzeichenId>(DEFAULT_GRUNDZEICHEN);
  const [organisation, setOrganisation] = useState<OrganisationId | undefined>(undefined);
  const [fachaufgabe, setFachaufgabe] = useState<FachaufgabeId | undefined>(undefined);
  const [einheit, setEinheit] = useState<EinheitId | undefined>(undefined);
  const [label, setLabel] = useState('');

  const aktuellDefinition: ZeichenDefinition = {
    grundzeichen,
    organisation,
    fachaufgabe,
    einheit,
  };

  const handleGrundzeichenChange = (id: GrundzeichenId) => {
    setGrundzeichen(id);
    setFachaufgabe(undefined);
    setEinheit(undefined);
  };

  const handleWeiter = () => {
    if (aktiverSchritt < SCHRITTE.length - 1) {
      setAktiverSchritt((s) => s + 1);
    }
  };

  const handleZurueck = () => {
    if (aktiverSchritt > 0) {
      setAktiverSchritt((s) => s - 1);
    }
  };

  const handleErstellen = () => {
    onErstelleZeichen(aktuellDefinition, label.trim() || undefined);
  };

  const resetBaukasten = () => {
    setAktiverSchritt(0);
    setGrundzeichen(DEFAULT_GRUNDZEICHEN);
    setOrganisation(undefined);
    setFachaufgabe(undefined);
    setEinheit(undefined);
    setLabel('');
  };

  const handleNeuBeginnen = () => {
    onCancelPlacement?.();
    resetBaukasten();
  };

  const istLetzterSchritt = aktiverSchritt === SCHRITTE.length - 1;

  // Platzierungsmodus: Zeichen wurde erstellt, wartet auf Karten-Klick
  if (isPendingPlacement) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-2">
        {/* Erfolgs-Vorschau */}
        <div className="relative">
          <div className="absolute -inset-3 animate-pulse rounded-full bg-action-primary/10" />
          <div className="relative rounded-xl border border-action-primary/20 bg-gradient-to-b from-action-primary/5 to-transparent p-5">
            <ZeichenPreview definition={aktuellDefinition} size="lg" />
          </div>
        </div>

        {/* Platzierungs-Hinweis */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-action-primary">
            <PiCursorClick className="h-5 w-5 animate-bounce" />
            <span className="text-sm font-semibold">Auf Karte klicken</span>
          </div>
          <p className="text-xs leading-relaxed text-text-muted">Klicke auf die gewünschte Position,{'\u00A0'}um das Zeichen zu platzieren.</p>
        </div>

        {/* Aktionen */}
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleNeuBeginnen}
            className="flex items-center justify-center gap-2 rounded-lg bg-action-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-primary-hover"
          >
            <PiArrowCounterClockwise className="h-4 w-4" />
            Neues Zeichen erstellen
          </button>
          <button
            type="button"
            onClick={onCancelPlacement}
            className="hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <PiX className="h-4 w-4" />
            Platzierung abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Live-Vorschau oben */}
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-surface-panel p-4">
        <span className="text-xs font-medium text-text-secondary">Vorschau</span>
        <ZeichenPreview definition={aktuellDefinition} size="md" />
      </div>

      {/* Schritt-Indikatoren */}
      <div className="flex items-center gap-1.5 px-1">
        {SCHRITTE.map((schritt, idx) => (
          <button key={schritt} type="button" onClick={() => setAktiverSchritt(idx)} className="flex flex-1 flex-col items-center gap-1">
            <div className={cn('h-1.5 w-full rounded-full transition-colors', idx < aktiverSchritt ? 'bg-green-500' : idx === aktiverSchritt ? 'bg-action-primary' : 'bg-border-subtle')} />
            <span className={cn('text-[9px] font-medium transition-colors', idx === aktiverSchritt ? 'text-action-primary' : 'text-text-muted')}>{schritt}</span>
          </button>
        ))}
      </div>

      {/* Aktiver Schritt */}
      <div className="flex-1 overflow-y-auto">
        {aktiverSchritt === 0 && (
          <BaukastenSchritt nummer={1} gesamtAnzahl={SCHRITTE.length} titel="Grundzeichen" beschreibung="Wähle den Zeichentyp (Fahrzeug, Formation, Stelle...)" istAbgeschlossen={aktiverSchritt > 0}>
            <GrundzeichenPicker value={grundzeichen} onChange={handleGrundzeichenChange} />
          </BaukastenSchritt>
        )}

        {aktiverSchritt === 1 && (
          <BaukastenSchritt nummer={2} gesamtAnzahl={SCHRITTE.length} titel="Organisation" beschreibung="Zu welcher Organisation gehört das Zeichen?" istAbgeschlossen={aktiverSchritt > 1}>
            <OrganisationPicker grundzeichen={grundzeichen} value={organisation} onChange={setOrganisation} />
          </BaukastenSchritt>
        )}

        {aktiverSchritt === 2 && (
          <BaukastenSchritt nummer={3} gesamtAnzahl={SCHRITTE.length} titel="Fachaufgabe" beschreibung="Welche Aufgabe hat diese Einheit/dieses Fahrzeug?" istAbgeschlossen={aktiverSchritt > 2}>
            <FachaufgabePicker grundzeichen={grundzeichen} organisation={organisation} value={fachaufgabe} onChange={setFachaufgabe} />
          </BaukastenSchritt>
        )}

        {aktiverSchritt === 3 && (
          <BaukastenSchritt nummer={4} gesamtAnzahl={SCHRITTE.length} titel="Einheitsgröße" beschreibung="Wie groß ist die taktische Einheit?">
            <div className="flex flex-col gap-4">
              <EinheitPicker grundzeichen={grundzeichen} organisation={organisation} fachaufgabe={fachaufgabe} value={einheit} onChange={setEinheit} />

              {/* Beschriftung */}
              <div className="flex flex-col gap-1">
                <label htmlFor="zeichen-label" className="text-xs font-medium text-text-secondary">
                  Beschriftung (optional)
                </label>
                <input
                  id="zeichen-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="z.B. ELW-1, 1. Zug..."
                  maxLength={200}
                  className="bg-surface-input rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-action-primary focus:outline-none"
                />
              </div>
            </div>
          </BaukastenSchritt>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 border-t border-border-subtle pt-3">
        {aktiverSchritt > 0 && (
          <button type="button" onClick={handleZurueck} className="hover:bg-surface-hover flex-1 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition-colors">
            Zurück
          </button>
        )}

        {!istLetzterSchritt ? (
          <button type="button" onClick={handleWeiter} className="flex-1 rounded-md bg-action-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-action-primary-hover">
            Weiter
          </button>
        ) : (
          <button
            type="button"
            onClick={handleErstellen}
            disabled={isCreating}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors',
              isCreating ? 'cursor-not-allowed bg-action-primary/50' : 'bg-action-primary hover:bg-action-primary-hover',
            )}
          >
            {isCreating ? 'Erstelle...' : 'Zeichen erstellen'}
          </button>
        )}
      </div>
    </div>
  );
}
