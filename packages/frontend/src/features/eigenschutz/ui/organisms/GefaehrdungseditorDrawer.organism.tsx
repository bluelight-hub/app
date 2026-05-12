/**
 * GefaehrdungseditorDrawer — Drawer-Organism für das Anlegen einer
 * Gefährdungsbeurteilung (Story 2.1 Task 8, AC1–AC6, AC10).
 *
 * Feature-Scope:
 * - 5 Seed-Vorlagen-Kacheln + 1 „Leeres Formular"-Kachel als Radio-Gruppe
 *   (AC1, UX-DR13).
 * - Einheit-Select + optionales Gefahrenzone-Select (AC2–AC4).
 * - Inline-Fehlermeldungen gemäß UX-DR21 Zero-Toast-Policy (AC6); dabei
 *   werden Backend-Sentinel-Codes (`BusinessRule:EinheitHatBereits…`,
 *   `NotFound:Einheit`/`Vorlage`) in benutzerfreundliche Texte übersetzt.
 * - 403-Responses werden defensiv inline angezeigt, ohne daraus
 *   clientseitige Freigabe-Logik abzuleiten.
 *
 * Formular-Architektur (AC2–AC4):
 * - Alle 4 Felder (`modus`, `vorlageId`, `einheitId`, `gefahrenzoneId`)
 *   sind TanStack-Form-Fields. `modus` + `vorlageId` werden zwar indirekt
 *   via Card-Klick gesetzt (`field.handleChange`), aber sie leben im
 *   Form-State — nicht in lokalem `useState`. Das macht das Shared
 *   Zod-Schema `createGefaehrdungsbeurteilungFormSchema` effektiv
 *   (inkl. `superRefine`: Seed → `vorlageId` Pflicht, Leer → `vorlageId` leer).
 * - `zodValidator()`-Adapter ist am Formular registriert; die Validation
 *   selbst läuft im `onSubmit`-Handler via `safeParse`, damit wir bei
 *   invalidem State die UX-DR21-Inline-Meldung rendern können statt
 *   TanStack-Defaults (siehe Inline-Kommentar am `useForm`-Aufruf).
 * - Backend-Sentinel-Fehler kommen separat über `inlineError`.
 *
 * Gotchas:
 * - Der `role="radiogroup"`-Wrapper um die Cards ist Pflicht (A11y) —
 *   `SeedTemplateEntryCard` liefert `role="radio"`, aber ohne Gruppe
 *   sieht Screenreader-UX sie als verwaist an.
 * - Esc und Backdrop-Klick werden vom `Dialog.SlideIn`-Primitive
 *   behandelt; wir resetten dabei die Form, damit das nächste Öffnen
 *   keinen stale State zeigt.
 */

import { useCreateGefaehrdungsbeurteilung, useGefaehrdungsbeurteilungVorlagen } from '@/features/eigenschutz/api/queries';
import { resolveSzenarioMeta } from '@/features/eigenschutz/constants/seed-szenarien.constants';
import {
  createGefaehrdungsbeurteilungFormSchema,
  type CreateGefaehrdungsbeurteilungFormValues,
  type CreateGefaehrdungsbeurteilungInput,
} from '@/features/eigenschutz/schemas/gefaehrdungsbeurteilung.schema';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { api } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SeedTemplateEntryCard } from '../molecules/SeedTemplateEntryCard';

export interface GefaehrdungseditorDrawerProps {
  readonly einsatzId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (beurteilungId: string) => void;
}

interface GefahrenzoneOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Query-Hook für die Gefahrenzonen eines Einsatzes (nur im Drawer genutzt,
 * deshalb inline-definiert). Bei 403 oder leerer Liste rendert das Select
 * einen deaktivierten Hinweis.
 *
 * **Response-Shape-Hinweis:** Das generierte DTO
 * (`GefahrenzoneControllerListVAlpha200Response`) liefert `{ data: Array<…> }`
 * mit Entries, deren Bezeichnungs-Feld zwischen `name`, `label` und
 * `bezeichnung` variiert (Matrix-Zellen-/Zonen-Unterschied). Wir spielen
 * defensiv alle drei Varianten durch und fallen im Notfall auf die `id`
 * zurück — eine Anpassung an die finale Story-2.X-Shape ist trivial,
 * sobald die Liste fachlich konsolidiert ist.
 */
function useGefahrenzonenFuerEinsatz(einsatzId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['eigenschutz', einsatzId, 'gefahrenzonen'] as const,
    queryFn: async (): Promise<GefahrenzoneOption[]> => {
      const response = await api.gefahrenzonen().gefahrenzoneControllerListVAlpha({ einsatzId });
      const items = (response as unknown as { data?: unknown }).data;
      if (!Array.isArray(items)) {
        return [];
      }
      return items
        .map((raw): GefahrenzoneOption | null => {
          const obj = raw as { id?: unknown; name?: unknown; label?: unknown; bezeichnung?: unknown };
          if (typeof obj.id !== 'string') return null;
          const label = typeof obj.name === 'string' ? obj.name : typeof obj.label === 'string' ? obj.label : typeof obj.bezeichnung === 'string' ? obj.bezeichnung : obj.id;
          return { id: obj.id, label };
        })
        .filter((entry): entry is GefahrenzoneOption => entry !== null);
    },
    enabled: enabled && Boolean(einsatzId),
    meta: { silentError: true },
    retry: false,
  });
}

/**
 * Übersetzt Backend-Fehler in den Inline-Meldungstext des Drawers.
 *
 * **Sentinel-Mapping (UX-DR21):**
 * - `BusinessRule:EinheitHatBereitsBeurteilung` (422) → Duplikat-Hinweis.
 * - `NotFound:Einheit` (404) → Einheit-Lookup fehlgeschlagen.
 * - `NotFound:Vorlage` (404) → Vorlage nicht mehr aktiv.
 * - 403 → Zugriff nicht freigegeben.
 * - 500 / Unbekannt → generischer Fehlertext.
 */
async function mapMutationError(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'Unbekannter Fehler beim Anlegen der Beurteilung.';
  }
  const response = (error as { response?: Response }).response;
  const status = response?.status;
  let code: string | undefined;
  let message: string | undefined;
  if (response && typeof response.clone === 'function') {
    try {
      const body = (await response.clone().json()) as { code?: unknown; message?: unknown };
      code = typeof body.code === 'string' ? body.code : undefined;
      message = typeof body.message === 'string' ? body.message : undefined;
    } catch {
      // Body nicht parsebar → Fallback auf Status-Mapping.
    }
  }
  if (status === 403) {
    return 'Dieser Bereich ist für den aktuellen Einsatz oder Nutzer nicht freigegeben.';
  }
  if (code === 'BusinessRule:EinheitHatBereitsBeurteilung' || (status === 422 && message?.toLowerCase().includes('bereits'))) {
    return 'Einheit hat bereits eine Beurteilung.';
  }
  if (code === 'NotFound:Einheit') {
    return 'Ausgewählte Einheit wurde nicht gefunden. Bitte Liste aktualisieren und neu wählen.';
  }
  if (code === 'NotFound:Vorlage') {
    return 'Ausgewählte Vorlage ist nicht mehr aktiv. Bitte eine andere Option wählen.';
  }
  if (status === 500) {
    return 'Serverfehler beim Anlegen der Beurteilung. Bitte erneut versuchen.';
  }
  return message ?? 'Beurteilung konnte nicht angelegt werden. Bitte erneut versuchen.';
}

// Das Shared-Schema typisiert `vorlageId`/`gefahrenzoneId` als `optional`,
// also `string | undefined` — NICHT `string | null`. TanStack-Form braucht
// trotzdem definierte Felder fürs Tracking, deshalb initialisieren wir sie
// mit `undefined` und konvertieren UI-seitig den leeren Select-Wert
// ebenfalls zu `undefined`.
const DEFAULT_VALUES: CreateGefaehrdungsbeurteilungFormValues = {
  modus: 'leer',
  einheitId: '' as unknown as CreateGefaehrdungsbeurteilungFormValues['einheitId'],
  vorlageId: undefined,
  gefahrenzoneId: undefined,
};

export function GefaehrdungseditorDrawer({ einsatzId, open, onClose, onCreated }: GefaehrdungseditorDrawerProps) {
  const vorlagenQuery = useGefaehrdungsbeurteilungVorlagen(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const gefahrenzonenQuery = useGefahrenzonenFuerEinsatz(einsatzId, open);
  const mutation = useCreateGefaehrdungsbeurteilung(einsatzId);

  const [inlineError, setInlineError] = useState<string | null>(null);
  // Explizites „User hat eine Karte gewählt"-Flag: `modus` startet auf 'leer',
  // aber das soll nicht mit „Leeres Formular ausgewählt" verwechselt werden.
  // Nur wenn `hasSelection` true ist, gilt die Auswahl als bewusst getroffen.
  const [hasSelection, setHasSelection] = useState(false);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    validatorAdapter: zodValidator(),
    // Bewusst KEIN `validators.onChange`/`onSubmit` am Formular:
    // TanStack Form schluckt den `onSubmit`-Callback stumm, wenn der
    // Form-Level-Validator fail liefert (das würde unsere Inline-Fehler
    // unmöglich machen). Stattdessen runnen wir das Shared-Zod-Schema
    // explizit via `safeParse` im Submit-Handler (siehe unten) und
    // mappen Zod-Issues auf UX-DR21-konforme Inline-Meldungen.
    // Der `zodValidator`-Adapter bleibt registriert, damit Feld-Level-
    // Validatoren (zukünftige Stories) ihn ohne Umweg nutzen können.
    onSubmit: async ({ value }) => {
      if (!hasSelection) {
        setInlineError('Bitte eine Vorlage oder „Leeres Formular" auswählen.');
        return;
      }
      const parsed = createGefaehrdungsbeurteilungFormSchema.safeParse(value);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const path = firstIssue?.path.join('.');
        if (path === 'einheitId') {
          setInlineError('Bitte eine Einheit wählen.');
        } else if (path === 'vorlageId' && firstIssue?.message?.includes('Seed-Vorlage')) {
          setInlineError('Bitte eine Seed-Vorlage auswählen.');
        } else {
          setInlineError(firstIssue?.message ?? 'Eingaben sind ungültig.');
        }
        return;
      }
      setInlineError(null);
      // `modus` ist nur UI-Hilfsfeld; das Backend-DTO kennt es nicht.
      const input: CreateGefaehrdungsbeurteilungInput = {
        einheitId: parsed.data.einheitId,
        vorlageId: parsed.data.modus === 'seed' ? (parsed.data.vorlageId ?? null) : null,
        gefahrenzoneId: parsed.data.gefahrenzoneId ?? null,
      };
      try {
        const result = await mutation.mutateAsync(input);
        onCreated(result.id);
        form.reset();
        setHasSelection(false);
        onClose();
      } catch (error) {
        const mapped = await mapMutationError(error);
        setInlineError(mapped);
      }
    },
  });

  const handleClose = useCallback(() => {
    form.reset();
    setHasSelection(false);
    setInlineError(null);
    onClose();
  }, [form, onClose]);

  // Inline-Fehler automatisch zurücksetzen, sobald der Nutzer den Drawer
  // neu öffnet (Schutz vor stale-Meldung bei zweitem Aufruf).
  useEffect(() => {
    if (!open) {
      setInlineError(null);
    }
  }, [open]);

  const vorlagen = vorlagenQuery.data ?? [];
  const einheiten = einheitenQuery.data ?? [];
  const gefahrenzonen = gefahrenzonenQuery.data ?? [];
  const gefahrenzonenVerfuegbar = !gefahrenzonenQuery.isPending && gefahrenzonen.length > 0;

  const cardEntries = useMemo(() => {
    return vorlagen.map((vorlage) => {
      const meta = resolveSzenarioMeta(vorlage.slug);
      return {
        key: vorlage.id,
        vorlageId: vorlage.id,
        title: vorlage.name,
        description: meta.kurzbeschreibung,
        icon: meta.icon,
        itemCount: vorlage.items?.length ?? 0,
      };
    });
  }, [vorlagen]);

  const isSubmitDisabled = mutation.isPending || vorlagenQuery.isPending || einheitenQuery.isPending;

  return (
    <Dialog.SlideIn
      isOpen={open}
      onClose={handleClose}
      title="Neue Gefährdungsbeurteilung"
      description="Wähle eine Seed-Vorlage oder starte mit einem leeren Formular."
      size="lg"
      position="right"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose} disabled={mutation.isPending}>
            Abbrechen
          </Button>
          <Button intent="primary" type="submit" form="gefaehrdungseditor-form" disabled={isSubmitDisabled} loading={mutation.isPending} data-testid="gefaehrdungseditor-submit">
            Anlegen
          </Button>
        </div>
      }
    >
      <form
        id="gefaehrdungseditor-form"
        aria-describedby={inlineError ? 'gefaehrdungseditor-inline-error' : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-5"
      >
        <section aria-labelledby="gefaehrdungseditor-vorlage-heading" className="space-y-3">
          <h2 id="gefaehrdungseditor-vorlage-heading" className="text-sm font-semibold text-text-primary">
            Vorlage wählen
          </h2>
          {vorlagenQuery.isPending ? (
            <p className="text-sm text-text-muted">Vorlagen werden geladen…</p>
          ) : vorlagenQuery.isError ? (
            <p className="text-sm text-status-danger-text">Vorlagen konnten nicht geladen werden. Es kann dennoch ein leeres Formular genutzt werden.</p>
          ) : null}

          <form.Subscribe selector={(state) => [state.values.modus, state.values.vorlageId] as const}>
            {([modus, vorlageId]) => (
              <div role="radiogroup" aria-labelledby="gefaehrdungseditor-vorlage-heading" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {cardEntries.map((entry) => (
                  <SeedTemplateEntryCard
                    key={entry.key}
                    variant="seed"
                    title={entry.title}
                    description={entry.description}
                    icon={entry.icon}
                    itemCount={entry.itemCount}
                    selected={hasSelection && modus === 'seed' && vorlageId === entry.vorlageId}
                    onSelect={() => {
                      form.setFieldValue('modus', 'seed');
                      form.setFieldValue('vorlageId', entry.vorlageId);
                      setHasSelection(true);
                    }}
                    data-testid={`vorlage-card-${entry.vorlageId}`}
                  />
                ))}
                <SeedTemplateEntryCard
                  variant="leer"
                  title="Leeres Formular"
                  description="Ohne Vorlage starten und Gefährdungen selbst erfassen."
                  selected={hasSelection && modus === 'leer'}
                  onSelect={() => {
                    form.setFieldValue('modus', 'leer');
                    form.setFieldValue('vorlageId', undefined);
                    setHasSelection(true);
                  }}
                  data-testid="vorlage-card-leer"
                />
              </div>
            )}
          </form.Subscribe>
        </section>

        <section className="space-y-3">
          <form.Field name="einheitId">
            {(field) => (
              <label htmlFor="gefaehrdungseditor-einheit" className="block text-sm">
                <span className="block font-medium text-text-primary">
                  Einheit <span className="text-status-danger-text">*</span>
                </span>
                <select
                  id="gefaehrdungseditor-einheit"
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value as CreateGefaehrdungsbeurteilungFormValues['einheitId'])}
                  onBlur={field.handleBlur}
                  disabled={einheitenQuery.isPending || mutation.isPending}
                  className="mt-1 block min-h-[2.75rem] w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring"
                  data-testid="gefaehrdungseditor-einheit"
                >
                  <option value="">{einheitenQuery.isPending ? 'Einheiten werden geladen…' : 'Bitte wählen…'}</option>
                  {einheiten.map((einheit) => (
                    <option key={einheit.id} value={einheit.id}>
                      {einheit.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>

          <form.Field name="gefahrenzoneId">
            {(field) => (
              <label htmlFor="gefaehrdungseditor-gefahrenzone" className="block text-sm">
                <span className="block font-medium text-text-primary">Gefahrenzone (optional)</span>
                <select
                  id="gefaehrdungseditor-gefahrenzone"
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value === '' ? undefined : (event.target.value as CreateGefaehrdungsbeurteilungFormValues['gefahrenzoneId']))}
                  onBlur={field.handleBlur}
                  disabled={!gefahrenzonenVerfuegbar || mutation.isPending}
                  className="mt-1 block min-h-[2.75rem] w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="gefaehrdungseditor-gefahrenzone"
                >
                  <option value="">{gefahrenzonenVerfuegbar ? 'Keine Zuordnung' : 'Keine Gefahrenzonen verfügbar'}</option>
                  {gefahrenzonen.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
        </section>

        {inlineError ? (
          <p
            id="gefaehrdungseditor-inline-error"
            role="alert"
            className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
            data-testid="gefaehrdungseditor-inline-error"
          >
            {inlineError}
          </p>
        ) : null}
      </form>
    </Dialog.SlideIn>
  );
}
