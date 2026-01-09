# Shared Zod Schemas Package - Implementation Summary

## ✅ Was wurde erstellt?

Ein zentrales **Shared Zod Schemas Package** zur Eliminierung von Form-Validation-Duplikation zwischen Frontend und Backend.

## 📦 Package-Struktur

```
packages/shared/
├── src/
│   ├── schemas/
│   │   ├── auth/
│   │   │   ├── username.schema.ts          ✅ (bereits vorhanden)
│   │   │   ├── password.schema.ts          ✅ (bereits vorhanden)
│   │   │   ├── server-url.schema.ts        ✅ (bereits vorhanden)
│   │   │   ├── invite-code.schema.ts       🆕 NEU ERSTELLT
│   │   │   └── index.ts                    ✅ (aktualisiert)
│   │   ├── index.ts                        ✅ (bereits vorhanden)
│   │   ├── README.md                       ✅ (aktualisiert)
│   │   └── SCHEMA_OVERVIEW.md              🆕 NEU ERSTELLT
│   └── validation/
│       ├── password.schema.ts              ✅ (bereits vorhanden)
│       └── index.ts                        ✅ (bereits vorhanden)
├── INTEGRATION_EXAMPLES.md                 🆕 NEU ERSTELLT
└── package.json                            ✅ (bereits konfiguriert)
```

## 🆕 Neu erstellte Schemas

### 1. Invite-Code Schema

**File:** `packages/shared/src/schemas/auth/invite-code.schema.ts`

**Exports:**
- `inviteCodeSchema` - Strikte Validierung (nur Uppercase)
- `inviteCodeSchemaNormalized` - Auto-Uppercase-Konvertierung (für Frontend UX)
- `INVITE_CODE_CRITERIA` - Konstanten (Länge, Alphabet, Regex)
- `InviteCode` - TypeScript Type

**Validierungsregeln:**
- Exakt 8 Zeichen
- Nur A-Z (Großbuchstaben) und 0-9 (Ziffern)
- Format-Regex: `/^[A-Z0-9]{8}$/`
- Deutsche Error Messages

**Synchronisiert mit:** `InviteCodeValue` Value Object (`@backend/domain/value-objects/invite-code-value.ts`)

## ✅ Bereits vorhandene Schemas

### 1. Username Schema
- **File:** `packages/shared/src/schemas/auth/username.schema.ts`
- **Regeln:** 3-20 Zeichen, alphanumerisch + `_-`
- **Export:** `usernameSchema`, `Username`

### 2. Password Schema
- **File:** `packages/shared/src/schemas/auth/password.schema.ts`
- **Regeln:** Min. 8 Zeichen, Komplexitätsregeln (Groß/Klein/Zahl/Sonderzeichen)
- **Export:** `passwordSchema`, `PASSWORD_CRITERIA`, `Password`
- **Nutzt:** `validatePasswordCriteria()` aus `@bluelight-hub/shared/validation`

### 3. Server-URL Schema
- **File:** `packages/shared/src/schemas/auth/server-url.schema.ts`
- **Regeln:** Gültige http/https URL
- **Export:** `serverUrlSchema`, `ServerUrl`

## 📚 Dokumentation

### 1. README.md (aktualisiert)
**File:** `packages/shared/src/schemas/README.md`

**Inhalt:**
- Übersicht aller Schemas
- Installation & Setup
- Frontend Integration (TanStack Form)
- Backend Integration (NestJS DTOs mit `@ValidateWithZod`)
- Schema-Details mit Beispielen
- TypeScript Types
- Backend Value Object Synchronisation
- Best Practices
- Testing-Beispiele
- Migration-Guide

### 2. SCHEMA_OVERVIEW.md (neu)
**File:** `packages/shared/src/schemas/SCHEMA_OVERVIEW.md`

**Inhalt:**
- Detaillierte Spezifikation aller Schemas
- Validierungsregeln
- Error Messages
- Beispiele (Valid/Invalid)
- Verwendungszwecke
- Schema Comparison Table
- Lifecycle
- Maintenance Checklist

### 3. INTEGRATION_EXAMPLES.md (neu)
**File:** `packages/shared/INTEGRATION_EXAMPLES.md`

**Inhalt:**
- **Frontend Beispiele:**
  - Setup-Formular (Username + Password)
  - Invite-Code-Formular (mit Auto-Normalisierung)
  - User-Registration (Invite-Code + Username)
- **Backend Beispiele:**
  - Custom `@ValidateWithZod` Decorator (einmalig erstellen)
  - Complete-Setup DTO
  - Register DTO (mit Invite-Code)
  - Create-Invite DTO
  - Controller-Integration
- **Testing-Beispiele:**
  - Frontend Tests (Vitest)
  - Backend Tests (Jest)
- **Checkliste für neue Schemas**

## 🔧 Integration

### Frontend (TanStack Form)

```typescript
// packages/frontend/src/features/auth/schemas/register-form.schema.ts
import { z } from 'zod';
import { usernameSchema, inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

export const registerFormSchema = z.object({
  inviteCode: inviteCodeSchemaNormalized, // Auto-Uppercase!
  username: usernameSchema,
});
```

### Backend (NestJS DTOs)

#### Schritt 1: Custom Decorator erstellen (einmalig)

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

#### Schritt 2: DTO mit Shared Schema

```typescript
// packages/backend/src/application/auth/dto/register.dto.ts
import { inviteCodeSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class RegisterDto {
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;

  @ValidateWithZod(usernameSchema)
  username!: string;
}
```

## 📊 Bestehende Nutzung

### Bereits integriert (aus Story 1.3, 1.3a)

**Frontend:**
- ✅ `packages/frontend/src/features/auth/schemas/setup-form.schema.ts`
  - Nutzt `usernameSchema` und `passwordSchema`

**Backend:**
- ✅ `packages/backend/src/application/admin/dto/complete-setup.dto.ts`
  - Nutzt `usernameSchema` und `passwordSchema` via `@ValidateWithZod`

## 🚀 Nächste Schritte

### 1. Package bauen

```bash
pnpm --filter @bluelight-hub/shared build
```

### 2. Backend: Custom Decorator erstellen

Falls noch nicht vorhanden:
```bash
# File erstellen:
touch packages/backend/src/application/common/validation/validate-with-zod.decorator.ts
touch packages/backend/src/application/common/validation/index.ts
```

Siehe `INTEGRATION_EXAMPLES.md` für vollständigen Code.

### 3. Frontend: Invite-Code Formular

Beispiel-Integration für zukünftige User-Registration:

```typescript
// packages/frontend/src/features/auth/schemas/register-form.schema.ts
import { z } from 'zod';
import { usernameSchema, inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

export const registerFormSchema = z.object({
  inviteCode: inviteCodeSchemaNormalized,
  username: usernameSchema,
});
```

### 4. Backend: Register DTO

```typescript
// packages/backend/src/application/auth/dto/register.dto.ts
import { inviteCodeSchema, usernameSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class RegisterDto {
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;

  @ValidateWithZod(usernameSchema)
  username!: string;
}
```

## 📝 Best Practices

### ✅ DO
- IMMER Shared Schemas für Auth-Felder verwenden (Username, Password, Invite-Code)
- Backend: `@ValidateWithZod` Decorator nutzen
- Frontend: `inviteCodeSchemaNormalized` für bessere UX (Auto-Uppercase)
- TypeScript-Typen via `z.infer<typeof schema>` ableiten

### ❌ DON'T
- NIEMALS manuelle Regex-Duplikation
- NIEMALS unterschiedliche Frontend/Backend Validierungsregeln
- NIEMALS Magic Numbers (nutze `*_CRITERIA` Konstanten)
- NIEMALS Schema-Änderungen ohne Sync mit Backend Value Objects

## 🔄 Synchronisation mit Backend

| Schema | Backend Counterpart | Location |
|--------|---------------------|----------|
| `inviteCodeSchema` | `InviteCodeValue` Value Object | `@backend/domain/value-objects/invite-code-value.ts` |
| `passwordSchema` | - | `@bluelight-hub/shared/validation/password.schema.ts` |
| `usernameSchema` | - | - |

**Wichtig:** Bei Änderungen an `InviteCodeValue` muss `inviteCodeSchema` aktualisiert werden!

## 📈 Zusammenfassung

### Ergebnis
✅ **Zentrale Shared Schemas** für Username, Password, Invite-Code, Server-URL
✅ **Keine Duplikation** zwischen Frontend und Backend
✅ **Konsistente Validierung** mit deutschen Error Messages
✅ **TypeScript Types** aus Schemas abgeleitet
✅ **Umfassende Dokumentation** (README, SCHEMA_OVERVIEW, INTEGRATION_EXAMPLES)

### Files erstellt/aktualisiert
- 🆕 `packages/shared/src/schemas/auth/invite-code.schema.ts`
- 🆕 `packages/shared/src/schemas/SCHEMA_OVERVIEW.md`
- 🆕 `packages/shared/INTEGRATION_EXAMPLES.md`
- ✅ `packages/shared/src/schemas/auth/index.ts` (aktualisiert)
- ✅ `packages/shared/src/schemas/README.md` (aktualisiert)

### Dependencies
- `zod`: ^3.24.1 (bereits vorhanden in `package.json`)

### Nächster Build-Befehl
```bash
pnpm --filter @bluelight-hub/shared build
```

## 🔗 Weitere Ressourcen

- [README.md](./packages/shared/src/schemas/README.md) - Setup & Verwendung
- [SCHEMA_OVERVIEW.md](./packages/shared/src/schemas/SCHEMA_OVERVIEW.md) - Detaillierte Spezifikation
- [INTEGRATION_EXAMPLES.md](./packages/shared/INTEGRATION_EXAMPLES.md) - Praktische Beispiele
- [Zod Documentation](https://zod.dev/)
- [TanStack Form](https://tanstack.com/form/latest)
