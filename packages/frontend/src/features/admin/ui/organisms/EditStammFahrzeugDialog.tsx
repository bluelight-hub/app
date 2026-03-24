import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { StammFahrzeugDto, UpdateStammFahrzeugDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom'; /** * Zod-Schema für UpdateStammFahrzeug Form. * Hinweis: fahrzeugtypId ist IMMUTABLE und kann nicht geändert werden. */
const updateStammFahrzeugSchema = z.object({
  rufname: z.string().min(2, 'Rufname muss mindestens 2 Zeichen haben').max(100, 'Rufname darf maximal 100 Zeichen haben'),
  funkrufname: z.string().min(2, 'Funkrufname muss mindestens 2 Zeichen haben').max(50, 'Funkrufname darf maximal 50 Zeichen haben'),
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
interface EditStammFahrzeugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateStammFahrzeugDto) => void;
  isSubmitting: boolean;
  fahrzeug: StammFahrzeugDto | null;
} /** * Dialog zum Bearbeiten eines Stamm-Fahrzeugs. * Hinweis: Fahrzeugtyp kann nicht geändert werden (IMMUTABLE). */
export const EditStammFahrzeugDialog = ({ isOpen, onClose, onSubmit, isSubmitting, fahrzeug }: EditStammFahrzeugDialogProps) => {
  const form = useForm({
    defaultValues: {
      rufname: fahrzeug?.rufname || '',
      funkrufname: fahrzeug?.funkrufname || '',
      kennzeichen: fahrzeug?.kennzeichen || '',
      baujahr: (fahrzeug?.baujahr || '') as number | '',
      funkkenungBOS: fahrzeug?.funkkenungBOS || '',
    },
    validatorAdapter: zodValidator(),
    validators: { onBlur: updateStammFahrzeugSchema },
    onSubmit: ({ value }) => {
      onSubmit({
        rufname: value.rufname,
        funkrufname: value.funkrufname,
        kennzeichen: value.kennzeichen || undefined,
        baujahr: value.baujahr ? Number(value.baujahr) : undefined,
        funkkenungBOS: value.funkkenungBOS || undefined,
      });
    },
  }); // Sync form values when fahrzeug changes useEffect(() => { if (fahrzeug) { form.reset(); form.setFieldValue('rufname', fahrzeug.rufname); form.setFieldValue('funkrufname', fahrzeug.funkrufname); form.setFieldValue('kennzeichen', fahrzeug.kennzeichen || ''); form.setFieldValue('baujahr', fahrzeug.baujahr || ''); form.setFieldValue('funkkenungBOS', fahrzeug.funkkenungBOS || ''); } }, [fahrzeug, form]); const handleClose = () => { if (!isSubmitting) { form.reset(); onClose(); } }; return ( <Dialog isOpen={isOpen} onClose={handleClose}> <Dialog.Title>Fahrzeug bearbeiten</Dialog.Title> <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} > <Dialog.Body> <div className="space-y-4"> {/* Fahrzeugtyp (IMMUTABLE - nur anzeigen) */} {fahrzeug && ( <div className="rounded-lg border border-border-subtle bg-surface-raised p-3 "> <Text size="sm" color="muted" className="mb-1"> Fahrzeugtyp (nicht änderbar) </Text> <Badge variant="info"> {fahrzeug.fahrzeugtyp.code} - {fahrzeug.fahrzeugtyp.bezeichnung} </Badge> </div> )} {/* Rufname */} <form.Field name="rufname"> {(field) => ( <FormField label="Rufname" error={field.state.meta.errors[0]} required htmlFor="edit-fahrzeug-rufname"> <Input id="edit-fahrzeug-rufname" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. RTW 1" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Funkrufname */} <form.Field name="funkrufname"> {(field) => ( <FormField label="Funkrufname" error={field.state.meta.errors[0]} required htmlFor="edit-fahrzeug-funkrufname"> <Input id="edit-fahrzeug-funkrufname" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. Rotkreuz 83/1" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Kennzeichen */} <form.Field name="kennzeichen"> {(field) => ( <FormField label="Kennzeichen" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeug-kennzeichen"> <Input id="edit-fahrzeug-kennzeichen" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value.toUpperCase())} placeholder="z.B. DA-RK 101" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* Baujahr */} <form.Field name="baujahr"> {(field) => ( <FormField label="Baujahr" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeug-baujahr"> <Input id="edit-fahrzeug-baujahr" name={field.name} type="number" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder="z.B. 2020" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> {/* BOS-Funkkennung */} <form.Field name="funkkenungBOS"> {(field) => ( <FormField label="BOS-Funkkennung" error={field.state.meta.errors[0]} htmlFor="edit-fahrzeug-funkkenungbos"> <Input id="edit-fahrzeug-funkkenungbos" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Optionale BOS-Funkkennung" variant={field.state.meta.errors.length > 0 ? 'error' : 'default'} fullWidth /> </FormField> )} </form.Field> </div> </Dialog.Body> <Dialog.Footer> <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}> Abbrechen </Button> <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}> {([canSubmit, isFormSubmitting]) => ( <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}> Änderungen speichern </Button> )} </form.Subscribe> </Dialog.Footer> </form> </Dialog> );
};
