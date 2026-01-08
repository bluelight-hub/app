# Shared Zod Schemas

Wiederverwendbare Zod-Schemas für konsistente Validierung zwischen **Frontend** und **Backend**.

## 📚 Verfügbare Schemas

| Schema | Import | Beschreibung |
|--------|--------|--------------|
| **Username** | `usernameSchema` | 3-20 Zeichen, alphanumerisch + `_-` |
| **Password** | `passwordSchema` | Min. 8 Zeichen, Komplexitätsregeln |
| **Invite Code** | `inviteCodeSchema` | Exakt 8 Zeichen, A-Z0-9 (uppercase) |
| **Invite Code (normalized)** | `inviteCodeSchemaNormalized` | Auto-Uppercase-Konvertierung |
| **Server URL** | `serverUrlSchema` | Gültige http/https URL |

## 🚀 Installation & Setup

```bash
# Shared Package bauen
pnpm --filter @bluelight-hub/shared build
```

### Package Exports

```json
// packages/shared/package.json
{
  "exports": {
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "import": "./dist/schemas/index.js"
    }
  }
}
```

## 📖 Verwendung

### Frontend: TanStack Form

#### Setup-Formular (Username + Password)

```typescript
// packages/frontend/src/features/auth/schemas/setup-form.schema.ts
import { z } from 'zod';
import { usernameSchema, passwordSchema } from '@bluelight-hub/shared/schemas';

export const setupFormSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwörter stimmen nicht überein',
    path: ['passwordConfirm'],
  });

export type SetupFormValues = z.infer<typeof setupFormSchema>;
```

#### Register-Formular (Invite-Code)

```typescript
// packages/frontend/src/features/auth/schemas/register-form.schema.ts
import { z } from 'zod';
import { usernameSchema, inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

export const registerFormSchema = z.object({
  inviteCode: inviteCodeSchemaNormalized, // Auto-Uppercase!
  username: usernameSchema,
});
```

#### Komponente

```typescript
// packages/frontend/src/features/auth/ui/organisms/SetupForm.tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { setupFormSchema } from '../../schemas/setup-form.schema';

export function SetupForm() {
  const form = useForm({
    defaultValues: { username: '', password: '', passwordConfirm: '' },
    validatorAdapter: zodValidator(),
    validators: { onChange: setupFormSchema },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="username">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
    </form>
  );
}
```

### Backend: NestJS DTOs

#### Custom Validator Decorator (einmalig erstellen)

```typescript
// packages/backend/src/application/common/validation/validate-with-zod.decorator.ts
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { ZodSchema } from 'zod';

export function ValidateWithZod(schema: ZodSchema, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateWithZod',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return schema.safeParse(value).success;
        },
        defaultMessage(args: ValidationArguments) {
          const result = schema.safeParse(args.value);
          return result.success ? '' : result.error.errors[0]?.message || 'Validierung fehlgeschlagen';
        },
      },
    });
  };
}
```

#### Complete-Setup DTO

```typescript
// packages/backend/src/application/admin/dto/complete-setup.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { passwordSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class CompleteSetupDto {
  @ApiProperty({ description: 'Nutzername (3-20 Zeichen)', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  @ValidateWithZod(usernameSchema)
  username!: string;

  @ApiProperty({ description: 'Passwort (min. 8 Zeichen)', example: 'MyPass123!' })
  @IsString()
  @IsNotEmpty()
  @ValidateWithZod(passwordSchema)
  password!: string;
}
```

#### Register DTO (mit Invite-Code)

```typescript
// packages/backend/src/application/auth/dto/register.dto.ts
import { inviteCodeSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class RegisterDto {
  @ApiProperty({ description: 'Invite-Code (8 Zeichen)', example: 'ABC12345' })
  @IsString()
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;

  @ApiProperty({ description: 'Nutzername', example: 'user123' })
  @IsString()
  @ValidateWithZod(usernameSchema)
  username!: string;
}
```

## 🔍 Schema-Details

### Username

```typescript
import { usernameSchema } from '@bluelight-hub/shared/schemas';

// Regeln: 3-20 Zeichen, a-zA-Z0-9_-
usernameSchema.parse('admin'); // ✅ OK
usernameSchema.parse('ab'); // ❌ "Min. 3 Zeichen"
usernameSchema.parse('user@test'); // ❌ "Nur Buchstaben, Zahlen, _, -"
```

### Password

```typescript
import { passwordSchema, PASSWORD_CRITERIA } from '@bluelight-hub/shared/schemas';

// Regeln: Min. 8 Zeichen, Gross/Klein/Zahl/Sonderzeichen
passwordSchema.parse('MyPass123!'); // ✅ OK
passwordSchema.parse('short'); // ❌ "Min. 8 Zeichen"
passwordSchema.parse('alllowercase1!'); // ❌ "Mind. ein Großbuchstabe"
```

### Invite-Code

```typescript
import { inviteCodeSchema, inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

// Regeln: Exakt 8 Zeichen, A-Z0-9 (nur uppercase)
inviteCodeSchema.parse('ABC12345'); // ✅ OK
inviteCodeSchema.parse('abc12345'); // ❌ "Nur Großbuchstaben"

// Normalized Variant (Auto-Uppercase)
inviteCodeSchemaNormalized.parse('abc12345'); // ✅ OK → 'ABC12345'
```

## ⚙️ TypeScript Types

```typescript
import type { Username, Password, InviteCode } from '@bluelight-hub/shared/schemas';

interface User {
  username: Username;
  password?: Password;
}

interface RegistrationData {
  inviteCode: InviteCode;
  username: Username;
}
```

## 🔗 Backend Value Object Synchronisation

| Schema | Backend Value Object | Location |
|--------|---------------------|----------|
| `inviteCodeSchema` | `InviteCodeValue` | `@backend/domain/value-objects/invite-code-value.ts` |
| `passwordSchema` | - | `@bluelight-hub/shared/validation/password.schema.ts` |
| `usernameSchema` | - | - |

**Wichtig:** Bei Änderungen an Backend Value Objects MUSS das entsprechende Schema aktualisiert werden!

## 📝 Best Practices

### ✅ DO

- IMMER Shared Schemas für Auth-Felder verwenden
- Backend: `@ValidateWithZod` Decorator nutzen
- Frontend: `inviteCodeSchemaNormalized` für bessere UX
- TypeScript-Typen via `z.infer<typeof schema>` ableiten

### ❌ DON'T

- NIEMALS manuelle Regex-Duplikation
- NIEMALS unterschiedliche Frontend/Backend Validierung
- NIEMALS Magic Numbers (nutze `*_CRITERIA` Konstanten)

## 🧪 Testing

```typescript
// packages/shared/src/schemas/auth/__tests__/invite-code.schema.spec.ts
import { inviteCodeSchema, inviteCodeSchemaNormalized } from '../invite-code.schema';

describe('inviteCodeSchema', () => {
  it('should accept valid code', () => {
    expect(inviteCodeSchema.safeParse('ABC12345').success).toBe(true);
  });

  it('should reject lowercase', () => {
    expect(inviteCodeSchema.safeParse('abc12345').success).toBe(false);
  });
});

describe('inviteCodeSchemaNormalized', () => {
  it('should normalize lowercase to uppercase', () => {
    const result = inviteCodeSchemaNormalized.safeParse('abc12345');
    expect(result.success).toBe(true);
    expect(result.data).toBe('ABC12345');
  });
});
```

## 🔄 Migration Beispiel

### Vorher (Duplikation)

```typescript
// ❌ Backend DTO
export class LoginDto {
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;
}

// ❌ Frontend Schema
const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
});
```

### Nachher (Shared)

```typescript
// ✅ Backend DTO
import { usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class LoginDto {
  @ValidateWithZod(usernameSchema)
  username!: string;
}

// ✅ Frontend Schema
import { usernameSchema } from '@bluelight-hub/shared/schemas';

const schema = z.object({ username: usernameSchema });
```
