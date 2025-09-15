import { FormField } from '@/components/atoms/form-field.atom';
import { Input } from '@/components/atoms/input.atom';
import { Select } from '@/components/atoms/select.atom';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';

export const USER_ROLE_OPTIONS = [
  { value: UserDtoRoleEnum.User, label: 'Benutzer' },
  { value: UserDtoRoleEnum.Admin, label: 'Admin' },
  { value: UserDtoRoleEnum.SuperAdmin, label: 'Super-Admin' },
];

interface UsernameFieldProps {
  field: {
    name: string;
    state: {
      value: string;
      meta: {
        errors: Array<string | undefined>;
      };
    };
    handleBlur: () => void;
    handleChange: (value: string) => void;
  };
}

export const UsernameField = ({ field }: UsernameFieldProps) => (
  <FormField label="Benutzername" error={field.state.meta.errors[0] as string | undefined} required>
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
);

interface RoleFieldProps {
  field: {
    name: string;
    state: {
      value: UserDtoRoleEnum;
      meta: {
        errors: Array<string | undefined>;
      };
    };
    handleBlur: () => void;
    handleChange: (value: UserDtoRoleEnum) => void;
  };
}

export const RoleField = ({ field }: RoleFieldProps) => (
  <FormField label="Rolle" error={field.state.meta.errors[0] as string | undefined} required>
    <Select
      name={field.name}
      value={field.state.value}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value as UserDtoRoleEnum)}
      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
      fullWidth
      options={USER_ROLE_OPTIONS}
    />
  </FormField>
);
