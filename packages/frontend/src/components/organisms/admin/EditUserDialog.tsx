import { Button } from '@/components/atoms/button.atom';
import { Dialog } from '@/components/molecules/dialog.molecule';
import { UsernameField, RoleField } from '@/components/molecules/admin/UserFormFields';
import { type UserDto, UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { z } from 'zod';

const _editUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
    .max(30, 'Benutzername darf maximal 30 Zeichen lang sein')
    .regex(/^[a-zA-Z0-9._]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten'),
  role: z.nativeEnum(UserDtoRoleEnum),
});

type EditUserFormData = z.infer<typeof _editUserSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditUserFormData) => void;
  isSubmitting: boolean;
  user: UserDto | null;
}

export const EditUserDialog = ({ isOpen, onClose, onSubmit, isSubmitting, user }: EditUserDialogProps) => {
  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      role: (user?.role || UserDtoRoleEnum.User) as UserDtoRoleEnum,
    },
    onSubmit: ({ value }) => {
      if (user) {
        onSubmit(user.id, value);
      }
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      form.setFieldValue('username', user.username);
      form.setFieldValue('role', user.role);
    }
  }, [user, form]);

  const handleClose = () => {
    // Prevent closing during form submission
    if (form.state.isSubmitting || isSubmitting) {
      return;
    }
    form.reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="relative">
        <Dialog.Title>Benutzer bearbeiten</Dialog.Title>
        <Dialog.CloseButton onClose={handleClose} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            <form.Field name="username">{(field) => <UsernameField field={field} />}</form.Field>

            <form.Field name="role">{(field) => <RoleField field={field} />}</form.Field>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => {
              const submitting = isFormSubmitting || isSubmitting;
              return (
                <Button type="submit" variant="primary" disabled={!canSubmit || submitting} loading={submitting}>
                  Änderungen speichern
                </Button>
              );
            }}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
