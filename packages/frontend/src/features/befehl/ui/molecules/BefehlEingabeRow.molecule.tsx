/**
 * BefehlEingabeRow - Inline-Eingabe zur Befehlserfassung.
 *
 * Verwendet ausschließlich das Canvas-Interaktionsmuster.
 * Unterstützt beide Schemata:
 * - Einfach: Einheit, Auftrag, Mittel, Ziel, Weg
 * - Erweitert: Einheit, Lage, Auftrag, Durchführung, Versorgung, Führung/Kommunikation
 */

import type { CreateBefehlDto } from '@/shared';
import { BefehlsgeberSucheResultDtoQuelleEnum } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { Combobox, type ComboboxGroup, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useEffect, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { useBefehlsgeberSuche, useCreateBefehl } from '../../api';
import { useOfflineSync } from '../../lib/offline-queue';
import { createBefehlSchema } from '../../schemas';
import { EmpfaengerCombobox, type EmpfaengerSelection } from './EmpfaengerCombobox.molecule';

interface BefehlEingabeRowProps {
  einsatzId: string;
  onClose: () => void;
}

type SchemaMode = 'einfach' | 'erweitert';

const SCHEMA_MODES: Array<{
  id: SchemaMode;
  label: string;
  requirements: string;
  detailHint: string;
}> = [
  {
    id: 'einfach',
    label: 'Einfach',
    requirements: 'Pflicht: Einheit + Auftrag',
    detailHint: 'Optional: Mittel, Ziel, Weg',
  },
  {
    id: 'erweitert',
    label: 'Erweitert',
    requirements: 'Pflicht: Einheit + Lage + Auftrag',
    detailHint: 'Optional: Durchführung, Versorgung, Führung/Kommunikation',
  },
];

/** Baut Combobox-Gruppen aus den Befehlsgeber-Suche-Ergebnissen. */
function useBefehlsgeberGroups(einsatzId: string, searchTerm: string) {
  const { data: results } = useBefehlsgeberSuche(einsatzId, searchTerm);

  return useMemo<ComboboxGroup[]>(() => {
    if (!results || results.length === 0) return [];
    const vorschlaege: ComboboxItem[] = [];
    const personen: ComboboxItem[] = [];

    for (const result of results) {
      const item: ComboboxItem = {
        value: `${result.quelle}:${result.id}`,
        label: result.label,
        meta: { name: result.name, userId: result.userId, quelle: result.quelle },
      };

      if (result.quelle === BefehlsgeberSucheResultDtoQuelleEnum.Vorschlag) {
        vorschlaege.push(item);
      } else {
        personen.push(item);
      }
    }

    const groups: ComboboxGroup[] = [];
    if (vorschlaege.length > 0) groups.push({ label: 'Vorschläge', items: vorschlaege });
    if (personen.length > 0) groups.push({ label: 'Kräfte im Einsatz', items: personen });
    return groups;
  }, [results]);
}

/**
 * Extrahiert Fehlermeldungen aus dem TanStack Form Error-Array.
 * Unterstützt sowohl String-Fehler als auch Zod-Error-Objekte.
 */
function getFormErrors(errors: unknown[]): string {
  return errors
    .map((error) => {
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) return (error as { message: string }).message;
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Inline-Eingabezeile für neue Befehle im Canvas-Muster.
 */
export function BefehlEingabeRow({ einsatzId, onClose }: BefehlEingabeRowProps) {
  const { mutateAsync, isPending } = useCreateBefehl(einsatzId);
  const { isOnline, enqueue } = useOfflineSync(async (data) => {
    await mutateAsync(data as CreateBefehlDto);
  });
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const [schemaMode, setSchemaMode] = useState<SchemaMode>('einfach');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [empfaengerChips, setEmpfaengerChips] = useState<EmpfaengerSelection[]>([]);
  const [zeitvorgabeInput, setZeitvorgabeInput] = useState('');
  const [befehlsgeberSearch, setBefehlsgeberSearch] = useState('');
  const [befehlsgeberSelection, setBefehlsgeberSelection] = useState<string>('EL');
  const befehlsgeberGroups = useBefehlsgeberGroups(einsatzId, befehlsgeberSearch);

  const isErweitert = schemaMode === 'erweitert';

  const form = useForm({
    defaultValues: {
      auftrag: '',
      empfaenger: [] as EmpfaengerSelection[],
      befehlsgeber: 'EL',
      befehlsgeberId: '' as string | undefined,
      einsatzId,
      erstellerId: user?.id ?? '',
      zeitvorgabe: '',
      ereignis: '',
      mittel: '',
      ziel: '',
      weg: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createBefehlSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitAttempted(true);

      if (!user?.id) {
        toast.error('Benutzerkontext wird noch geladen. Bitte kurz warten.');
        return;
      }

      if (isErweitert && !trimOrUndefined(value.ereignis)) {
        toast.error('Im erweiterten Schema ist Lage erforderlich.');
        return;
      }

      const payload: CreateBefehlDto = {
        ...value,
        erstellerId: user.id,
        auftrag: value.auftrag.trim(),
        zeitvorgabe: trimOrUndefined(zeitvorgabeInput),
        ereignis: trimOrUndefined(value.ereignis),
        mittel: trimOrUndefined(value.mittel),
        ziel: trimOrUndefined(value.ziel),
        weg: trimOrUndefined(value.weg),
        befehlsgeberId: value.befehlsgeberId || undefined,
      };

      if (!isOnline) {
        await enqueue(payload);
        toast.info('Offline – Befehl wird gesendet, sobald Verbindung besteht.');
        form.reset();
        setEmpfaengerChips([]);
        setZeitvorgabeInput('');
        setBefehlsgeberSelection('EL');
        setSubmitAttempted(false);
        onClose();
        return;
      }

      try {
        const result = await mutateAsync(payload);
        toast.success(`Befehl #${result.nummer} erteilt an ${value.empfaenger.length} Einheiten.`);
        form.reset();
        setEmpfaengerChips([]);
        setZeitvorgabeInput('');
        setBefehlsgeberSelection('EL');
        setSubmitAttempted(false);
        onClose();
      } catch (error) {
        toast.error('Befehl konnte nicht erstellt werden.', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    },
  });

  useEffect(() => {
    if (user?.id && form.state.values.erstellerId !== user.id) {
      form.setFieldValue('erstellerId', user.id);
    }
  }, [form, user?.id]);

  const handleClose = () => {
    setSubmitAttempted(false);
    onClose();
  };

  const handleSchemaModeChange = (nextSchema: SchemaMode) => {
    setSchemaMode(nextSchema);
    setSubmitAttempted(false);
  };

  /** Ctrl+Enter: Formular absenden */
  useHotkeys(
    'mod+enter',
    () => {
      if (isPending || isUserLoading || !user?.id) return;
      form.handleSubmit();
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
    },
    [form, isPending, isUserLoading, user?.id],
  );

  /** Escape: Eingabe schließen */
  useHotkeys('escape', () => handleClose(), {
    enableOnFormTags: true,
  });

  const renderEinheitField = () => (
    <form.Field name="empfaenger">
      {(field) => (
        <FormField
          label="Einheit"
          required
          helperText="Mindestens eine Einheit, z.B. RTW-Besatzung oder Rotkreuz 83/1"
          error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
        >
          <EmpfaengerCombobox
            einsatzId={einsatzId}
            value={empfaengerChips}
            onChange={(selected) => {
              setEmpfaengerChips(selected);
              field.handleChange(selected);
            }}
            error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
          />
        </FormField>
      )}
    </form.Field>
  );

  const renderBefehlsgeberField = () => (
    <form.Field name="befehlsgeber">
      {(field) => (
        <FormField label="Befehlsgeber" required>
          <Combobox
            groups={befehlsgeberGroups}
            value={befehlsgeberSelection}
            onChange={(nextValue, item) => {
              const selectedName = (item?.meta?.name as string | undefined) ?? nextValue;
              setBefehlsgeberSelection(nextValue);
              field.handleChange(selectedName);
              const userId = item?.meta?.userId as string | undefined;
              form.setFieldValue('befehlsgeberId', userId);
            }}
            onInputChange={(nextInput) => {
              setBefehlsgeberSearch(nextInput);
              if (nextInput.length > 0) {
                setBefehlsgeberSelection(nextInput);
              }
            }}
            onBlur={field.handleBlur}
            placeholder="Befehlsgeber wählen..."
            allowCustomValue
            error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
          />
        </FormField>
      )}
    </form.Field>
  );

  const renderAuftragField = ({
    label = 'Auftrag',
    placeholder = 'z.B. zur Patientenversorgung',
    textareaSize = 'sm',
    helperText,
  }: {
    label?: string;
    placeholder?: string;
    textareaSize?: 'sm' | 'md' | 'lg';
    helperText?: string;
  } = {}) => (
    <form.Field name="auftrag">
      {(field) => {
        const charCount = field.state.value.length;
        const countLabel = `${charCount}/5000 Zeichen`;
        return (
          <FormField
            label={label}
            required
            helperText={helperText ? `${countLabel} - ${helperText}` : countLabel}
            error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
          >
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder={placeholder}
              variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
              textareaSize={textareaSize}
              fullWidth
            />
          </FormField>
        );
      }}
    </form.Field>
  );

  const renderZeitvorgabeField = () => (
    <form.Field name="zeitvorgabe">
      {(field) => (
        <FormField label="Zeitvorgabe" helperText="Optional, z.B. sofort oder bis 14:00 Uhr">
          <Input
            value={zeitvorgabeInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              setZeitvorgabeInput(nextValue);
              field.handleChange(nextValue);
            }}
            onBlur={field.handleBlur}
            placeholder="z.B. sofort, bis 14:00 Uhr"
            maxLength={200}
            inputSize="md"
            fullWidth
          />
        </FormField>
      )}
    </form.Field>
  );

  const renderLageField = ({ helperText, textareaSize = 'sm' }: { helperText?: string; textareaSize?: 'sm' | 'md' | 'lg' } = {}) => (
    <form.Field name="ereignis">
      {(field) => {
        const customLageError = isErweitert && submitAttempted && !field.state.value.trim() ? 'Lage ist im erweiterten Schema erforderlich.' : undefined;
        const validationError = field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined;

        return (
          <FormField label={isErweitert ? 'Lage' : 'Lage / Ereignis'} required={isErweitert} helperText={helperText} error={validationError || customLageError}>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder={isErweitert ? 'z.B. Patient in Wohnung im 2. OG' : 'z.B. Rauchentwicklung im Dachbereich'}
              variant={validationError || customLageError ? 'error' : 'default'}
              textareaSize={textareaSize}
              fullWidth
            />
          </FormField>
        );
      }}
    </form.Field>
  );

  const renderEinfachDetails = () => (
    <div className="grid gap-3 md:grid-cols-3">
      <form.Field name="mittel">
        {(field) => (
          <FormField label="Mittel">
            <Textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="z.B. mit Notfallausrüstung" textareaSize="sm" fullWidth />
          </FormField>
        )}
      </form.Field>
      <form.Field name="ziel">
        {(field) => (
          <FormField label="Ziel">
            <Textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="z.B. zum Patienten" textareaSize="sm" fullWidth />
          </FormField>
        )}
      </form.Field>
      <form.Field name="weg">
        {(field) => (
          <FormField label="Weg">
            <Textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="z.B. über den Hof" textareaSize="sm" fullWidth />
          </FormField>
        )}
      </form.Field>
    </div>
  );

  const renderErweitertDetails = () => (
    <div className="grid gap-3 md:grid-cols-2">
      <form.Field name="weg">
        {(field) => (
          <FormField label="Durchführung">
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="z.B. Zugang über Treppenhaus, Tragehilfe anfordern"
              textareaSize="sm"
              fullWidth
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="mittel">
        {(field) => (
          <FormField label="Versorgung">
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="z.B. Notfallrucksack, O2, Monitoring bereitstellen"
              textareaSize="sm"
              fullWidth
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="ziel">
        {(field) => (
          <FormField label="Führung / Kommunikation">
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="z.B. Rückmeldung an EL nach Patientenkontakt"
              textareaSize="sm"
              fullWidth
            />
          </FormField>
        )}
      </form.Field>
    </div>
  );

  const renderSchemaSwitcher = () => (
    <div className="grid gap-2 md:grid-cols-2">
      {SCHEMA_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => handleSchemaModeChange(mode.id)}
          className={cn(
            'rounded-md border px-3 py-2 text-left transition-colors',
            schemaMode === mode.id
              ? 'border-action-primary bg-action-secondary text-action-primary'
              : 'border-border-subtle bg-surface-panel text-text-secondary hover:border-border-strong hover:bg-action-secondary',
          )}
        >
          <p className="font-medium text-sm">{mode.label}</p>
          <p className="mt-0.5 text-xs opacity-80">{mode.requirements}</p>
          <p className="mt-0.5 text-xs opacity-80">{mode.detailHint}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-border-subtle bg-gradient-to-r from-surface-raised to-action-secondary p-3">
            <p className="font-medium text-text-primary text-sm">Schemawahl</p>
            <div className="mt-2">{renderSchemaSwitcher()}</div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <div className="rounded-md border border-border-subtle p-4">
                {isErweitert && <div>{renderLageField({ helperText: 'Lage ist im erweiterten Schema erforderlich.' })}</div>}

                <div className={cn(isErweitert ? 'mt-4' : undefined)}>
                  {renderAuftragField({
                    label: 'Auftrag',
                    placeholder: 'z.B. RTW-Besatzung zur Patientenversorgung...',
                    textareaSize: 'lg',
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border-subtle p-4">{isErweitert ? renderErweitertDetails() : renderEinfachDetails()}</div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-border-subtle p-4">
                <p className="font-medium text-text-primary text-sm">Adressierung und Zeit</p>
                <div className="mt-3 space-y-4">
                  {renderEinheitField()}
                  {renderBefehlsgeberField()}
                  {renderZeitvorgabeField()}
                </div>
              </div>

              <div className="flex items-end justify-end gap-2">
                <Button intent="secondary" appearance="ghost" kbd="esc" onClick={handleClose} disabled={isPending}>
                  Abbrechen
                </Button>
                <Button intent="primary" kbd="ctrl+enter" type="submit" loading={isPending} disabled={isPending || isUserLoading || !user?.id}>
                  Befehl erteilen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
