import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import { Dialog } from '@/components/molecules/dialog.molecule';
import { Button } from '@/components/atoms/button.atom';
import { Input } from '@/components/atoms/input.atom';
import { Select } from '@/components/atoms/select.atom';
import { FormField } from '@/components/atoms/form-field.atom';

const _createUserSchema = z.object({
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein'),
  role: z.enum(UserDtoRoleEnum),
});

type CreateUserFormData = z.infer<typeof _createUserSchema>;

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserFormData) => void;
  isSubmitting: boolean;
}

export const CreateUserDialog = ({ isOpen, onClose, onSubmit, isSubmitting }: CreateUserDialogProps) => {
  const form = useForm({
    defaultValues: {
      username: '',
      role: UserDtoRoleEnum.User as UserDtoRoleEnum,
    },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="relative">
        <Dialog.Title>Neuen Benutzer erstellen</Dialog.Title>
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
            <form.Field name="username">
              {(field) => (
                <FormField label="Benutzername" error={field.state.meta.errors[0]} required>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. max.mustermann"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <FormField label="Rolle" error={field.state.meta.errors[0]} required>
                  <Select
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value as UserDtoRoleEnum)}
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  >
                    <option value={UserDtoRoleEnum.User}>Benutzer</option>
                    <option value={UserDtoRoleEnum.Admin}>Admin</option>
                    <option value={UserDtoRoleEnum.SuperAdmin}>Super-Admin</option>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" variant="primary" disabled={!canSubmit || isFormSubmitting} loading={isSubmitting}>
                Benutzer erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
