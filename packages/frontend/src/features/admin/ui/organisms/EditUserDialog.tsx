import { Button } from '@/shared/ui/atoms/button.atom';
import { RoleField, UsernameField } from '@/features/admin/ui/molecules/UserFormFields';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { type ManagedUserResponseDto, ManagedUserResponseDtoRoleEnum } from '@/shared';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { UserPermissionsPanel } from './UserPermissionsPanel.organism';
const _editUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
    .max(30, 'Benutzername darf maximal 30 Zeichen lang sein')
    .regex(/^[a-zA-Z0-9._]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten'),
  role: z.nativeEnum(ManagedUserResponseDtoRoleEnum),
});
type EditUserFormData = z.infer<typeof _editUserSchema>;
interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditUserFormData) => void;
  isSubmitting: boolean;
  user: ManagedUserResponseDto | null;
}
type TabId = 'details' | 'permissions';
export const EditUserDialog = ({ isOpen, onClose, onSubmit, isSubmitting, user }: EditUserDialogProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const form = useForm({
    defaultValues: { username: user?.username || '', role: (user?.role || ManagedUserResponseDtoRoleEnum.User) as ManagedUserResponseDtoRoleEnum },
    onSubmit: ({ value }) => {
      if (user) {
        onSubmit(user.id, value);
      }
    },
  }); // Update form when user changes useEffect(() => { if (user) { form.setFieldValue('username', user.username); form.setFieldValue('role', user.role); } }, [user, form]); const handleClose = () => { // Prevent closing during form submission if (form.state.isSubmitting || isSubmitting) { return; } form.reset(); setActiveTab('details'); onClose(); }; return ( <Dialog isOpen={isOpen} onClose={handleClose} size="lg"> <div className="relative"> <Dialog.Title>Benutzer bearbeiten</Dialog.Title> </div> {/* Tab Navigation */} <div className="flex border-border-subtle border-b px-6" role="tablist" aria-label="Benutzer-Abschnitte"> <button type="button" role="tab" id="tab-details" aria-controls="panel-details" aria-selected={activeTab === 'details'} onClick={() => setActiveTab('details')} className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'details' ? 'border-action-primary text-action-primary' : 'border-transparent text-text-muted hover:text-text-secondary'}`} > Details </button> <button type="button" role="tab" id="tab-permissions" aria-controls="panel-permissions" aria-selected={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'permissions' ? 'border-action-primary text-action-primary' : 'border-transparent text-text-muted hover:text-text-secondary'}`} > Berechtigungen </button> </div> {activeTab === 'details' ? ( <div id="panel-details" role="tabpanel" aria-labelledby="tab-details"> <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} > <Dialog.Body> <div className="space-y-4"> <form.Field name="username">{(field) => <UsernameField field={field} />}</form.Field> <form.Field name="role">{(field) => <RoleField field={field} />}</form.Field> </div> </Dialog.Body> <Dialog.Footer> <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}> Abbrechen </Button> <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}> {([canSubmit, isFormSubmitting]) => { const submitting = isFormSubmitting || isSubmitting; return ( <Button type="submit" disabled={!canSubmit || submitting} loading={submitting}> Änderungen speichern </Button> ); }} </form.Subscribe> </Dialog.Footer> </form> </div> ) : ( <div id="panel-permissions" role="tabpanel" aria-labelledby="tab-permissions"> <Dialog.Body>{user && <UserPermissionsPanel userId={user.id} username={user.username} />}</Dialog.Body> <Dialog.Footer> <Button intent="secondary" appearance="ghost" onClick={handleClose}> Schließen </Button> </Dialog.Footer> </div> )} </Dialog> );
};
