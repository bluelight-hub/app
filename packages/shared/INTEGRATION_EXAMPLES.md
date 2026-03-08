# Shared Schemas Integration Examples

Praktische Beispiele zur Integration der Shared Zod Schemas in Frontend und Backend.

## 📦 Übersicht der verfügbaren Schemas

```typescript
import {
  // Username Schema
  usernameSchema,
  type Username,

  // Password Schema
  passwordSchema,
  PASSWORD_CRITERIA,
  type Password,

  // Invite-Code Schemas
  inviteCodeSchema,
  inviteCodeSchemaNormalized,
  INVITE_CODE_CRITERIA,
  type InviteCode,

  // Server-URL Schema
  serverUrlSchema,
  type ServerUrl,
} from '@bluelight-hub/shared/schemas';
```

## 🎯 Frontend Integration

### Beispiel 1: Admin Setup Formular

**File:** `packages/frontend/src/features/auth/schemas/setup-form.schema.ts`

```typescript
import { z } from 'zod';
import { usernameSchema, passwordSchema } from '@bluelight-hub/shared/schemas';

/**
 * Schema für das Admin-Setup-Formular.
 *
 * Nutzt Shared Schemas für konsistente Validierung mit Backend.
 */
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

**File:** `packages/frontend/src/features/auth/ui/organisms/SetupForm.tsx`

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { setupFormSchema, type SetupFormValues } from '../../schemas/setup-form.schema';
import { PASSWORD_CRITERIA } from '@bluelight-hub/shared/schemas';

export function SetupForm() {
  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      passwordConfirm: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: setupFormSchema,
    },
    onSubmit: async ({ value }) => {
      console.log('Submit:', value);
      // API Call...
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* Username Field */}
      <form.Field name="username">
        {(field) => (
          <div>
            <label>Benutzername</label>
            <input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-600">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      </form.Field>

      {/* Password Field with Criteria Display */}
      <form.Field name="password">
        {(field) => (
          <div>
            <label>Passwort</label>
            <input
              type="password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />

            {/* Password Criteria Helper */}
            <ul className="text-sm text-gray-600">
              <li>Min. {PASSWORD_CRITERIA.minLength} Zeichen</li>
              <li>Mindestens ein Großbuchstabe</li>
              <li>Mindestens ein Kleinbuchstabe</li>
              <li>Mindestens eine Zahl</li>
              <li>Mindestens ein Sonderzeichen</li>
            </ul>

            {field.state.meta.errors.length > 0 && (
              <span className="text-red-600">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      </form.Field>

      <button type="submit">Setup abschließen</button>
    </form>
  );
}
```

### Beispiel 2: Invite-Code Formular (mit Auto-Normalisierung)

**File:** `packages/frontend/src/features/admin/schemas/create-invite.schema.ts`

```typescript
import { z } from 'zod';
import { inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

/**
 * Schema für Invite-Code-Eingabe.
 *
 * Nutzt `inviteCodeSchemaNormalized` für automatische Uppercase-Konvertierung.
 * User kann Kleinbuchstaben eingeben, werden automatisch konvertiert.
 */
export const createInviteSchema = z.object({
  // Optional: User kann eigenen Code eingeben, wird auto-normalized
  customCode: inviteCodeSchemaNormalized.optional(),

  // Weitere Felder...
  expiresAt: z.date().optional(),
  maxUses: z.number().int().min(1).default(1),
});

export type CreateInviteValues = z.infer<typeof createInviteSchema>;
```

**File:** `packages/frontend/src/features/admin/ui/organisms/CreateInviteForm.tsx`

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { createInviteSchema } from '../../schemas/create-invite.schema';
import { INVITE_CODE_CRITERIA } from '@bluelight-hub/shared/schemas';

export function CreateInviteForm() {
  const form = useForm({
    defaultValues: {
      customCode: '',
      maxUses: 1,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createInviteSchema,
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="customCode">
        {(field) => (
          <div>
            <label>Custom Invite-Code (optional)</label>
            <input
              type="text"
              placeholder="z.B. ABC12345"
              maxLength={INVITE_CODE_CRITERIA.length}
              value={field.state.value}
              onChange={(e) => {
                // Live-Uppercase-Konvertierung für UX
                field.handleChange(e.target.value.toUpperCase());
              }}
              onBlur={field.handleBlur}
              className="font-mono uppercase"
            />
            <p className="text-sm text-gray-500">
              Exakt {INVITE_CODE_CRITERIA.length} Zeichen, A-Z und 0-9
            </p>
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-600">{field.state.meta.errors[0]}</span>
            )}
          </div>
        )}
      </form.Field>

      <button type="submit">Invite-Code erstellen</button>
    </form>
  );
}
```

### Beispiel 3: User Registration mit Invite-Code

**File:** `packages/frontend/src/features/auth/schemas/register-form.schema.ts`

```typescript
import { z } from 'zod';
import { usernameSchema, inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

export const registerFormSchema = z.object({
  inviteCode: inviteCodeSchemaNormalized,
  username: usernameSchema,
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
```

**File:** `packages/frontend/src/features/auth/ui/organisms/RegisterForm.tsx`

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { registerFormSchema } from '../../schemas/register-form.schema';
import { useRegister } from '../../api/use-register';

export function RegisterForm() {
  const registerMutation = useRegister();

  const form = useForm({
    defaultValues: {
      inviteCode: '',
      username: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: registerFormSchema,
    },
    onSubmit: async ({ value }) => {
      await registerMutation.mutateAsync(value);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="inviteCode">
        {(field) => (
          <div>
            <label>Invite-Code</label>
            <input
              type="text"
              placeholder="ABC12345"
              maxLength={8}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-600">{field.state.meta.errors[0]}</span>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="username">
        {(field) => (
          <div>
            <label>Benutzername</label>
            <input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-600">{field.state.meta.errors[0]}</span>
            )}
          </div>
        )}
      </form.Field>

      <button type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Registriere...' : 'Registrieren'}
      </button>
    </form>
  );
}
```

## 🔧 Backend Integration

### Schritt 1: Custom Validator Decorator (einmalig)

**File:** `packages/backend/src/application/common/validation/validate-with-zod.decorator.ts`

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { ZodSchema } from 'zod';

/**
 * Custom class-validator Decorator für Zod-Schema-Validierung.
 *
 * Ermöglicht Verwendung von Shared Zod-Schemas in NestJS DTOs.
 *
 * @param schema - Das Zod-Schema zur Validierung
 * @param validationOptions - Optional: class-validator Optionen
 *
 * @example
 * ```typescript
 * import { usernameSchema } from '@bluelight-hub/shared/schemas';
 *
 * export class CreateUserDto {
 *   @ValidateWithZod(usernameSchema)
 *   username!: string;
 * }
 * ```

*/
export function ValidateWithZod(schema: ZodSchema, validationOptions?: ValidationOptions) {
return function (object: object, propertyName: string) {
registerDecorator({
name: 'validateWithZod',
target: object.constructor,
propertyName: propertyName,
options: validationOptions,
validator: {
validate(value: unknown, args: ValidationArguments) {
const result = schema.safeParse(value);
return result.success;
},
defaultMessage(args: ValidationArguments) {
const result = schema.safeParse(args.value);
if (!result.success) {
// Nutze erste Zod-Error-Message
return result.error.errors[0]?.message || 'Validierung fehlgeschlagen';
}
return 'Validierung fehlgeschlagen';
},
},
});
};
}

```

**File:** `packages/backend/src/application/common/validation/index.ts`

```typescript
export * from './validate-with-zod.decorator';
```

### Schritt 2: DTOs mit Shared Schemas

#### Beispiel A: Complete-Setup DTO

**File:** `packages/backend/src/application/admin/dto/complete-setup.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { passwordSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

/**
 * Request DTO für den initialen Server-Setup.
 *
 * Nutzt Shared Zod-Schemas aus @bluelight-hub/shared/schemas
 * für konsistente Frontend/Backend-Validierung.
 */
export class CompleteSetupDto {
  /**
   * Nutzername des Admin-Users.
   * Validierung via Shared Zod-Schema (usernameSchema).
   */
  @ApiProperty({
    description: 'Nutzername des Admin-Users (3-20 Zeichen, alphanumerisch)',
    example: 'admin',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nutzername darf nicht leer sein' })
  @ValidateWithZod(usernameSchema)
  username!: string;

  /**
   * Passwort für den Admin-Account.
   * Validierung via Shared Zod-Schema (passwordSchema).
   */
  @ApiProperty({
    description: 'Passwort für den Admin-Account (min. 8 Zeichen, Komplexitätsregeln)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort darf nicht leer sein' })
  @ValidateWithZod(passwordSchema)
  password!: string;
}
```

#### Beispiel B: Register DTO (mit Invite-Code)

**File:** `packages/backend/src/application/auth/dto/register.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { inviteCodeSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

/**
 * Request DTO für User-Registrierung mit Invite-Code.
 *
 * Nutzt Shared Schemas für Invite-Code und Username Validierung.
 */
export class RegisterDto {
  /**
   * Invite-Code für die Registrierung.
   * Format: 8 Zeichen, A-Z0-9 (uppercase).
   */
  @ApiProperty({
    description: 'Invite-Code (8 Zeichen, A-Z0-9)',
    example: 'ABC12345',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Invite-Code darf nicht leer sein' })
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;

  /**
   * Gewünschter Nutzername.
   */
  @ApiProperty({
    description: 'Nutzername (3-20 Zeichen, alphanumerisch)',
    example: 'user123',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nutzername darf nicht leer sein' })
  @ValidateWithZod(usernameSchema)
  username!: string;
}
```

#### Beispiel C: Create Invite DTO

**File:** `packages/backend/src/application/admin/dto/create-invite.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { inviteCodeSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

/**
 * Request DTO für Invite-Code-Erstellung.
 */
export class CreateInviteDto {
  /**
   * Optional: Custom Invite-Code.
   * Wenn nicht angegeben, wird automatisch generiert.
   */
  @ApiProperty({
    description: 'Custom Invite-Code (8 Zeichen, A-Z0-9)',
    example: 'ABC12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  @ValidateWithZod(inviteCodeSchema)
  customCode?: string;

  /**
   * Maximale Anzahl an Verwendungen.
   */
  @ApiProperty({
    description: 'Maximale Verwendungen',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  maxUses: number = 1;
}
```

### Schritt 3: Controller mit DTOs

**File:** `packages/backend/src/modules/auth/controllers/auth.controller.ts`

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CompleteSetupDto } from '@/application/admin/dto/complete-setup.dto';
import { RegisterDto } from '@/application/auth/dto/register.dto';
import { CompleteSetupHandler } from '@/application/admin/commands/complete-setup.handler';
import { RegisterHandler } from '@/application/auth/commands/register.handler';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly completeSetupHandler: CompleteSetupHandler,
    private readonly registerHandler: RegisterHandler,
  ) {}

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initial Admin-Setup durchführen' })
  @ApiWrappedCreatedResponse(CompleteSetupResponseDto)
  async completeSetup(@Body() dto: CompleteSetupDto) {
    // DTO wird automatisch via Shared Schema validiert!
    const result = await this.completeSetupHandler.execute({
      username: dto.username,
      password: dto.password,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return { data: result.value };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User-Registrierung mit Invite-Code' })
  @ApiWrappedCreatedResponse(RegisterResponseDto)
  async register(@Body() dto: RegisterDto) {
    // Invite-Code und Username via Shared Schemas validiert!
    const result = await this.registerHandler.execute({
      inviteCode: dto.inviteCode,
      username: dto.username,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return { data: result.value };
  }
}
```

## ✅ Checkliste für neue Schemas

Wenn ein neues Shared Schema erstellt werden soll:

### 1. Schema-Datei erstellen

```typescript
// packages/shared/src/schemas/auth/new-field.schema.ts
import { z } from 'zod';

export const NEW_FIELD_CRITERIA = {
  minLength: 3,
  maxLength: 50,
} as const;

export const newFieldSchema = z
  .string()
  .min(NEW_FIELD_CRITERIA.minLength)
  .max(NEW_FIELD_CRITERIA.maxLength);

export type NewField = z.infer<typeof newFieldSchema>;
```

### 2. In `index.ts` exportieren

```typescript
// packages/shared/src/schemas/auth/index.ts
export * from './new-field.schema';
```

### 3. Package bauen

```bash
pnpm --filter @bluelight-hub/shared build
```

### 4. Frontend nutzen

```typescript
import { newFieldSchema } from '@bluelight-hub/shared/schemas';

const formSchema = z.object({
  field: newFieldSchema,
});
```

### 5. Backend nutzen

```typescript
import { newFieldSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class SomeDto {
  @ValidateWithZod(newFieldSchema)
  field!: string;
}
```

## 🧪 Testing

### Frontend Tests

```typescript
// packages/frontend/src/features/auth/schemas/__tests__/setup-form.schema.spec.ts
import { describe, it, expect } from 'vitest';
import { setupFormSchema } from '../setup-form.schema';

describe('setupFormSchema', () => {
  it('should validate valid setup data', () => {
    const result = setupFormSchema.safeParse({
      username: 'admin',
      password: 'MyPass123!',
      passwordConfirm: 'MyPass123!',
    });

    expect(result.success).toBe(true);
  });

  it('should reject mismatched passwords', () => {
    const result = setupFormSchema.safeParse({
      username: 'admin',
      password: 'MyPass123!',
      passwordConfirm: 'DifferentPass123!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('stimmen nicht überein');
    }
  });
});
```

### Backend Tests

```typescript
// packages/backend/src/application/admin/dto/__tests__/complete-setup.dto.spec.ts
import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { CompleteSetupDto } from '../complete-setup.dto';

describe('CompleteSetupDto', () => {
  it('should validate valid setup data', async () => {
    const dto = new CompleteSetupDto();
    dto.username = 'admin';
    dto.password = 'MyPass123!';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid username', async () => {
    const dto = new CompleteSetupDto();
    dto.username = 'ab'; // Zu kurz (min. 3)
    dto.password = 'MyPass123!';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid password', async () => {
    const dto = new CompleteSetupDto();
    dto.username = 'admin';
    dto.password = 'short'; // Zu kurz + fehlende Komplexität

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

## 📚 Weitere Ressourcen

- [Zod Documentation](https://zod.dev/)
- [TanStack Form](https://tanstack.com/form/latest)
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator](https://github.com/typestack/class-validator)

## 🔄 Nächste Schritte

1. **Shared Package bauen:** `pnpm --filter @bluelight-hub/shared build`
2. **Backend ValidateWithZod Decorator erstellen** (siehe Schritt 1)
3. **DTOs migrieren** zu Shared Schemas
4. **Frontend Forms migrieren** zu Shared Schemas
5. **Tests schreiben** für alle neuen Schemas
