import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { FahrzeugtypDto, UpdateFahrzeugtypDto } from '@/features/admin/api';
import { FAHRZEUGTYP_KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Switch } from '@/shared/ui/atoms/switch.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
const optionalCountSchema = z.union([z.literal(''), z.number().int().min(0, 'Wert muss mindestens 0 sein').max(99, 'Wert darf maximal 99 sein')]);
const updateFahrzeugtypSchema = z.object({
  code: z.string().min(2, 'Code muss mindestens 2 Zeichen haben').max(20, 'Code darf maximal 20 Zeichen haben'),
  bezeichnung: z.string().min(2, 'Bezeichnung muss mindestens 2 Zeichen haben').max(100, 'Bezeichnung darf maximal 100 Zeichen haben'),
  kategorie: z.enum(['RETTUNGSDIENST', 'FUEHRUNG', 'TRANSPORT', 'SONSTIGES']),
  beschreibung: z.string().max(500, 'Beschreibung darf maximal 500 Zeichen haben').optional().or(z.literal('')),
  istAktiv: z.boolean(),
  fahrer: optionalCountSchema,
  sanitaeter: optionalCountSchema,
  notarzt: optionalCountSchema,
  funktrupp: optionalCountSchema,
  helfer: optionalCountSchema,
});
interface EditFahrzeugtypDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateFahrzeugtypDto) => void;
  isSubmitting: boolean;
  fahrzeugtyp: FahrzeugtypDto | null;
}
interface SollbesatzungFormData {
  fahrer?: number;
  sanitaeter?: number;
  notarzt?: number;
  funktrupp?: number;
  helfer?: number;
}
const KATEGORIE_OPTIONS = [
  { value: 'RETTUNGSDIENST', label: FAHRZEUGTYP_KATEGORIE_LABELS.RETTUNGSDIENST },
  { value: 'FUEHRUNG', label: FAHRZEUGTYP_KATEGORIE_LABELS.FUEHRUNG },
  { value: 'TRANSPORT', label: FAHRZEUGTYP_KATEGORIE_LABELS.TRANSPORT },
  { value: 'SONSTIGES', label: FAHRZEUGTYP_KATEGORIE_LABELS.SONSTIGES },
] as const;
const parseCountInput = (value: string): number | '' => {
  if (value.trim() === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};
const toNumberOrEmpty = (value: unknown): number | '' => {
  const parsed = toNumber(value);
  return parsed === undefined ? '' : parsed;
};
const extractSollbesatzung = (value: FahrzeugtypDto['sollbesatzung']): SollbesatzungFormData => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  return { fahrer: toNumber(record.fahrer), sanitaeter: toNumber(record.sanitaeter), notarzt: toNumber(record.notarzt), funktrupp: toNumber(record.funktrupp), helfer: toNumber(record.helfer) };
};
const normalizeSollbesatzung = (value: SollbesatzungFormData): SollbesatzungFormData => {
  return { fahrer: value.fahrer, sanitaeter: value.sanitaeter, notarzt: value.notarzt, funktrupp: value.funktrupp, helfer: value.helfer };
};
const hasSollbesatzungValues = (value: SollbesatzungFormData): boolean => {
  return Object.values(value).some((entry) => entry !== undefined);
};
const isSollbesatzungEqual = (a: SollbesatzungFormData, b: SollbesatzungFormData): boolean => {
  return a.fahrer === b.fahrer && a.sanitaeter === b.sanitaeter && a.notarzt === b.notarzt && a.funktrupp === b.funktrupp && a.helfer === b.helfer;
};
const toOptionalInteger = (value: number | ''): number | undefined => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}; /** * Dialog zum Bearbeiten eines Fahrzeugtyps. */
export const EditFahrzeugtypDialog = ({ isOpen, onClose, onSubmit, isSubmitting, fahrzeugtyp }: EditFahrzeugtypDialogProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lastLoadedIdRef = useRef<string | null>(null);
  const form = useForm({
    defaultValues: {
      code: fahrzeugtyp?.code || '',
      bezeichnung: fahrzeugtyp?.bezeichnung || '',
      kategorie: fahrzeugtyp?.kategorie || ('RETTUNGSDIENST' as FahrzeugtypDto['kategorie']),
      beschreibung: fahrzeugtyp?.beschreibung || '',
      istAktiv: fahrzeugtyp?.istAktiv ?? true,
      fahrer: toNumberOrEmpty(extractSollbesatzung(fahrzeugtyp?.sollbesatzung).fahrer),
      sanitaeter: toNumberOrEmpty(extractSollbesatzung(fahrzeugtyp?.sollbesatzung).sanitaeter),
      notarzt: toNumberOrEmpty(extractSollbesatzung(fahrzeugtyp?.sollbesatzung).notarzt),
      funktrupp: toNumberOrEmpty(extractSollbesatzung(fahrzeugtyp?.sollbesatzung).funktrupp),
      helfer: toNumberOrEmpty(extractSollbesatzung(fahrzeugtyp?.sollbesatzung).helfer),
    },
    validatorAdapter: zodValidator(),
    validators: { onBlur: updateFahrzeugtypSchema, onSubmit: updateFahrzeugtypSchema },
    onSubmit: ({ value }) => {
      if (!fahrzeugtyp) return;
      const updates: UpdateFahrzeugtypDto = {};
      if (value.code !== fahrzeugtyp.code) {
        updates.code = value.code;
      }
      if (value.bezeichnung !== fahrzeugtyp.bezeichnung) {
        updates.bezeichnung = value.bezeichnung;
      }
      if (value.kategorie !== fahrzeugtyp.kategorie) {
        updates.kategorie = value.kategorie;
      }
      const currentBeschreibung = fahrzeugtyp.beschreibung || '';
      if (value.beschreibung !== currentBeschreibung) {
        updates.beschreibung = value.beschreibung || undefined;
      }
      if (value.istAktiv !== fahrzeugtyp.istAktiv) {
        updates.istAktiv = value.istAktiv;
      }
      const currentSollbesatzung = normalizeSollbesatzung(extractSollbesatzung(fahrzeugtyp.sollbesatzung));
      const nextSollbesatzung = normalizeSollbesatzung({
        fahrer: toOptionalInteger(value.fahrer),
        sanitaeter: toOptionalInteger(value.sanitaeter),
        notarzt: toOptionalInteger(value.notarzt),
        funktrupp: toOptionalInteger(value.funktrupp),
        helfer: toOptionalInteger(value.helfer),
      });
      if (!isSollbesatzungEqual(currentSollbesatzung, nextSollbesatzung)) {
        updates.sollbesatzung = hasSollbesatzungValues(nextSollbesatzung) ? nextSollbesatzung : {};
      }
      if (Object.keys(updates).length === 0) {
        handleClose();
        return;
      }
      onSubmit(updates);
    },
  }); // biome-ignore lint/correctness/useExhaustiveDependencies: form.reset ist stabil und lastLoadedIdRef verhindert unnötige Resets useEffect(() => { if (fahrzeugtyp && isOpen && lastLoadedIdRef.current !== fahrzeugtyp.id) { const sollbesatzung = extractSollbesatzung(fahrzeugtyp.sollbesatzung); lastLoadedIdRef.current = fahrzeugtyp.id; form.reset({ code: fahrzeugtyp.code, bezeichnung: fahrzeugtyp.bezeichnung, kategorie: fahrzeugtyp.kategorie, beschreibung: fahrzeugtyp.beschreibung || '', istAktiv: fahrzeugtyp.istAktiv, fahrer: toNumberOrEmpty(sollbesatzung.fahrer), sanitaeter: toNumberOrEmpty(sollbesatzung.sanitaeter), notarzt: toNumberOrEmpty(sollbesatzung.notarzt), funktrupp: toNumberOrEmpty(sollbesatzung.funktrupp), helfer: toNumberOrEmpty(sollbesatzung.helfer), }); setShowAdvanced(hasSollbesatzungValues(sollbesatzung)); } }, [fahrzeugtyp, isOpen]); const handleClose = () => { if (!isSubmitting) { form.reset(); setShowAdvanced(false); lastLoadedIdRef.current = null; onClose(); } }; if (!fahrzeugtyp) return null; return ( <Dialog isOpen={isOpen} onClose={handleClose}> <Dialog.Title>Fahrzeugtyp bearbeiten</Dialog.Title> <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} > <Dialog.Body> <div className="space-y-4"> <form.Field name="code"> {(field) => ( <FormField label="Code" error={field.state.meta.errors[0]} required htmlFor="edit-fahrzeugtyp-code"> <Input id="edit-fahrzeugtyp-code" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value.toUpperCase())} placeholder="z.B. RTW" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="bezeichnung"> {(field) => ( <FormField label="Bezeichnung" error={field.state.meta.errors[0]} required htmlFor="edit-fahrzeugtyp-bezeichnung"> <Input id="edit-fahrzeugtyp-bezeichnung" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. Rettungswagen" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="kategorie"> {(field) => ( <FormField label="Kategorie" required htmlFor="edit-fahrzeugtyp-kategorie"> <Select id="edit-fahrzeugtyp-kategorie" value={field.state.value} onChange={(e) => field.handleChange(e.target.value as FahrzeugtypDto['kategorie'])} options={KATEGORIE_OPTIONS.map((option) => ({ ...option }))} fullWidth /> </FormField> )} </form.Field> <form.Field name="beschreibung"> {(field) => ( <FormField label="Beschreibung" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-beschreibung"> <Textarea id="edit-fahrzeugtyp-beschreibung" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Optionale Beschreibung" rows={3} /> </FormField> )} </form.Field> <form.Field name="istAktiv"> {(field) => ( <FormField label="Status" htmlFor="edit-fahrzeugtyp-status"> <div className="flex items-center gap-3"> <Switch checked={field.state.value} onChange={field.handleChange} labelledBy="edit-fahrzeugtyp-status" /> <span id="edit-fahrzeugtyp-status" className="text-text-secondary text-sm "> {field.state.value ? 'Aktiv' : 'Deaktiviert'} </span> </div> </FormField> )} </form.Field> <div className="rounded-lg border border-border-subtle p-3"> <div className="flex items-center justify-between gap-4"> <div> <p className="font-medium text-text-primary text-sm ">Sollbesatzung (optional)</p> <p className="text-text-muted text-xs ">Definiert die empfohlene Besetzung für diesen Fahrzeugtyp.</p> </div> <Button type="button" size="sm" appearance="ghost" intent="secondary" onClick={() => setShowAdvanced((prev) => !prev)}> {showAdvanced ? 'Ausblenden' : 'Bearbeiten'} </Button> </div> {showAdvanced && ( <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"> <form.Field name="fahrer"> {(field) => ( <FormField label="Fahrer" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-fahrer"> <Input id="edit-fahrzeugtyp-fahrer" name={field.name} type="number" min={0} max={99} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(parseCountInput(e.target.value))} placeholder="z.B. 1" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="sanitaeter"> {(field) => ( <FormField label="Sanitäter" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-sanitaeter"> <Input id="edit-fahrzeugtyp-sanitaeter" name={field.name} type="number" min={0} max={99} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(parseCountInput(e.target.value))} placeholder="z.B. 2" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="notarzt"> {(field) => ( <FormField label="Notarzt" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-notarzt"> <Input id="edit-fahrzeugtyp-notarzt" name={field.name} type="number" min={0} max={99} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(parseCountInput(e.target.value))} placeholder="z.B. 1" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="funktrupp"> {(field) => ( <FormField label="Funktrupp" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-funktrupp"> <Input id="edit-fahrzeugtyp-funktrupp" name={field.name} type="number" min={0} max={99} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(parseCountInput(e.target.value))} placeholder="z.B. 0" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> <form.Field name="helfer"> {(field) => ( <FormField label="Helfer" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeugtyp-helfer"> <Input id="edit-fahrzeugtyp-helfer" name={field.name} type="number" min={0} max={99} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(parseCountInput(e.target.value))} placeholder="z.B. 0" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> </div> )} </div> </div> </Dialog.Body> <Dialog.Footer> <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}> Abbrechen </Button> <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}> {([canSubmit, isFormSubmitting]) => ( <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}> Änderungen speichern </Button> )} </form.Subscribe> </Dialog.Footer> </form> </Dialog> );
};
