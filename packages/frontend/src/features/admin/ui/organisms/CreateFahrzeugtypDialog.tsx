import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { CreateFahrzeugtypDto } from '@/features/admin/api';
import { FAHRZEUGTYP_KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
const optionalCountSchema = z.union([z.literal(''), z.number().int().min(0, 'Wert muss mindestens 0 sein').max(99, 'Wert darf maximal 99 sein')]);
const createFahrzeugtypSchema = z.object({
  code: z.string().min(2, 'Code muss mindestens 2 Zeichen haben').max(20, 'Code darf maximal 20 Zeichen haben'),
  bezeichnung: z.string().min(2, 'Bezeichnung muss mindestens 2 Zeichen haben').max(100, 'Bezeichnung darf maximal 100 Zeichen haben'),
  kategorie: z.enum(['RETTUNGSDIENST', 'FUEHRUNG', 'TRANSPORT', 'SONSTIGES']),
  beschreibung: z.string().max(500, 'Beschreibung darf maximal 500 Zeichen haben').optional().or(z.literal('')),
  fahrer: optionalCountSchema,
  sanitaeter: optionalCountSchema,
  notarzt: optionalCountSchema,
  funktrupp: optionalCountSchema,
  helfer: optionalCountSchema,
});
interface CreateFahrzeugtypDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFahrzeugtypDto) => void;
  isSubmitting: boolean;
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
const toOptionalInteger = (value: number | ''): number | undefined => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}; /** * Dialog zum Erstellen eines neuen Fahrzeugtyps. */
export const CreateFahrzeugtypDialog = ({ isOpen, onClose, onSubmit, isSubmitting }: CreateFahrzeugtypDialogProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const form = useForm({
    defaultValues: {
      code: '',
      bezeichnung: '',
      kategorie: 'RETTUNGSDIENST' as CreateFahrzeugtypDto['kategorie'],
      beschreibung: '',
      fahrer: '' as number | '',
      sanitaeter: '' as number | '',
      notarzt: '' as number | '',
      funktrupp: '' as number | '',
      helfer: '' as number | '',
    },
    validatorAdapter: zodValidator(),
    validators: { onBlur: createFahrzeugtypSchema, onSubmit: createFahrzeugtypSchema },
    onSubmit: ({ value }) => {
      const sollbesatzung: CreateFahrzeugtypDto['sollbesatzung'] = {
        fahrer: toOptionalInteger(value.fahrer),
        sanitaeter: toOptionalInteger(value.sanitaeter),
        notarzt: toOptionalInteger(value.notarzt),
        funktrupp: toOptionalInteger(value.funktrupp),
        helfer: toOptionalInteger(value.helfer),
      };
      const hasSollbesatzung = Object.values(sollbesatzung).some((entry) => entry !== undefined);
      onSubmit({
        code: value.code,
        bezeichnung: value.bezeichnung,
        kategorie: value.kategorie,
        beschreibung: value.beschreibung || undefined,
        sollbesatzung: hasSollbesatzung ? sollbesatzung : undefined,
      });
    },
  });
  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setShowAdvanced(false);
      onClose();
    }
  };
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {' '}
      <Dialog.Title>Neuen Fahrzeugtyp erstellen</Dialog.Title>{' '}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {' '}
        <Dialog.Body>
          {' '}
          <div className="space-y-4">
            {' '}
            <form.Field name="code">
              {' '}
              {(field) => (
                <FormField label="Code" error={field.state.meta.errors[0]} required htmlFor="create-fahrzeugtyp-code">
                  {' '}
                  <Input
                    id="create-fahrzeugtyp-code"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    placeholder="z.B. RTW"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            <form.Field name="bezeichnung">
              {' '}
              {(field) => (
                <FormField label="Bezeichnung" error={field.state.meta.errors[0]} required htmlFor="create-fahrzeugtyp-bezeichnung">
                  {' '}
                  <Input
                    id="create-fahrzeugtyp-bezeichnung"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Rettungswagen"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            <form.Field name="kategorie">
              {' '}
              {(field) => (
                <FormField label="Kategorie" required htmlFor="create-fahrzeugtyp-kategorie">
                  {' '}
                  <Select
                    id="create-fahrzeugtyp-kategorie"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value as CreateFahrzeugtypDto['kategorie'])}
                    options={KATEGORIE_OPTIONS.map((option) => ({ ...option }))}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            <form.Field name="beschreibung">
              {' '}
              {(field) => (
                <FormField label="Beschreibung" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-beschreibung">
                  {' '}
                  <Textarea
                    id="create-fahrzeugtyp-beschreibung"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optionale Beschreibung"
                    rows={3}
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            <div className="rounded-lg border border-border-subtle p-3">
              {' '}
              <div className="flex items-center justify-between gap-4">
                {' '}
                <div>
                  {' '}
                  <p className="font-medium text-text-primary text-sm ">Sollbesatzung (optional)</p>{' '}
                  <p className="text-text-muted text-xs ">Definiert die empfohlene Besetzung für diesen Fahrzeugtyp.</p>{' '}
                </div>{' '}
                <Button type="button" size="sm" appearance="ghost" intent="secondary" onClick={() => setShowAdvanced((prev) => !prev)}>
                  {' '}
                  {showAdvanced ? 'Ausblenden' : 'Bearbeiten'}{' '}
                </Button>{' '}
              </div>{' '}
              {showAdvanced && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {' '}
                  <form.Field name="fahrer">
                    {' '}
                    {(field) => (
                      <FormField label="Fahrer" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-fahrer">
                        {' '}
                        <Input
                          id="create-fahrzeugtyp-fahrer"
                          name={field.name}
                          type="number"
                          min={0}
                          max={99}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseCountInput(e.target.value))}
                          placeholder="z.B. 1"
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                          fullWidth
                        />{' '}
                      </FormField>
                    )}{' '}
                  </form.Field>{' '}
                  <form.Field name="sanitaeter">
                    {' '}
                    {(field) => (
                      <FormField label="Sanitäter" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-sanitaeter">
                        {' '}
                        <Input
                          id="create-fahrzeugtyp-sanitaeter"
                          name={field.name}
                          type="number"
                          min={0}
                          max={99}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseCountInput(e.target.value))}
                          placeholder="z.B. 2"
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                          fullWidth
                        />{' '}
                      </FormField>
                    )}{' '}
                  </form.Field>{' '}
                  <form.Field name="notarzt">
                    {' '}
                    {(field) => (
                      <FormField label="Notarzt" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-notarzt">
                        {' '}
                        <Input
                          id="create-fahrzeugtyp-notarzt"
                          name={field.name}
                          type="number"
                          min={0}
                          max={99}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseCountInput(e.target.value))}
                          placeholder="z.B. 1"
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                          fullWidth
                        />{' '}
                      </FormField>
                    )}{' '}
                  </form.Field>{' '}
                  <form.Field name="funktrupp">
                    {' '}
                    {(field) => (
                      <FormField label="Funktrupp" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-funktrupp">
                        {' '}
                        <Input
                          id="create-fahrzeugtyp-funktrupp"
                          name={field.name}
                          type="number"
                          min={0}
                          max={99}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseCountInput(e.target.value))}
                          placeholder="z.B. 0"
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                          fullWidth
                        />{' '}
                      </FormField>
                    )}{' '}
                  </form.Field>{' '}
                  <form.Field name="helfer">
                    {' '}
                    {(field) => (
                      <FormField label="Helfer" error={field.state.meta.errors[0]} htmlFor="create-fahrzeugtyp-helfer">
                        {' '}
                        <Input
                          id="create-fahrzeugtyp-helfer"
                          name={field.name}
                          type="number"
                          min={0}
                          max={99}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseCountInput(e.target.value))}
                          placeholder="z.B. 0"
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                          fullWidth
                        />{' '}
                      </FormField>
                    )}{' '}
                  </form.Field>{' '}
                </div>
              )}{' '}
            </div>{' '}
          </div>{' '}
        </Dialog.Body>{' '}
        <Dialog.Footer>
          {' '}
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}>
            {' '}
            Abbrechen{' '}
          </Button>{' '}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {' '}
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}>
                {' '}
                Fahrzeugtyp erstellen{' '}
              </Button>
            )}{' '}
          </form.Subscribe>{' '}
        </Dialog.Footer>{' '}
      </form>{' '}
    </Dialog>
  );
};
