# Shared Schemas - Quick Reference

Schnellreferenz für die Verwendung der Shared Zod Schemas.

## 📦 Import

```typescript
import {
  // Username
  usernameSchema,
  type Username,

  // Password
  passwordSchema,
  PASSWORD_CRITERIA,
  type Password,

  // Invite-Code
  inviteCodeSchema, // Backend (strikte Validierung)
  inviteCodeSchemaNormalized, // Frontend (Auto-Uppercase)
  INVITE_CODE_CRITERIA,
  type InviteCode,

  // Server-URL
  serverUrlSchema,
  type ServerUrl,
} from '@bluelight-hub/shared/schemas';
```

## 🔍 Schema Übersicht

| Schema                       | Min | Max | Erlaubte Zeichen | Besonderheit       |
| ---------------------------- | --- | --- | ---------------- | ------------------ |
| `usernameSchema`             | 3   | 20  | `a-zA-Z0-9_-`    | -                  |
| `passwordSchema`             | 8   | 128 | Alle             | Komplexitätsregeln |
| `inviteCodeSchema`           | 8   | 8   | `A-Z0-9`         | Nur Uppercase      |
| `inviteCodeSchemaNormalized` | 8   | 8   | `A-Z0-9`         | Auto-Uppercase     |
| `serverUrlSchema`            | -   | -   | URL              | http/https only    |

## 💻 Frontend (TanStack Form)

### Setup

```typescript
import { z } from 'zod';
import { usernameSchema, passwordSchema } from '@bluelight-hub/shared/schemas';

const schema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwörter stimmen nicht überein',
    path: ['passwordConfirm'],
  });
```

### Formular

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

const form = useForm({
  defaultValues: { username: '', password: '' },
  validatorAdapter: zodValidator(),
  validators: { onChange: schema },
});
```

### Invite-Code (mit Auto-Uppercase)

```typescript
import { inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

const schema = z.object({
  code: inviteCodeSchemaNormalized, // User kann lowercase eingeben!
});
```

## 🔧 Backend (NestJS DTOs)

### Custom Decorator (einmalig erstellen)

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

### DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { usernameSchema, passwordSchema, inviteCodeSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class RegisterDto {
  @ApiProperty({ description: 'Invite-Code', example: 'ABC12345' })
  @IsString()
  @IsNotEmpty()
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;

  @ApiProperty({ description: 'Nutzername', example: 'user123' })
  @IsString()
  @IsNotEmpty()
  @ValidateWithZod(usernameSchema)
  username!: string;

  @ApiProperty({ description: 'Passwort', example: 'MyPass123!' })
  @IsString()
  @IsNotEmpty()
  @ValidateWithZod(passwordSchema)
  password!: string;
}
```

## ✅ Validierungs-Beispiele

### Username

```typescript
usernameSchema.parse('admin'); // ✅
usernameSchema.parse('user_123'); // ✅
usernameSchema.parse('ab'); // ❌ Min. 3 Zeichen
usernameSchema.parse('user@test'); // ❌ Ungültige Zeichen
```

### Password

```typescript
passwordSchema.parse('MyPass123!'); // ✅
passwordSchema.parse('short'); // ❌ Min. 8 Zeichen
passwordSchema.parse('alllowercase1!'); // ❌ Mind. ein Großbuchstabe
```

### Invite-Code

```typescript
// Standard (Backend)
inviteCodeSchema.parse('ABC12345'); // ✅
inviteCodeSchema.parse('abc12345'); // ❌ Nur Uppercase

// Normalized (Frontend)
inviteCodeSchemaNormalized.parse('abc12345'); // ✅ → 'ABC12345'
inviteCodeSchemaNormalized.parse('ABC12345'); // ✅ → 'ABC12345'
```

### Server-URL

```typescript
serverUrlSchema.parse('https://api.example.com'); // ✅
serverUrlSchema.parse('http://localhost:3091'); // ✅
serverUrlSchema.parse('ftp://server.com'); // ❌ Nur http/https
```

## 🧪 Testing

### Frontend (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { inviteCodeSchema } from '@bluelight-hub/shared/schemas';

describe('inviteCodeSchema', () => {
  it('should accept valid code', () => {
    expect(inviteCodeSchema.safeParse('ABC12345').success).toBe(true);
  });
});
```

### Backend (Jest)

```typescript
import { validate } from 'class-validator';
import { RegisterDto } from '../register.dto';

describe('RegisterDto', () => {
  it('should validate valid data', async () => {
    const dto = new RegisterDto();
    dto.inviteCode = 'ABC12345';
    dto.username = 'user123';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

## 📝 Criteria Constants

### Password

```typescript
import { PASSWORD_CRITERIA } from '@bluelight-hub/shared/schemas';

console.log(PASSWORD_CRITERIA);
// {
//   minLength: 8,
//   maxLength: 128,
//   requireLowercase: true,
//   requireUppercase: true,
//   requireNumber: true,
//   requireSymbol: true,
// }
```

### Invite-Code

```typescript
import { INVITE_CODE_CRITERIA } from '@bluelight-hub/shared/schemas';

console.log(INVITE_CODE_CRITERIA);
// {
//   length: 8,
//   alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
//   formatRegex: /^[A-Z0-9]{8}$/,
// }
```

## 🔨 Build Command

```bash
# Shared Package bauen
pnpm --filter @bluelight-hub/shared build
```

## 📚 Dokumentation

- **Setup & Verwendung:** [README.md](./src/schemas/README.md)
- **Schema-Details:** [SCHEMA_OVERVIEW.md](./src/schemas/SCHEMA_OVERVIEW.md)
- **Praktische Beispiele:** [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)
- **Architektur:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## ⚠️ Wichtige Regeln

### ✅ DO

- IMMER Shared Schemas für Auth-Felder verwenden
- Backend: `@ValidateWithZod` Decorator nutzen
- Frontend: `inviteCodeSchemaNormalized` für UX
- TypeScript-Typen via `z.infer<typeof schema>` ableiten

### ❌ DON'T

- NIEMALS manuelle Regex-Duplikation
- NIEMALS unterschiedliche Frontend/Backend Validierung
- NIEMALS Magic Numbers (nutze `*_CRITERIA` Konstanten)
- NIEMALS Schema-Änderungen ohne Backend-Sync

## 🔗 Schema ↔ Backend Sync

| Schema             | Backend Value Object | Location                                             |
| ------------------ | -------------------- | ---------------------------------------------------- |
| `inviteCodeSchema` | `InviteCodeValue`    | `@backend/domain/value-objects/invite-code-value.ts` |
| `passwordSchema`   | -                    | `@shared/validation/password.schema.ts`              |

**WICHTIG:** Bei Änderungen an `InviteCodeValue` muss `inviteCodeSchema` aktualisiert werden!
