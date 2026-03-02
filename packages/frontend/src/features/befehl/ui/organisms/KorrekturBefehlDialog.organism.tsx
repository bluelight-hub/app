/**
 * Dialog zur Erstellung eines Korrektur-Befehls
 *
 * Nutzt dieselbe Formularstruktur wie "Neuer Befehl" (Schemawahl + Canvas-Layout)
 * und startet mit den Werten des Original-Befehls.
 */

import { useCurrentUser } from '@/features/auth';
import { BefehlsgeberSucheResultDtoQuelleEnum } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { Combobox, type ComboboxGroup, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { BefehlDtoBefehlstypEnum, type BefehlDto } from '@bluelight-hub/shared/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useBefehlsgeberSuche } from '../../api';
import { useKorrigiereBefehl } from '../../api/use-korrigiere-befehl';
import { korrigiereBefehlSchema } from '../../schemas/korrigiere-befehl.schema';
import { EmpfaengerCombobox, type EmpfaengerSelection } from '../molecules/EmpfaengerCombobox.molecule';

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

interface KorrekturBefehlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalBefehl: BefehlDto;
  einsatzId: string;
}

/** Baut Combobox-Gruppen aus den Befehlsgeber-Suche-Ergebnissen. */
function useBefehlsgeberGroups(einsatzId: string, searchTerm: string, enabled = true) {
  const { data: results } = useBefehlsgeberSuche(einsatzId, searchTerm, enabled);

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

/** Extrahiert Fehlermeldungen aus dem TanStack Form Error-Array */
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

function resolveInitialSchemaMode(originalBefehl: BefehlDto): SchemaMode {
  const hasErweiterteFelder = [originalBefehl.ereignis, originalBefehl.mittel, originalBefehl.ziel, originalBefehl.weg].some((value) => Boolean(value?.trim()));
  return originalBefehl.befehlstyp === BefehlDtoBefehlstypEnum.Erweitert || hasErweiterteFelder ? 'erweitert' : 'einfach';
}

export function KorrekturBefehlDialog({ isOpen, onClose, originalBefehl, einsatzId }: KorrekturBefehlDialogProps) {
  const { mutate, isPending } = useKorrigiereBefehl(originalBefehl.id, einsatzId);
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const initialEmpfaenger: EmpfaengerSelection[] = useMemo(
    () =>
      originalBefehl.empfaenger.map((empfaenger) => ({
        name: empfaenger.name,
        empfaengerId: empfaenger.empfaengerId,
      })),
    [originalBefehl.empfaenger],
  );
  const initialSchemaMode = useMemo(() => resolveInitialSchemaMode(originalBefehl), [originalBefehl]);
  const initialValues = useMemo(
    () => ({
      auftrag: originalBefehl.auftrag,
      empfaenger: initialEmpfaenger,
      befehlsgeber: originalBefehl.befehlsgeberName,
      befehlsgeberId: originalBefehl.befehlsgeberId ?? '',
      erstellerId: user?.id ?? '',
      zeitvorgabe: originalBefehl.zeitvorgabe ?? '',
      ereignis: originalBefehl.ereignis ?? '',
      mittel: originalBefehl.mittel ?? '',
      ziel: originalBefehl.ziel ?? '',
      weg: originalBefehl.weg ?? '',
    }),
    [
      initialEmpfaenger,
      originalBefehl.auftrag,
      originalBefehl.befehlsgeberId,
      originalBefehl.befehlsgeberName,
      originalBefehl.ereignis,
      originalBefehl.mittel,
      originalBefehl.weg,
      originalBefehl.zeitvorgabe,
      originalBefehl.ziel,
      user?.id,
    ],
  );

  const [schemaMode, setSchemaMode] = useState<SchemaMode>(initialSchemaMode);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [empfaengerChips, setEmpfaengerChips] = useState<EmpfaengerSelection[]>(initialEmpfaenger);
  const [zeitvorgabeInput, setZeitvorgabeInput] = useState(initialValues.zeitvorgabe);
  const [befehlsgeberSearch, setBefehlsgeberSearch] = useState('');
  const [befehlsgeberSelection, setBefehlsgeberSelection] = useState(initialValues.befehlsgeber);
  const befehlsgeberGroups = useBefehlsgeberGroups(einsatzId, befehlsgeberSearch, isOpen);

  const isErweitert = schemaMode === 'erweitert';

  const form = useForm({
    defaultValues: initialValues,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: korrigiereBefehlSchema,
    },
    onSubmit: ({ value }) => {
      setSubmitAttempted(true);

      if (!user?.id) {
        toast.error('Benutzerkontext wird noch geladen. Bitte kurz warten.');
        return;
      }

      if (isErweitert && !trimOrUndefined(value.ereignis)) {
        toast.error('Im erweiterten Schema ist Lage erforderlich.');
        return;
      }

      mutate(
        {
          auftrag: value.auftrag.trim(),
          empfaenger: value.empfaenger,
          befehlsgeber: value.befehlsgeber,
          befehlsgeberId: value.befehlsgeberId || undefined,
          erstellerId: user.id,
          zeitvorgabe: trimOrUndefined(zeitvorgabeInput),
          ereignis: trimOrUndefined(value.ereignis),
          mittel: trimOrUndefined(value.mittel),
          ziel: trimOrUndefined(value.ziel),
          weg: trimOrUndefined(value.weg),
        },
        { onSuccess: () => handleClose() },
      );
    },
  });

  useEffect(() => {
    if (user?.id && form.state.values.erstellerId !== user.id) {
      form.setFieldValue('erstellerId', user.id);
    }
  }, [form, user?.id]);

  useEffect(() => {
    if (!isOpen) return;

    form.reset(initialValues);
    setEmpfaengerChips(initialEmpfaenger);
    setZeitvorgabeInput(initialValues.zeitvorgabe);
    setBefehlsgeberSearch('');
    setBefehlsgeberSelection(initialValues.befehlsgeber);
    setSchemaMode(initialSchemaMode);
    setSubmitAttempted(false);
  }, [form, initialEmpfaenger, initialSchemaMode, initialValues, isOpen]);

  const handleClose = useCallback(() => {
    form.reset(initialValues);
    setEmpfaengerChips(initialEmpfaenger);
    setZeitvorgabeInput(initialValues.zeitvorgabe);
    setBefehlsgeberSearch('');
    setBefehlsgeberSelection(initialValues.befehlsgeber);
    setSchemaMode(initialSchemaMode);
    setSubmitAttempted(false);
    onClose();
  }, [form, initialEmpfaenger, initialSchemaMode, initialValues, onClose]);

  const handleSchemaModeChange = (nextSchema: SchemaMode) => {
    setSchemaMode(nextSchema);
    setSubmitAttempted(false);
  };

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

  const renderAuftragField = () => (
    <form.Field name="auftrag">
      {(field) => {
        const charCount = field.state.value.length;
        const countLabel = `${charCount}/5000 Zeichen`;
        return (
          <FormField label="Auftrag" required helperText={countLabel} error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}>
            <Textarea
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder="z.B. RTW-Besatzung zur Patientenversorgung..."
              variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
              textareaSize="lg"
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
            onChange={(event) => {
              const nextValue = event.target.value;
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

  const renderLageField = () => (
    <form.Field name="ereignis">
      {(field) => {
        const customLageError = isErweitert && submitAttempted && !field.state.value.trim() ? 'Lage ist im erweiterten Schema erforderlich.' : undefined;
        const validationError = field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined;

        return (
          <FormField
            label={isErweitert ? 'Lage' : 'Lage / Ereignis'}
            required={isErweitert}
            helperText={isErweitert ? 'Lage ist im erweiterten Schema erforderlich.' : undefined}
            error={validationError || customLageError}
          >
            <Textarea
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder={isErweitert ? 'z.B. Patient in Wohnung im 2. OG' : 'z.B. Rauchentwicklung im Dachbereich'}
              variant={validationError || customLageError ? 'error' : 'default'}
              textareaSize="sm"
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
            <Textarea
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder="z.B. mit Notfallausrüstung"
              textareaSize="sm"
              fullWidth
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="ziel">
        {(field) => (
          <FormField label="Ziel">
            <Textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} onBlur={field.handleBlur} placeholder="z.B. zum Patienten" textareaSize="sm" fullWidth />
          </FormField>
        )}
      </form.Field>
      <form.Field name="weg">
        {(field) => (
          <FormField label="Weg">
            <Textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} onBlur={field.handleBlur} placeholder="z.B. über den Hof" textareaSize="sm" fullWidth />
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
              onChange={(event) => field.handleChange(event.target.value)}
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
              onChange={(event) => field.handleChange(event.target.value)}
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
              onChange={(event) => field.handleChange(event.target.value)}
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
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
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
    <Dialog isOpen={isOpen} onClose={handleClose} size="full">
      <Dialog.Title>Korrektur zu Befehl #{originalBefehl.nummer}</Dialog.Title>

      <Dialog.Body>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              Korrektur des Original-Auftrags: &ldquo;{originalBefehl.auftrag.length > 100 ? `${originalBefehl.auftrag.slice(0, 100)}...` : originalBefehl.auftrag}&rdquo;
            </div>

            <div className="rounded-md border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-3 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
              <p className="font-medium text-gray-900 text-sm dark:text-gray-100">Schemawahl</p>
              <div className="mt-2">{renderSchemaSwitcher()}</div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                  {isErweitert && <div>{renderLageField()}</div>}
                  <div className={cn(isErweitert ? 'mt-4' : undefined)}>{renderAuftragField()}</div>
                </div>
                <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">{isErweitert ? renderErweitertDetails() : renderEinfachDetails()}</div>
              </div>

              <div className="space-y-4">
                <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                  <p className="font-medium text-gray-900 text-sm dark:text-gray-100">Adressierung und Zeit</p>
                  <div className="mt-3 space-y-4">
                    {renderEinheitField()}
                    {renderBefehlsgeberField()}
                    {renderZeitvorgabeField()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="primary" loading={isPending} onClick={() => form.handleSubmit()} disabled={isPending || isUserLoading || !user?.id}>
          Korrektur erteilen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
