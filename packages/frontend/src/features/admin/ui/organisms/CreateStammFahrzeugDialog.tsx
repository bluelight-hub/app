import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { CreateStammFahrzeugDto, FahrzeugtypDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom'; /** * Zod-Schema für CreateStammFahrzeug Form. */
const createStammFahrzeugSchema = z.object({
  rufname: z.string().min(2, 'Rufname muss mindestens 2 Zeichen haben').max(100, 'Rufname darf maximal 100 Zeichen haben'),
  funkrufname: z.string().min(2, 'Funkrufname muss mindestens 2 Zeichen haben').max(50, 'Funkrufname darf maximal 50 Zeichen haben'),
  fahrzeugtypId: z.string().min(1, 'Fahrzeugtyp ist erforderlich'),
  kennzeichen: z.string().min(2, 'Kennzeichen muss mindestens 2 Zeichen haben').max(20, 'Kennzeichen darf maximal 20 Zeichen haben').optional().or(z.literal('')),
  baujahr: z.coerce
    .number()
    .int()
    .min(1900, 'Baujahr muss nach 1900 sein')
    .max(new Date().getFullYear() + 1, 'Baujahr liegt in der Zukunft')
    .optional()
    .or(z.literal('')),
  funkkenungBOS: z.string().min(2, 'BOS-Funkkennung muss mindestens 2 Zeichen haben').max(50, 'BOS-Funkkennung darf maximal 50 Zeichen haben').optional().or(z.literal('')),
});
interface CreateStammFahrzeugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStammFahrzeugDto) => void;
  isSubmitting: boolean;
  fahrzeugtypen: FahrzeugtypDto[];
  fahrzeugtypenLoading: boolean;
} /** * Dialog zum Erstellen eines neuen Stamm-Fahrzeugs. */
export const CreateStammFahrzeugDialog = ({ isOpen, onClose, onSubmit, isSubmitting, fahrzeugtypen, fahrzeugtypenLoading }: CreateStammFahrzeugDialogProps) => {
  const form = useForm({
    defaultValues: { rufname: '', funkrufname: '', fahrzeugtypId: '', kennzeichen: '', baujahr: '' as number | '', funkkenungBOS: '' },
    validatorAdapter: zodValidator(),
    validators: { onBlur: createStammFahrzeugSchema },
    onSubmit: ({ value }) => {
      onSubmit({
        rufname: value.rufname,
        funkrufname: value.funkrufname,
        fahrzeugtypId: value.fahrzeugtypId,
        kennzeichen: value.kennzeichen || undefined,
        baujahr: value.baujahr ? Number(value.baujahr) : undefined,
        funkkenungBOS: value.funkkenungBOS || undefined,
      });
    },
  });
  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };
  const fahrzeugtypOptions = fahrzeugtypen.map((typ) => ({ value: typ.id, label: `${typ.code} - ${typ.bezeichnung}` }));
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {' '}
      <Dialog.Title>Neues Fahrzeug erstellen</Dialog.Title>{' '}
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
            {/* Rufname */}{' '}
            <form.Field name="rufname">
              {' '}
              {(field) => (
                <FormField label="Rufname" error={field.state.meta.errors[0]} required htmlFor="create-fahrzeug-rufname">
                  {' '}
                  <Input
                    id="create-fahrzeug-rufname"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. RTW 1"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            {/* Funkrufname */}{' '}
            <form.Field name="funkrufname">
              {' '}
              {(field) => (
                <FormField label="Funkrufname" error={field.state.meta.errors[0]} required htmlFor="create-fahrzeug-funkrufname">
                  {' '}
                  <Input
                    id="create-fahrzeug-funkrufname"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Rotkreuz 83/1"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            {/* Fahrzeugtyp */}{' '}
            <form.Field name="fahrzeugtypId">
              {' '}
              {(field) => (
                <FormField label="Fahrzeugtyp" error={field.state.meta.errors[0]} required htmlFor="create-fahrzeug-typ">
                  {' '}
                  <Select
                    id="create-fahrzeug-typ"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    options={fahrzeugtypOptions}
                    placeholder={fahrzeugtypenLoading ? 'Lädt...' : 'Fahrzeugtyp auswählen'}
                    disabled={fahrzeugtypenLoading}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            {/* Kennzeichen */}{' '}
            <form.Field name="kennzeichen">
              {' '}
              {(field) => (
                <FormField label="Kennzeichen" error={field.state.meta.errors[0]} htmlFor="create-fahrzeug-kennzeichen">
                  {' '}
                  <Input
                    id="create-fahrzeug-kennzeichen"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    placeholder="z.B. DA-RK 101"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            {/* Baujahr */}{' '}
            <form.Field name="baujahr">
              {' '}
              {(field) => (
                <FormField label="Baujahr" error={field.state.meta.errors[0]} htmlFor="create-fahrzeug-baujahr">
                  {' '}
                  <Input
                    id="create-fahrzeug-baujahr"
                    name={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="z.B. 2020"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
            {/* BOS-Funkkennung */}{' '}
            <form.Field name="funkkenungBOS">
              {' '}
              {(field) => (
                <FormField label="BOS-Funkkennung" error={field.state.meta.errors[0]} htmlFor="create-fahrzeug-funkkenungbos">
                  {' '}
                  <Input
                    id="create-fahrzeug-funkkenungbos"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optionale BOS-Funkkennung"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />{' '}
                </FormField>
              )}{' '}
            </form.Field>{' '}
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
                Fahrzeug erstellen{' '}
              </Button>
            )}{' '}
          </form.Subscribe>{' '}
        </Dialog.Footer>{' '}
      </form>{' '}
    </Dialog>
  );
};
