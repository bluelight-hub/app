# Shared Schemas Package - Architecture

Architektur-Übersicht des Shared Zod Schemas Package für konsistente Frontend/Backend Validierung.

## 🏗️ Package-Struktur

```
@bluelight-hub/shared
├── src/
│   ├── schemas/                      # Zod-Schemas (wiederverwendbar)
│   │   ├── auth/                     # Auth-bezogene Schemas
│   │   │   ├── username.schema.ts
│   │   │   ├── password.schema.ts
│   │   │   ├── invite-code.schema.ts  🆕
│   │   │   ├── server-url.schema.ts
│   │   │   └── index.ts              # Re-exports
│   │   ├── index.ts                  # Haupt-Export
│   │   ├── README.md                 # Dokumentation
│   │   └── SCHEMA_OVERVIEW.md        # Detaillierte Spezifikation
│   │
│   └── validation/                   # Plain-JS Validierungsfunktionen
│       ├── password.schema.ts        # PASSWORD_CRITERIA + validatePasswordCriteria()
│       └── index.ts
│
├── dist/                             # Build-Output (TypeScript compiled)
├── client/                           # Generierter API-Client (OpenAPI)
├── package.json
├── tsconfig.json
├── INTEGRATION_EXAMPLES.md           # Praktische Beispiele
└── ARCHITECTURE.md                   # Dieses Dokument
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    @bluelight-hub/shared                        │
│                                                                 │
│  ┌───────────────┐           ┌──────────────────┐             │
│  │   /schemas    │           │   /validation    │             │
│  │               │           │                  │             │
│  │ Zod Schemas   │◄──────────│ Plain Functions  │             │
│  │ (username,    │  depends  │ (password        │             │
│  │  password,    │           │  validation)     │             │
│  │  invite-code) │           │                  │             │
│  └───────┬───────┘           └──────────────────┘             │
│          │                                                     │
└──────────┼─────────────────────────────────────────────────────┘
           │
           ├──────────────────┬──────────────────────────────────┐
           │                  │                                  │
           ▼                  ▼                                  ▼
  ┌─────────────────┐  ┌──────────────┐             ┌───────────────────┐
  │   FRONTEND      │  │   BACKEND    │             │  BACKEND DOMAIN   │
  │                 │  │              │             │                   │
  │ TanStack Form   │  │ NestJS DTOs  │             │  Value Objects    │
  │   Schemas       │  │              │             │                   │
  │                 │  │ @ValidateWith│             │ InviteCodeValue   │
  │ - Setup Form    │  │    Zod       │             │                   │
  │ - Register Form │  │              │             │ (synchronisiert   │
  │ - Admin Forms   │  │ - Complete   │◄────────────│  mit Schema)      │
  │                 │  │   Setup DTO  │   manual    │                   │
  │                 │  │ - Register   │   sync      │                   │
  │                 │  │   DTO        │             │                   │
  └─────────────────┘  └──────────────┘             └───────────────────┘
```

## 📊 Schema Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. SCHEMA DEFINITION                                             │
│    File: packages/shared/src/schemas/auth/invite-code.schema.ts │
│                                                                  │
│    export const inviteCodeSchema = z                             │
│      .string()                                                   │
│      .length(8)                                                  │
│      .regex(/^[A-Z0-9]{8}$/)                                     │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. EXPORT IN INDEX                                               │
│    File: packages/shared/src/schemas/auth/index.ts              │
│                                                                  │
│    export * from './invite-code.schema';                        │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. BUILD PACKAGE                                                 │
│    Command: pnpm --filter @bluelight-hub/shared build           │
│                                                                  │
│    TypeScript → dist/schemas/auth/invite-code.schema.js          │
│                 dist/schemas/auth/invite-code.schema.d.ts        │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ├──────────────────┬─────────────────────────────────┐
               ▼                  ▼                                 ▼
     ┌──────────────────┐ ┌──────────────┐            ┌────────────────┐
     │ 4a. FRONTEND     │ │ 4b. BACKEND  │            │ 4c. TESTS      │
     │                  │ │              │            │                │
     │ import {         │ │ import {     │            │ import {       │
     │   inviteCode     │ │   inviteCode │            │   inviteCode   │
     │   SchemaNorm...  │ │   Schema     │            │   Schema       │
     │ } from '@blue... │ │ } from '@... │            │ } from '@...   │
     │                  │ │              │            │                │
     │ const schema =   │ │ @ValidateWith│            │ expect(schema  │
     │   z.object({     │ │   Zod(schema)│            │   .safeParse() │
     │     code: schema │ │ inviteCode!: │            │   .success)    │
     │   });            │ │   string;    │            │   .toBe(true)  │
     └──────────────────┘ └──────────────┘            └────────────────┘
```

## 🔗 Schema Dependencies

```
┌──────────────────────────────────────────────────────────────────┐
│                    passwordSchema                                │
│                                                                  │
│  ┌────────────────────────────────────────┐                     │
│  │ @bluelight-hub/shared/schemas          │                     │
│  │   /auth/password.schema.ts             │                     │
│  └───────────┬────────────────────────────┘                     │
│              │ imports                                           │
│              ▼                                                   │
│  ┌────────────────────────────────────────┐                     │
│  │ @bluelight-hub/shared/validation       │                     │
│  │   /password.schema.ts                  │                     │
│  │                                        │                     │
│  │ - PASSWORD_CRITERIA (constants)        │                     │
│  │ - validatePasswordCriteria(password)   │                     │
│  │   → Plain-JS Validierungsfunktion      │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  Warum Trennung?                                                │
│  - /validation: Kann ohne Zod genutzt werden (lightweight)     │
│  - /schemas: Nutzt Zod für Frontend/Backend Integration        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    inviteCodeSchema                              │
│                                                                  │
│  ┌────────────────────────────────────────┐                     │
│  │ @bluelight-hub/shared/schemas          │                     │
│  │   /auth/invite-code.schema.ts          │                     │
│  └───────────┬────────────────────────────┘                     │
│              │ synchronisiert mit                                │
│              ▼                                                   │
│  ┌────────────────────────────────────────┐                     │
│  │ @backend/domain/value-objects          │                     │
│  │   /invite-code-value.ts                │                     │
│  │                                        │                     │
│  │ - CODE_LENGTH = 8                      │                     │
│  │ - ALPHABET = 'A-Z0-9'                  │                     │
│  │ - FORMAT_REGEX = /^[A-Z0-9]{8}$/       │                     │
│  │ - generate() / fromString()            │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  Wichtig: Bei Änderungen an InviteCodeValue                     │
│           muss inviteCodeSchema synchronisiert werden!          │
└──────────────────────────────────────────────────────────────────┘
```

## 🎯 Integration Patterns

### Frontend Pattern (TanStack Form)

```typescript
┌────────────────────────────────────────────────────────────────┐
│ Feature: Auth                                                  │
│                                                                │
│ ┌──────────────────────────────────────────────────┐           │
│ │ schemas/                                         │           │
│ │   register-form.schema.ts                        │           │
│ │                                                  │           │
│ │   import { inviteCodeSchemaNormalized,          │           │
│ │            usernameSchema }                      │           │
│ │     from '@bluelight-hub/shared/schemas';       │           │
│ │                                                  │           │
│ │   export const registerFormSchema = z.object({  │           │
│ │     inviteCode: inviteCodeSchemaNormalized,     │           │
│ │     username: usernameSchema,                   │           │
│ │   });                                           │           │
│ └──────────────┬───────────────────────────────────┘           │
│                │                                               │
│                ▼                                               │
│ ┌──────────────────────────────────────────────────┐           │
│ │ ui/organisms/                                    │           │
│ │   RegisterForm.tsx                               │           │
│ │                                                  │           │
│ │   const form = useForm({                        │           │
│ │     validators: {                                │           │
│ │       onChange: registerFormSchema,             │           │
│ │     },                                           │           │
│ │   });                                            │           │
│ └──────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

### Backend Pattern (NestJS DTOs)

```typescript
┌────────────────────────────────────────────────────────────────┐
│ Application Layer                                              │
│                                                                │
│ ┌──────────────────────────────────────────────────┐           │
│ │ common/validation/                               │           │
│ │   validate-with-zod.decorator.ts                 │           │
│ │                                                  │           │
│ │   export function ValidateWithZod(schema) {      │           │
│ │     // Custom class-validator Decorator          │           │
│ │     // für Zod-Schema-Validierung                │           │
│ │   }                                              │           │
│ └──────────────┬───────────────────────────────────┘           │
│                │                                               │
│                ▼                                               │
│ ┌──────────────────────────────────────────────────┐           │
│ │ auth/dto/                                        │           │
│ │   register.dto.ts                                │           │
│ │                                                  │           │
│ │   import { inviteCodeSchema, usernameSchema }   │           │
│ │     from '@bluelight-hub/shared/schemas';       │           │
│ │   import { ValidateWithZod } from '@/common...  │           │
│ │                                                  │           │
│ │   export class RegisterDto {                    │           │
│ │     @ValidateWithZod(inviteCodeSchema)          │           │
│ │     inviteCode!: string;                        │           │
│ │                                                  │           │
│ │     @ValidateWithZod(usernameSchema)            │           │
│ │     username!: string;                          │           │
│ │   }                                              │           │
│ └──────────────┬───────────────────────────────────┘           │
│                │                                               │
│                ▼                                               │
│ ┌──────────────────────────────────────────────────┐           │
│ │ modules/auth/controllers/                        │           │
│ │   auth.controller.ts                             │           │
│ │                                                  │           │
│ │   @Post('register')                              │           │
│ │   async register(@Body() dto: RegisterDto) {     │           │
│ │     // DTO wurde bereits via Zod validiert!      │           │
│ │   }                                               │           │
│ └──────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

## 🔒 Type Safety Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  Zod Schema Definition                           │
│                                                                  │
│  export const inviteCodeSchema = z.string().length(8)...        │
│                                                                  │
│  export type InviteCode = z.infer<typeof inviteCodeSchema>;     │
│                           │                                      │
│                           │ TypeScript Type Inference            │
│                           ▼                                      │
│                      type InviteCode = string                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│   FRONTEND       │          │   BACKEND        │
│                  │          │                  │
│ interface Form { │          │ export class ... │
│   code: Invite   │          │   @ValidateWith  │
│   Code;          │          │   Zod(...)       │
│ }                │          │   code!: Invite  │
│                  │          │   Code;          │
│ ✅ TypeScript    │          │ }                │
│    Error wenn    │          │                  │
│    falscher Typ  │          │ ✅ Runtime +     │
└──────────────────┘          │    Compile-time  │
                              │    Validierung   │
                              └──────────────────┘
```

## 🧩 Schema Variants

### Invite-Code Schema: Standard vs. Normalized

```
┌──────────────────────────────────────────────────────────────────┐
│                    inviteCodeSchema                              │
│                                                                  │
│  Verwendung: Backend DTOs                                        │
│  Validierung: Strikte Uppercase-Prüfung                         │
│                                                                  │
│  z.string().length(8).regex(/^[A-Z0-9]{8}$/)                    │
│                                                                  │
│  inviteCodeSchema.parse('ABC12345'); // ✅ OK                    │
│  inviteCodeSchema.parse('abc12345'); // ❌ Error: Nur Uppercase  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│               inviteCodeSchemaNormalized                         │
│                                                                  │
│  Verwendung: Frontend Forms                                      │
│  Validierung: Auto-Uppercase-Konvertierung                      │
│                                                                  │
│  z.string().trim().transform(toUpperCase).pipe(inviteCodeSchema)│
│                                                                  │
│  inviteCodeSchemaNormalized.parse('abc12345');                  │
│  // ✅ OK → 'ABC12345'                                           │
│                                                                  │
│  Vorteil: Bessere UX - User kann Kleinbuchstaben eingeben       │
└──────────────────────────────────────────────────────────────────┘
```

## 📦 Package Exports

```typescript
// packages/shared/package.json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./client": {
      "types": "./client/index.ts",
      "import": "./client/index.ts"
    },
    "./schemas": {                        // 👈 Schemas-Export
      "types": "./dist/schemas/index.d.ts",
      "import": "./dist/schemas/index.js"
    }
  }
}
```

**Import Paths:**

```typescript
// ✅ Korrekt: Via /schemas Export
import { inviteCodeSchema } from '@bluelight-hub/shared/schemas';

// ❌ Falsch: Direkter Import (funktioniert nicht)
import { inviteCodeSchema } from '@bluelight-hub/shared/src/schemas/auth/invite-code.schema';
```

## 🔄 Synchronisation Strategy

### Backend Value Objects ↔ Shared Schemas

```
┌─────────────────────────────────────────────────────────────────┐
│ Backend: InviteCodeValue (Source of Truth)                      │
│ Location: @backend/domain/value-objects/invite-code-value.ts   │
│                                                                 │
│ class InviteCodeValue {                                         │
│   private static readonly CODE_LENGTH = 8;                      │
│   private static readonly ALPHABET = 'A-Z0-9';                  │
│   private static readonly FORMAT_REGEX = /^[A-Z0-9]{8}$/;       │
│                                                                 │
│   static fromString(code: string): Result<InviteCodeValue> {    │
│     if (code.length !== CODE_LENGTH) return fail();             │
│     if (!FORMAT_REGEX.test(code)) return fail();                │
│     return ok(new InviteCodeValue(code));                       │
│   }                                                              │
│ }                                                                │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    │ Manual Synchronisation
                    │ (bei Änderungen)
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Shared: inviteCodeSchema                                        │
│ Location: @shared/schemas/auth/invite-code.schema.ts            │
│                                                                 │
│ export const INVITE_CODE_CRITERIA = {                           │
│   length: 8,                                                    │
│   alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',            │
│   formatRegex: /^[A-Z0-9]{8}$/,                                 │
│ };                                                               │
│                                                                 │
│ export const inviteCodeSchema = z                               │
│   .string()                                                     │
│   .length(INVITE_CODE_CRITERIA.length)                          │
│   .regex(INVITE_CODE_CRITERIA.formatRegex);                     │
└─────────────────────────────────────────────────────────────────┘

WICHTIG: Bei Änderungen an InviteCodeValue muss inviteCodeSchema
         manuell synchronisiert werden!
```

## 🎯 Design Principles

### 1. Single Source of Truth
- **Schemas:** Definiert in `@bluelight-hub/shared/schemas`
- **Wiederverwendung:** Frontend und Backend nutzen identische Schemas
- **Keine Duplikation:** Validierungsregeln nur einmal definiert

### 2. Type Safety
- **TypeScript Types:** Via `z.infer<typeof schema>` abgeleitet
- **Compile-Time:** TypeScript prüft Typen
- **Runtime:** Zod validiert Daten

### 3. Developer Experience
- **Frontend:** Auto-Uppercase für bessere UX (`inviteCodeSchemaNormalized`)
- **Backend:** Strikte Validierung (`inviteCodeSchema`)
- **Error Messages:** Deutsche, benutzerfreundliche Fehlermeldungen

### 4. Maintainability
- **Zentrale Dokumentation:** README, SCHEMA_OVERVIEW, INTEGRATION_EXAMPLES
- **Versionierung:** Über `@bluelight-hub/shared` Package
- **Testing:** Unit Tests für alle Schemas

## 📈 Evolution Path

```
Phase 1 (✅ Aktuell):
  - Username, Password, Invite-Code, Server-URL Schemas
  - Frontend: TanStack Form Integration
  - Backend: NestJS DTOs via @ValidateWithZod

Phase 2 (🔮 Zukunft):
  - Weitere Schemas (Email, Phone, Address, etc.)
  - Shared Error-Message-Formatierung
  - Schema-Versionierung (Breaking Changes)

Phase 3 (🔮 Zukunft):
  - Code-Generator für DTOs aus Schemas
  - Automatische Sync-Validierung (Backend ↔ Schemas)
  - OpenAPI Schema Generation aus Zod
```

## 🔗 Related Documentation

- [README.md](./src/schemas/README.md) - Setup & Verwendung
- [SCHEMA_OVERVIEW.md](./src/schemas/SCHEMA_OVERVIEW.md) - Detaillierte Spezifikation
- [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) - Praktische Beispiele
- [SHARED_SCHEMAS_SUMMARY.md](../SHARED_SCHEMAS_SUMMARY.md) - Implementation Summary
