import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { CreateStammPersonDto, QualifikationDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Text } from '@/shared/ui/atoms/text.atom'; /** * Zod-Schema für CreateStammPerson Form. */
const createStammPersonSchema = z.object({
  vorname: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben').max(100, 'Vorname darf maximal 100 Zeichen haben'),
  nachname: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben').max(100, 'Nachname darf maximal 100 Zeichen haben'),
  personalnummer: z.string().min(1, 'Personalnummer ist erforderlich').max(50, 'Personalnummer darf maximal 50 Zeichen haben'),
  funkkenungBOS: z.string().min(2, 'BOS-Funkkennung muss mindestens 2 Zeichen haben').max(50, 'BOS-Funkkennung darf maximal 50 Zeichen haben').optional().or(z.literal('')),
  qualifikationIds: z.array(z.string()).max(50, 'Maximal 50 Qualifikationen erlaubt').optional(),
});
interface CreateStammPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStammPersonDto) => void;
  isSubmitting: boolean;
  qualifikationen: QualifikationDto[];
  qualifikationenLoading: boolean;
} /** * Dialog zum Erstellen einer neuen Stamm-Person. */
export const CreateStammPersonDialog = ({ isOpen, onClose, onSubmit, isSubmitting, qualifikationen, qualifikationenLoading }: CreateStammPersonDialogProps) => {
  const form = useForm({
    defaultValues: { vorname: '', nachname: '', personalnummer: '', funkkenungBOS: '', qualifikationIds: [] as string[] },
    validatorAdapter: zodValidator(),
    validators: { onBlur: createStammPersonSchema },
    onSubmit: ({ value }) => {
      onSubmit({
        vorname: value.vorname,
        nachname: value.nachname,
        personalnummer: value.personalnummer,
        funkkenungBOS: value.funkkenungBOS || undefined,
        qualifikationIds: value.qualifikationIds.length > 0 ? value.qualifikationIds : undefined,
      });
    },
  });
  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  }; // Filter nur aktive Qualifikationen const activeQualifikationen = qualifikationen.filter((q) => q.istAktiv); return ( <Dialog isOpen={isOpen} onClose={handleClose}> <Dialog.Title>Neue Person erstellen</Dialog.Title> <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} > <Dialog.Body> <div className="space-y-4"> {/* Vorname */} <form.Field name="vorname"> {(field) => ( <FormField label="Vorname" error={field.state.meta.errors[0]} required htmlFor="create-person-vorname"> <Input id="create-person-vorname" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. Max" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Nachname */} <form.Field name="nachname"> {(field) => ( <FormField label="Nachname" error={field.state.meta.errors[0]} required htmlFor="create-person-nachname"> <Input id="create-person-nachname" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. Mustermann" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Personalnummer */} <form.Field name="personalnummer"> {(field) => ( <FormField label="Personalnummer" error={field.state.meta.errors[0]} required htmlFor="create-person-personalnummer"> <Input id="create-person-personalnummer" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. 12345 oder MA-2024-001" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* BOS-Funkkennung */} <form.Field name="funkkenungBOS"> {(field) => ( <FormField label="BOS-Funkkennung" error={field.state.meta.errors[0]} htmlFor="create-person-funkkenungbos"> <Input id="create-person-funkkenungbos" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Optionale BOS-Funkkennung" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Qualifikationen Multi-Select */} <form.Field name="qualifikationIds"> {(field) => ( <FormField label="Qualifikationen" error={field.state.meta.errors[0]} htmlFor="create-person-qualifikationen"> {qualifikationenLoading ? ( <Text size="sm" color="muted"> Lädt Qualifikationen... </Text> ) : activeQualifikationen.length === 0 ? ( <Text size="sm" color="muted"> Keine aktiven Qualifikationen verfügbar. </Text> ) : ( <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border-subtle p-3"> {activeQualifikationen.map((qual) => ( <label key={qual.id} htmlFor={`create-person-qual-${qual.id}`} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-surface-raised "> <Checkbox id={`create-person-qual-${qual.id}`} checked={field.state.value.includes(qual.id)} onChange={(checked) => { const newValue = checked ? [...field.state.value, qual.id] : field.state.value.filter((id) => id !== qual.id); field.handleChange(newValue); }} /> <span className="font-mono text-sm">{qual.abkuerzung}</span> <span className="text-text-secondary text-sm ">- {qual.name}</span> </label> ))} </div> )} </FormField> )} </form.Field> </div> </Dialog.Body> <Dialog.Footer> <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}> Abbrechen </Button> <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}> {([canSubmit, isFormSubmitting]) => ( <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}> Person erstellen </Button> )} </form.Subscribe> </Dialog.Footer> </form> </Dialog> );
};
