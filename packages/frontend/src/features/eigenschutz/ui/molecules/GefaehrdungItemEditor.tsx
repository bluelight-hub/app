/**
 * GefaehrdungItemEditor — Form-Block für ein einzelnes Gefährdungs-Item
 * (Story 2.2 Task 9, UX-Spec §830).
 *
 * Kontroliertes Eingabemolekül, das vom Parent-Organism pro Item gerendert
 * wird. Keine eigene Form-Bibliothek — der Parent sammelt die Items und
 * führt die Zod-Validierung vor dem Submit aus. Lokale States hier sind
 * auf UI-Belange beschränkt (Character-Counter, Progressive-Disclosure).
 *
 * Features:
 * - Tab-Order Titel → Beschreibung → 5×5-Matrix → Schutzmaßnahmen.
 * - Progressive-Disclosure: Schutzmaßnahmen-Textarea wird standardmäßig erst
 *   sichtbar, wenn die errechnete Risikoklasse `≠ GRUEN` ist oder der User
 *   das Feld explizit fokussiert (Fokus-Tab öffnet es für GRUEN-Items).
 * - Character-Counter: Ab 80 % von 2000 Zeichen (`≥ 1600`) sichtbar,
 *   `aria-live="polite"`. Überschreitung triggert `aria-invalid` +
 *   Inline-Fehler.
 * - Risiko-Badge unter der Matrix zeigt die aktuell errechnete Klasse.
 */

import { calculateRisikoklasse } from '@bluelight-hub/shared';
import { GEFAEHRDUNG_ITEM_LIMITS, type GefaehrdungItem, type Risikoklasse } from '@bluelight-hub/shared/schemas';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PiTrashLight } from 'react-icons/pi';
import { RiskMatrix5x5 } from '../organisms/RiskMatrix5x5';

export interface GefaehrdungItemEditorProps {
  readonly value: GefaehrdungItem;
  readonly onChange: (value: GefaehrdungItem) => void;
  readonly onRemove?: () => void;
  readonly disabled?: boolean;
  readonly autoFocusTitle?: boolean;
  readonly index?: number;
}

const COUNTER_THRESHOLD = Math.floor(GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax * 0.8);

const RISIKOKLASSE_BADGE_STYLES: Record<Risikoklasse, string> = {
  GRUEN: 'bg-green-100 text-green-900',
  GELB: 'bg-yellow-100 text-yellow-900',
  ORANGE: 'bg-orange-200 text-orange-900',
  ROT: 'bg-red-200 text-red-900',
};

const RISIKOKLASSE_LABELS: Record<Risikoklasse, string> = {
  GRUEN: 'Grün',
  GELB: 'Gelb',
  ORANGE: 'Orange',
  ROT: 'Rot',
};

export function GefaehrdungItemEditor({ value, onChange, onRemove, disabled = false, autoFocusTitle = false, index }: GefaehrdungItemEditorProps) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const matrixHeadingId = `${idPrefix}-matrix-heading`;
  const schutzmassnahmenId = `${idPrefix}-schutzmassnahmen`;
  const schutzmassnahmenHelpId = `${idPrefix}-schutzmassnahmen-help`;
  const schutzmassnahmenCounterId = `${idPrefix}-schutzmassnahmen-counter`;
  const schutzmassnahmenErrorId = `${idPrefix}-schutzmassnahmen-error`;

  // Schutzmaßnahmen-Sichtbarkeit: sichtbar bei ≠ GRUEN ODER wenn der User
  // das Feld fokussiert hat (einmaliger Unlock pro Item, kein Toggle).
  const [schutzmassnahmenRevealed, setSchutzmassnahmenRevealed] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (autoFocusTitle && titleRef.current) {
      titleRef.current.focus();
    }
  }, [autoFocusTitle]);

  const risikoklasse = useMemo<Risikoklasse | null>(() => {
    if (!value.eintritt || !value.schaden) return null;
    return calculateRisikoklasse(value.eintritt, value.schaden);
  }, [value.eintritt, value.schaden]);

  // AC1 Progressive-Disclosure: Schutzmaßnahmen-Pflicht bei GELB/ORANGE/ROT;
  // bei GRUEN optional. Solange noch keine Matrix-Zelle gewählt ist
  // (`risikoklasse === null`), bleibt das Feld bewusst verborgen — sonst
  // wäre die Pflicht-Disclosure-Semantik invertiert. Der Nutzer kann das
  // Feld jederzeit durch manuelles Tabben aktivieren (`revealed`-State).
  const schutzmassnahmenVisible = (risikoklasse !== null && risikoklasse !== 'GRUEN') || schutzmassnahmenRevealed || Boolean(value.schutzmassnahmen);

  const schutzmassnahmenText = value.schutzmassnahmen ?? '';
  const schutzmassnahmenLen = schutzmassnahmenText.length;
  const showCounter = schutzmassnahmenLen >= COUNTER_THRESHOLD;
  const tooLong = schutzmassnahmenLen > GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax;

  const titleTooLong = (value.title ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.titleMax;

  function update(patch: Partial<GefaehrdungItem>) {
    onChange({ ...value, ...patch });
  }

  return (
    <section
      aria-label={typeof index === 'number' ? `Gefährdung ${index + 1}` : 'Gefährdung'}
      className="space-y-4 rounded-panel border border-border-subtle bg-surface-panel p-4"
      data-testid="gefaehrdung-item-editor"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor={titleId} className="block text-sm font-medium text-text-primary">
            Titel <span className="text-status-danger-text">*</span>
          </label>
          <input
            id={titleId}
            ref={titleRef}
            type="text"
            value={value.title ?? ''}
            disabled={disabled}
            maxLength={GEFAEHRDUNG_ITEM_LIMITS.titleMax + 1}
            onChange={(event) => update({ title: event.target.value })}
            aria-required="true"
            aria-invalid={titleTooLong || undefined}
            className={cn(
              'block min-h-[2.75rem] w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary',
              'focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring',
              titleTooLong ? 'border-status-danger-border' : null,
            )}
            data-testid="gefaehrdung-item-title"
          />
        </div>
        {onRemove ? (
          <Button intent="danger" appearance="ghost" size="icon" type="button" onClick={onRemove} disabled={disabled} aria-label="Gefährdung entfernen" data-testid="gefaehrdung-item-remove">
            <PiTrashLight className="h-5 w-5" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor={descriptionId} className="block text-sm font-medium text-text-primary">
          Beschreibung
        </label>
        <textarea
          id={descriptionId}
          value={value.description ?? ''}
          disabled={disabled}
          maxLength={GEFAEHRDUNG_ITEM_LIMITS.descriptionMax + 1}
          rows={2}
          onChange={(event) => update({ description: event.target.value })}
          className="block w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring"
          data-testid="gefaehrdung-item-description"
        />
      </div>

      <fieldset className="space-y-2" aria-labelledby={matrixHeadingId}>
        <legend id={matrixHeadingId} className="text-sm font-medium text-text-primary">
          Risikobewertung
        </legend>
        <RiskMatrix5x5 value={{ eintritt: value.eintritt, schaden: value.schaden }} onChange={(next) => update(next)} disabled={disabled} aria-labelledby={matrixHeadingId} />
        {risikoklasse ? (
          <p className="text-xs text-text-secondary" data-testid="gefaehrdung-item-risiko-badge">
            Errechnete Risikoklasse:{' '}
            <span className={cn('ml-1 inline-block rounded-control px-2 py-0.5 text-xs font-semibold', RISIKOKLASSE_BADGE_STYLES[risikoklasse])}>{RISIKOKLASSE_LABELS[risikoklasse]}</span>
          </p>
        ) : (
          <p className="text-xs text-text-muted">Eintrittswahrscheinlichkeit und Schadensausmaß auswählen.</p>
        )}
      </fieldset>

      {schutzmassnahmenVisible ? (
        <div className="space-y-1" data-testid="gefaehrdung-item-schutzmassnahmen-wrapper">
          <label htmlFor={schutzmassnahmenId} className="block text-sm font-medium text-text-primary">
            Schutzmaßnahmen{risikoklasse && risikoklasse !== 'GRUEN' ? <span className="text-status-danger-text"> *</span> : null}
          </label>
          <textarea
            id={schutzmassnahmenId}
            value={schutzmassnahmenText}
            disabled={disabled}
            rows={3}
            onChange={(event) => update({ schutzmassnahmen: event.target.value })}
            aria-describedby={cn(schutzmassnahmenHelpId, showCounter ? schutzmassnahmenCounterId : null, tooLong ? schutzmassnahmenErrorId : null)}
            aria-invalid={tooLong || undefined}
            className={cn(
              'block w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary',
              'focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring',
              tooLong ? 'border-status-danger-border' : null,
            )}
            data-testid="gefaehrdung-item-schutzmassnahmen"
          />
          <p id={schutzmassnahmenHelpId} className="text-xs text-text-muted">
            Freitext — konkrete Schutzmaßnahmen für diese Gefährdung (z. B. PSA-Profil, Sicherungsabstand, Funkspruch-Regelung).
          </p>
          {showCounter ? (
            <p
              id={schutzmassnahmenCounterId}
              role="status"
              aria-live="polite"
              className={cn('text-xs', tooLong ? 'text-status-danger-text' : 'text-text-muted')}
              data-testid="gefaehrdung-item-schutzmassnahmen-counter"
            >
              {schutzmassnahmenLen} / {GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen
            </p>
          ) : null}
          {tooLong ? (
            <p id={schutzmassnahmenErrorId} role="alert" className="text-xs text-status-danger-text" data-testid="gefaehrdung-item-schutzmassnahmen-error">
              Schutzmaßnahmen dürfen maximal {GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen haben.
            </p>
          ) : null}
        </div>
      ) : (
        // Auch ohne sichtbares Feld bleibt der Fokus-Tab erreichbar —
        // ein fokussierbarer „Schutzmaßnahmen anzeigen"-Opener öffnet das
        // Feld. Das erfüllt die Progressive-Disclosure-Anforderung ohne
        // dem User das Feld komplett aus der Tab-Order zu nehmen.
        <button
          type="button"
          onFocus={() => setSchutzmassnahmenRevealed(true)}
          onClick={() => setSchutzmassnahmenRevealed(true)}
          className="text-left text-xs font-medium text-action-primary underline underline-offset-2 focus:outline-none focus-visible:shadow-focus-ring"
          data-testid="gefaehrdung-item-schutzmassnahmen-opener"
        >
          Schutzmaßnahmen ergänzen (optional für GRÜN-Items)
        </button>
      )}
    </section>
  );
}
