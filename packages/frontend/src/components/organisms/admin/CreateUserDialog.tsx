import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button, Dialog, Field, Input, NativeSelect, Portal, VStack } from '@chakra-ui/react';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';

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
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Neuen Benutzer erstellen</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <Dialog.Body>
                <VStack>
                  <form.Field
                    name="username"
                    children={(field) => (
                      <Field.Root>
                        <Field.Label>Benutzername</Field.Label>
                        <Input name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="z.B. max.mustermann" />
                        {field.state.meta.errors.length > 0 && <Field.ErrorText>{field.state.meta.errors[0]}</Field.ErrorText>}
                      </Field.Root>
                    )}
                  />

                  <form.Field
                    name="role"
                    children={(field) => (
                      <Field.Root>
                        <Field.Label>Rolle</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value as UserDtoRoleEnum)}>
                            <option value={UserDtoRoleEnum.User}>Benutzer</option>
                            <option value={UserDtoRoleEnum.Admin}>Admin</option>
                            <option value={UserDtoRoleEnum.SuperAdmin}>Super-Admin</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        {field.state.meta.errors.length > 0 && <Field.ErrorText>{field.state.meta.errors[0]}</Field.ErrorText>}
                      </Field.Root>
                    )}
                  />
                </VStack>
              </Dialog.Body>

              <Dialog.Footer>
                <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                  Abbrechen
                </Button>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  children={([canSubmit, isFormSubmitting]) => (
                    <Button type="submit" colorPalette="blue" disabled={!canSubmit || isFormSubmitting} loading={isSubmitting}>
                      Benutzer erstellen
                    </Button>
                  )}
                />
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
