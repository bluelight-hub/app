import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { ManagedUserResponseDtoRoleEnum } from '@/shared';
export const USER_ROLE_OPTIONS = [
  { value: ManagedUserResponseDtoRoleEnum.User, label: 'Benutzer' },
  { value: ManagedUserResponseDtoRoleEnum.Admin, label: 'Admin' },
  { value: ManagedUserResponseDtoRoleEnum.SuperAdmin, label: 'Super-Admin' },
];
interface UsernameFieldProps {
  field: { name: string; state: { value: string; meta: { errors: Array<string | undefined> } }; handleBlur: () => void; handleChange: (value: string) => void };
}
export const UsernameField = ({ field }: UsernameFieldProps) => (
  <FormField label="Benutzername" error={field.state.meta.errors[0] as string | undefined} required htmlFor="user-username">
    {' '}
    <Input
      id="user-username"
      name={field.name}
      value={field.state.value}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
      placeholder="z.B. max.mustermann"
      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
      fullWidth
    />{' '}
  </FormField>
);
interface RoleFieldProps {
  field: {
    name: string;
    state: { value: ManagedUserResponseDtoRoleEnum; meta: { errors: Array<string | undefined> } };
    handleBlur: () => void;
    handleChange: (value: ManagedUserResponseDtoRoleEnum) => void;
  };
}
export const RoleField = ({ field }: RoleFieldProps) => (
  <FormField label="Rolle" error={field.state.meta.errors[0] as string | undefined} required htmlFor="user-role">
    {' '}
    <Select
      id="user-role"
      name={field.name}
      value={field.state.value}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value as ManagedUserResponseDtoRoleEnum)}
      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
      fullWidth
      options={USER_ROLE_OPTIONS}
    />{' '}
  </FormField>
);
