/**
 * SicherungspostenDrawer — Drawer-Organism zum Anlegen und Bearbeiten eines
 * Sicherungspostens (Story 4.1, T6).
 *
 * Felder:
 * - **Bezeichnung** (Pflicht, 1–200 Zeichen).
 * - **Standort** als discriminated Union: `coordinate` (longitude/latitude
 *   + optional `addressHint`) ODER `address` (Freitext). RadioGroup-Toggle.
 * - **Personal**: Liste discriminated Unions (`user` mit userId ODER
 *   `freitext` mit name + optional rolle). Hinzufügen/Entfernen via
 *   Buttons; Toggle pro Eintrag zwischen User-ID und Freitext.
 * - **Zuständigkeitsbereich** (optional, Textarea ≤ 4000 Zeichen).
 * - **Ablösezeiten**: Read-Only-Stub-Hinweis (Editor in Story 4.2).
 *
 * 409-Konflikt-Pfad: typsierter {@link SicherungspostenConflictError} →
 * Inline-Banner mit `currentVersion`. Submit bleibt blockiert, bis der
 * User den Drawer schließt (Pattern aus `SicherheitsregelDrawer`).
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import type { CreateSicherungspostenDto, SicherungspostenDto, UpdateSicherungspostenDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { SicherungspostenConflictError, useCreateSicherungsposten, useUpdateSicherungsposten } from '../../api/use-sicherungsposten';
import { sicherungspostenFormSchema, type SicherungspostenFormValues, type Standort, type PersonalEntry } from '../../schemas/sicherungsposten.schema';

export interface SicherungspostenDrawerProps {
  readonly einsatzId: string;
  readonly mode: 'create' | 'edit';
  readonly open: boolean;
  readonly onClose: () => void;
  readonly posten?: SicherungspostenDto;
}

function buildDefaults(posten?: SicherungspostenDto): SicherungspostenFormValues {
  if (!posten) {
    return {
      bezeichnung: '',
      standort: { kind: 'address', text: '' },
      personal: [],
      einheitId: undefined,
      zustaendigkeitsbereich: undefined,
      abloesezeiten: undefined,
    };
  }
  // Generierter DTO: `einheitId`, `zustaendigkeitsbereich`, `abloesezeiten`
  // sind als `object | null` typisiert (OpenAPI-Generator-Quirk für nullable
  // Strings). Wir lesen defensiv über `as string | null | undefined`.
  const einheitId = (posten.einheitId as string | null | undefined) ?? undefined;
  const zustaendigkeitsbereich = (posten.zustaendigkeitsbereich as string | null | undefined) ?? undefined;
  const abloesezeiten = (posten.abloesezeiten as string | null | undefined) ?? undefined;

  return {
    bezeichnung: posten.bezeichnung,
    standort: posten.standort as Standort,
    personal: (posten.personal as PersonalEntry[]) ?? [],
    einheitId,
    zustaendigkeitsbereich,
    abloesezeiten,
  };
}

function normalizePersonalForSubmit(personal: PersonalEntry[]): PersonalEntry[] {
  // Trim, aber **nicht** silent-droppen: leere Einträge gehen weiter durch und
  // werden vom Form-Schema (zod `.min(1)` auf userId/name) als Validierungsfehler
  // erkannt — der User sieht eine inline-Meldung statt unbemerkt verlorenem
  // Eintrag.
  return personal.map((entry) => {
    if (entry.kind === 'user') {
      return { kind: 'user' as const, userId: entry.userId.trim() };
    }
    const rolle = entry.rolle?.trim();
    return { kind: 'freitext' as const, name: entry.name.trim(), rolle: rolle && rolle.length > 0 ? rolle : undefined };
  });
}

export function SicherungspostenDrawer({ einsatzId, mode, open, onClose, posten }: SicherungspostenDrawerProps) {
  const isEditMode = mode === 'edit';
  const createMutation = useCreateSicherungsposten(einsatzId);
  const updateMutation = useUpdateSicherungsposten(einsatzId);

  const [conflictError, setConflictError] = useState<SicherungspostenConflictError | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const defaults = useMemo(() => buildDefaults(posten), [posten]);

  const form = useForm<SicherungspostenFormValues>({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      if (conflictError) return;
      const parsed = sicherungspostenFormSchema.safeParse({
        ...value,
        personal: normalizePersonalForSubmit(value.personal),
      });
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        setInlineError(firstIssue?.message ?? 'Eingaben sind ungültig.');
        return;
      }
      setInlineError(null);

      try {
        if (isEditMode && posten) {
          const body: UpdateSicherungspostenDto = {
            expectedVersion: posten.version,
            bezeichnung: parsed.data.bezeichnung,
            standort: parsed.data.standort,
            personal: parsed.data.personal,
            einheitId: parsed.data.einheitId,
            zustaendigkeitsbereich: parsed.data.zustaendigkeitsbereich,
            abloesezeiten: parsed.data.abloesezeiten,
          };
          await updateMutation.mutateAsync({ postenId: posten.id, body });
        } else {
          const body: CreateSicherungspostenDto = {
            bezeichnung: parsed.data.bezeichnung,
            standort: parsed.data.standort,
            personal: parsed.data.personal,
            einheitId: parsed.data.einheitId,
            zustaendigkeitsbereich: parsed.data.zustaendigkeitsbereich,
            abloesezeiten: parsed.data.abloesezeiten,
          };
          await createMutation.mutateAsync(body);
        }
        onClose();
      } catch (error) {
        if (error instanceof SicherungspostenConflictError) {
          setConflictError(error);
          return;
        }
        setInlineError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      }
    },
  });

  // Reset form/state, sobald sich der Posten oder der Open-Zustand ändert.
  // `form` und `buildDefaults` sind bewusst **nicht** in den Deps:
  // - `form` ist eine stabile TanStack-Form-Instanz; das Aufnehmen würde den
  //   Effekt bei jedem Render neu feuern und die Form bei jedem Render zurücksetzen.
  // - `buildDefaults` ist eine reine Funktion (keine Closure-Captures außerhalb
  //   der Args), Identität ist hier irrelevant.
  // Posten-Identität wird über `id` + `version` abgedeckt — beide Felder sind
  // monotone Marker (jede Mutation inkrementiert `version`).
  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(posten));
      setConflictError(null);
      setInlineError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, posten?.id, posten?.version]);

  const handleClose = () => {
    setConflictError(null);
    setInlineError(null);
    onClose();
  };

  const isSubmitDisabled = createMutation.isPending || updateMutation.isPending || conflictError !== null;

  return (
    <Dialog.SlideIn
      isOpen={open}
      onClose={handleClose}
      title={isEditMode ? 'Sicherungsposten bearbeiten' : 'Neuer Sicherungsposten'}
      description={isEditMode ? 'Bezeichnung, Standort, Personal oder Zuständigkeit anpassen.' : 'Posten für den aktuellen Einsatz anlegen.'}
      size="lg"
      position="right"
    >
      <form
        data-testid="sicherungsposten-drawer"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex h-full flex-col gap-5"
      >
        <section className="space-y-3">
          <form.Field name="bezeichnung">
            {(field) => (
              <label htmlFor="sicherungsposten-bezeichnung" className="block text-sm">
                <span className="block font-medium text-text-primary">
                  Bezeichnung <span className="text-status-danger-text">*</span>
                </span>
                <Input
                  id="sicherungsposten-bezeichnung"
                  type="text"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  maxLength={200}
                  data-testid="sicherungsposten-bezeichnung"
                  className="mt-1"
                />
              </label>
            )}
          </form.Field>
        </section>

        <section aria-labelledby="sicherungsposten-standort-heading" className="space-y-3">
          <h2 id="sicherungsposten-standort-heading" className="text-sm font-semibold text-text-primary">
            Standort
          </h2>
          <form.Field name="standort">
            {(field) => {
              const kind = field.state.value.kind;
              return (
                <div className="space-y-3">
                  <fieldset role="radiogroup" aria-labelledby="sicherungsposten-standort-heading" className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2 text-text-primary">
                      <input
                        type="radio"
                        name="sicherungsposten-standort-kind"
                        value="address"
                        checked={kind === 'address'}
                        onChange={() => field.handleChange({ kind: 'address', text: '' })}
                        data-testid="sicherungsposten-standort-toggle-address"
                      />
                      <span>Adresse / Freitext</span>
                    </label>
                    <label className="flex items-center gap-2 text-text-primary">
                      <input
                        type="radio"
                        name="sicherungsposten-standort-kind"
                        value="coordinate"
                        checked={kind === 'coordinate'}
                        // NaN als Initialwert: erzwingt User-Eingabe, sonst rejected `standortSchema.coordinate`
                        // (zod `.finite()`) den Submit. Verhindert versehentliche Null-Insel-Posten (0,0).
                        onChange={() => field.handleChange({ kind: 'coordinate', longitude: Number.NaN, latitude: Number.NaN })}
                        data-testid="sicherungsposten-standort-toggle-coordinate"
                      />
                      <span>Koordinaten (WGS84)</span>
                    </label>
                  </fieldset>

                  {kind === 'address' ? (
                    <label htmlFor="sicherungsposten-standort-text" className="block text-sm">
                      <span className="block font-medium text-text-primary">Beschreibung</span>
                      <Textarea
                        id="sicherungsposten-standort-text"
                        value={field.state.value.kind === 'address' ? field.state.value.text : ''}
                        onChange={(event) => field.handleChange({ kind: 'address', text: event.target.value })}
                        maxLength={500}
                        className="mt-1"
                        data-testid="sicherungsposten-standort-text"
                      />
                    </label>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label htmlFor="sicherungsposten-standort-latitude" className="block text-sm">
                        <span className="block font-medium text-text-primary">
                          Latitude <span className="text-status-danger-text">*</span>
                        </span>
                        <Input
                          id="sicherungsposten-standort-latitude"
                          type="number"
                          step="0.00001"
                          required
                          // Empty-Input → NaN, damit das Zod-Schema (`.finite()`) den Submit ablehnt
                          // und der User keinen Posten auf Null-Insel (0,0) speichert.
                          value={field.state.value.kind === 'coordinate' && Number.isFinite(field.state.value.latitude) ? String(field.state.value.latitude) : ''}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const next = raw === '' ? Number.NaN : Number(raw);
                            const current = field.state.value.kind === 'coordinate' ? field.state.value : { kind: 'coordinate' as const, longitude: Number.NaN, latitude: Number.NaN };
                            field.handleChange({ ...current, latitude: next });
                          }}
                          className="mt-1"
                          data-testid="sicherungsposten-standort-latitude"
                        />
                      </label>
                      <label htmlFor="sicherungsposten-standort-longitude" className="block text-sm">
                        <span className="block font-medium text-text-primary">
                          Longitude <span className="text-status-danger-text">*</span>
                        </span>
                        <Input
                          id="sicherungsposten-standort-longitude"
                          type="number"
                          step="0.00001"
                          required
                          value={field.state.value.kind === 'coordinate' && Number.isFinite(field.state.value.longitude) ? String(field.state.value.longitude) : ''}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const next = raw === '' ? Number.NaN : Number(raw);
                            const current = field.state.value.kind === 'coordinate' ? field.state.value : { kind: 'coordinate' as const, longitude: Number.NaN, latitude: Number.NaN };
                            field.handleChange({ ...current, longitude: next });
                          }}
                          className="mt-1"
                          data-testid="sicherungsposten-standort-longitude"
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            }}
          </form.Field>
        </section>

        <section aria-labelledby="sicherungsposten-personal-heading" className="space-y-3">
          <h2 id="sicherungsposten-personal-heading" className="text-sm font-semibold text-text-primary">
            Personal
          </h2>
          <form.Field name="personal" mode="array">
            {(field) => (
              <div className="space-y-2" data-testid="sicherungsposten-personal-list">
                {field.state.value.length === 0 ? <p className="text-xs text-text-muted">Noch keine Personal-Einträge — über „Eintrag hinzufügen" ergänzen.</p> : null}
                {field.state.value.map((entry, index) => (
                  <div key={`personal-${index}`} className="rounded-control border border-border-subtle bg-surface-panel-elevated p-3" data-testid={`sicherungsposten-personal-row-${index}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <fieldset className="flex gap-3 text-sm" role="radiogroup">
                        <label className="flex items-center gap-1 text-text-primary">
                          <input
                            type="radio"
                            name={`personal-kind-${index}`}
                            value="user"
                            checked={entry.kind === 'user'}
                            onChange={() => {
                              const next = [...field.state.value];
                              next[index] = { kind: 'user', userId: '' };
                              field.handleChange(next);
                            }}
                            data-testid={`sicherungsposten-personal-toggle-user-${index}`}
                          />
                          <span>User-ID</span>
                        </label>
                        <label className="flex items-center gap-1 text-text-primary">
                          <input
                            type="radio"
                            name={`personal-kind-${index}`}
                            value="freitext"
                            checked={entry.kind === 'freitext'}
                            onChange={() => {
                              const next = [...field.state.value];
                              next[index] = { kind: 'freitext', name: '' };
                              field.handleChange(next);
                            }}
                            data-testid={`sicherungsposten-personal-toggle-freitext-${index}`}
                          />
                          <span>Freitext</span>
                        </label>
                      </fieldset>
                      <Button
                        intent="danger"
                        appearance="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const next = field.state.value.filter((_, idx) => idx !== index);
                          field.handleChange(next);
                        }}
                        data-testid={`sicherungsposten-personal-remove-${index}`}
                      >
                        Entfernen
                      </Button>
                    </div>
                    {entry.kind === 'user' ? (
                      <Input
                        type="text"
                        value={entry.userId}
                        onChange={(event) => {
                          const next = [...field.state.value];
                          next[index] = { kind: 'user', userId: event.target.value };
                          field.handleChange(next);
                        }}
                        maxLength={40}
                        placeholder="User-ID (CUID)"
                        data-testid={`sicherungsposten-personal-userid-${index}`}
                      />
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="text"
                          value={entry.name}
                          onChange={(event) => {
                            const next = [...field.state.value];
                            next[index] = { ...entry, kind: 'freitext', name: event.target.value };
                            field.handleChange(next);
                          }}
                          maxLength={200}
                          placeholder="Name"
                          data-testid={`sicherungsposten-personal-name-${index}`}
                        />
                        <Input
                          type="text"
                          value={entry.rolle ?? ''}
                          onChange={(event) => {
                            const next = [...field.state.value];
                            next[index] = { ...entry, kind: 'freitext', name: entry.name, rolle: event.target.value };
                            field.handleChange(next);
                          }}
                          maxLength={120}
                          placeholder="Rolle (optional)"
                          data-testid={`sicherungsposten-personal-rolle-${index}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  intent="secondary"
                  appearance="ghost"
                  size="sm"
                  type="button"
                  onClick={() => field.handleChange([...field.state.value, { kind: 'freitext', name: '' }])}
                  data-testid="sicherungsposten-personal-add"
                >
                  + Eintrag hinzufügen
                </Button>
              </div>
            )}
          </form.Field>
        </section>

        <section className="space-y-2">
          <form.Field name="zustaendigkeitsbereich">
            {(field) => (
              <label htmlFor="sicherungsposten-zustaendigkeitsbereich" className="block text-sm">
                <span className="block font-medium text-text-primary">Zuständigkeitsbereich</span>
                <Textarea
                  id="sicherungsposten-zustaendigkeitsbereich"
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value || undefined)}
                  maxLength={4000}
                  className="mt-1"
                  data-testid="sicherungsposten-zustaendigkeitsbereich"
                />
              </label>
            )}
          </form.Field>
        </section>

        <section className="rounded-control border border-border-subtle bg-surface-panel-elevated px-3 py-2 text-xs text-text-muted" data-testid="sicherungsposten-abloesezeiten-stub">
          Ablösezeiten — Pflege in Story 4.2.
        </section>

        {conflictError ? (
          <p
            role="alert"
            data-testid="sicherungsposten-drawer-conflict-banner"
            className="rounded-control border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text"
          >
            {conflictError.currentVersion !== undefined
              ? `Posten wurde zwischenzeitlich aktualisiert (Server-Version: ${conflictError.currentVersion}). Bitte neu laden.`
              : 'Posten wurde zwischenzeitlich aktualisiert. Bitte neu laden.'}
          </p>
        ) : null}

        {inlineError ? (
          <p
            role="alert"
            data-testid="sicherungsposten-drawer-inline-error"
            className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
          >
            {inlineError}
          </p>
        ) : null}

        <footer className="mt-auto flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
          <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button intent="primary" type="submit" disabled={isSubmitDisabled} loading={createMutation.isPending || updateMutation.isPending} data-testid="sicherungsposten-drawer-submit">
            {isEditMode ? 'Speichern' : 'Anlegen'}
          </Button>
        </footer>
      </form>
    </Dialog.SlideIn>
  );
}
