/**
 * ZeichenEditor — Inline-Editor für eine taktische ZeichenDefinition.
 *
 * Zeigt alle Picker-Atoms (Grundzeichen, Organisation, Fachaufgabe, Einheit)
 * in einem kompakten, scrollbaren Panel mit Live-Vorschau.
 *
 * Wird zur Kräfte-Verknüpfung eingesetzt: Startet mit einer vorausgefüllten
 * Definition (abgeleitet aus Einheit/Fahrzeug via useZeichenFromEntity),
 * lässt den Nutzer alle Felder anpassen und gibt die finale Definition zurück.
 */

import type * as React from 'react';
import { useState } from 'react';
import type { EinheitId, FachaufgabeId, GrundzeichenId, OrganisationId } from 'taktische-zeichen-core';
import { cn } from '@/shared/ui/cn';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';
import { GrundzeichenPicker } from '../atoms/GrundzeichenPicker';
import { OrganisationPicker } from '../atoms/OrganisationPicker';
import { FachaufgabePicker } from '../atoms/FachaufgabePicker';
import { EinheitPicker } from '../atoms/EinheitPicker';

/** Props für den ZeichenEditor */
export interface ZeichenEditorProps {
  /** Vorausgefüllte Definition (z.B. aus useZeichenFromEntity) */
  initialDefinition: ZeichenDefinition;
  /** Vorgeschlagenes Label (Name der Einheit / Funkrufname) */
  initialLabel?: string;
  /** Callback wenn "Übernehmen" geklickt wird */
  onSave: (definition: ZeichenDefinition, label: string) => void;
  /** Ladezustand des Save-Vorgangs */
  isSaving?: boolean;
  /** Optionaler Abbrechen-Handler */
  onCancel?: () => void;
  /** CSS-Klassen für den äußeren Container */
  className?: string;
}

/** Abschnitt-Titel im Editor */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">{children}</h3>;
}

/**
 * Inline-Editor für eine ZeichenDefinition mit Live-Vorschau.
 *
 * @example
 * ```tsx
 * const { definition, suggestedLabel } = useZeichenFromEinheit(einheit);
 *
 * <ZeichenEditor
 *   initialDefinition={definition}
 *   initialLabel={suggestedLabel}
 *   onSave={(def, label) => createZeichen({ zeichenDefinition: def, label })}
 * />
 * ```
 */
export function ZeichenEditor({ initialDefinition, initialLabel = '', onSave, isSaving = false, onCancel, className }: ZeichenEditorProps) {
  const [grundzeichen, setGrundzeichen] = useState<GrundzeichenId>(initialDefinition.grundzeichen ?? 'kraftfahrzeug-gelaendegaengig');
  const [organisation, setOrganisation] = useState<OrganisationId | undefined>(initialDefinition.organisation);
  const [fachaufgabe, setFachaufgabe] = useState<FachaufgabeId | undefined>(initialDefinition.fachaufgabe);
  const [einheit, setEinheit] = useState<EinheitId | undefined>(initialDefinition.einheit);
  const [label, setLabel] = useState(initialLabel);

  const aktuelleDefinition: ZeichenDefinition = {
    grundzeichen,
    organisation,
    fachaufgabe,
    einheit,
  };

  const handleGrundzeichenChange = (id: GrundzeichenId) => {
    setGrundzeichen(id);
    // Fachaufgabe und Einheit zurücksetzen — nicht alle Grundzeichen unterstützen alle Optionen
    setFachaufgabe(undefined);
    setEinheit(undefined);
  };

  const handleSave = () => {
    onSave(aktuelleDefinition, label);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Live-Vorschau */}
      <div className="bg-surface-base flex items-center justify-center rounded-lg border border-border-subtle p-4">
        <ZeichenPreview definition={aktuelleDefinition} size="lg" />
      </div>

      {/* Beschriftung */}
      <div>
        <SectionTitle>Beschriftung</SectionTitle>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optionale Beschriftung (z.B. ELW-1)"
          className="bg-surface-base w-full rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
        />
      </div>

      {/* Grundzeichen-Picker */}
      <div>
        <SectionTitle>Grundzeichen</SectionTitle>
        <GrundzeichenPicker value={grundzeichen} onChange={handleGrundzeichenChange} />
      </div>

      {/* Organisation-Picker */}
      <div>
        <SectionTitle>Organisation</SectionTitle>
        <OrganisationPicker grundzeichen={grundzeichen} value={organisation} onChange={setOrganisation} />
      </div>

      {/* Fachaufgabe-Picker */}
      <div>
        <SectionTitle>Fachaufgabe</SectionTitle>
        <FachaufgabePicker grundzeichen={grundzeichen} value={fachaufgabe} onChange={setFachaufgabe} />
      </div>

      {/* Einheit-Picker */}
      <div>
        <SectionTitle>Einheitsgröße</SectionTitle>
        <EinheitPicker grundzeichen={grundzeichen} organisation={organisation} fachaufgabe={fachaufgabe} value={einheit} onChange={setEinheit} />
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 rounded-md border border-border-subtle px-4 py-2 text-sm text-text-primary transition-colors hover:bg-action-secondary disabled:opacity-50"
          >
            Abbrechen
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-primary/90 focus-visible:shadow-focus-ring focus-visible:outline-none disabled:opacity-50',
            onCancel ? 'flex-1' : 'w-full',
          )}
        >
          {isSaving ? 'Wird gespeichert…' : 'Übernehmen'}
        </button>
      </div>
    </div>
  );
}
