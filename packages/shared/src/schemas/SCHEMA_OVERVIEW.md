# Schema Overview

Übersicht aller verfügbaren Shared Zod Schemas.

## 📦 Package Import

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
  inviteCodeSchema,
  inviteCodeSchemaNormalized,
  INVITE_CODE_CRITERIA,
  type InviteCode,

  // Server-URL
  serverUrlSchema,
  type ServerUrl,
} from '@bluelight-hub/shared/schemas';
```

## 📋 Schema Specification

### 1. Username Schema

**Import:**

```typescript
import { usernameSchema, type Username } from '@bluelight-hub/shared/schemas';
```

**Validierung:**

- **Min Length:** 3 Zeichen
- **Max Length:** 20 Zeichen
- **Erlaubte Zeichen:** `a-z`, `A-Z`, `0-9`, `_`, `-`
- **Regex:** `/^[a-zA-Z0-9_-]+$/`

**Error Messages:**

- Zu kurz: `"Benutzername muss mindestens 3 Zeichen lang sein"`
- Zu lang: `"Benutzername darf maximal 20 Zeichen lang sein"`
- Ungültige Zeichen: `"Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten"`

**Beispiele:**

```typescript
usernameSchema.parse('admin');      // ✅ OK
usernameSchema.parse('user_123');   // ✅ OK
usernameSchema.parse('test-user');  // ✅ OK
usernameSchema.parse('ab');         // ❌ Error: Min. 3 Zeichen
usernameSchema.parse('user@test');  // ❌ Error: Ungültige Zeichen
```

**Verwendung:**

- Backend: Admin-Setup, User-Management, Auth
- Frontend: Setup-Formular, Register-Formular, User-Profile

---

### 2. Password Schema

**Import:**

```typescript
import { passwordSchema, PASSWORD_CRITERIA, type Password } from '@bluelight-hub/shared/schemas';
```

**Validierung:**

- **Min Length:** 8 Zeichen
- **Max Length:** 128 Zeichen
- **Komplexitätsregeln:**
    - Mind. 1 Kleinbuchstabe (`a-z`)
    - Mind. 1 Großbuchstabe (`A-Z`)
    - Mind. 1 Zahl (`0-9`)
    - Mind. 1 Sonderzeichen (alles außer `a-zA-Z0-9`)

**PASSWORD_CRITERIA:**

```typescript
{
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
}
```

**Error Messages:**

- Zu kurz: `"Passwort muss mindestens 8 Zeichen lang sein"`
- Zu lang: `"Passwort darf maximal 128 Zeichen lang sein"`
- Fehlender Kleinbuchstabe: `"Das Passwort muss mindestens einen Kleinbuchstaben enthalten"`
- Fehlender Großbuchstabe: `"Das Passwort muss mindestens einen Großbuchstaben enthalten"`
- Fehlende Zahl: `"Das Passwort muss mindestens eine Zahl enthalten"`
- Fehlendes Sonderzeichen: `"Das Passwort muss mindestens ein Sonderzeichen enthalten"`

**Beispiele:**

```typescript
passwordSchema.parse('MyPass123!');       // ✅ OK
passwordSchema.parse('SecureP@ss1');      // ✅ OK
passwordSchema.parse('short');            // ❌ Error: Min. 8 Zeichen
passwordSchema.parse('alllowercase1!');   // ❌ Error: Mind. ein Großbuchstabe
passwordSchema.parse('ALLUPPERCASE1!');   // ❌ Error: Mind. ein Kleinbuchstabe
passwordSchema.parse('NoNumber!');        // ❌ Error: Mind. eine Zahl
passwordSchema.parse('NoSymbol123');      // ❌ Error: Mind. ein Sonderzeichen
```

**Verwendung:**

- Backend: Admin-Setup, Password-Change, User-Creation
- Frontend: Setup-Formular, Password-Change-Formular, Admin-User-Creation

**Hinweis:** Das Schema nutzt die bestehende `validatePasswordCriteria()` Funktion aus
`@bluelight-hub/shared/validation/password.schema.ts` für konsistente Passwort-Validierung.

---

### 3. Invite-Code Schema

**Import:**

```typescript
import {
  inviteCodeSchema,
  inviteCodeSchemaNormalized,
  INVITE_CODE_CRITERIA,
  type InviteCode,
} from '@bluelight-hub/shared/schemas';
```

**Validierung:**

- **Length:** Exakt 8 Zeichen
- **Erlaubte Zeichen:** `A-Z` (Großbuchstaben), `0-9` (Ziffern)
- **Regex:** `/^[A-Z0-9]{8}$/`
- **Format:** NUR Uppercase (Kleinbuchstaben werden automatisch konvertiert in `inviteCodeSchemaNormalized`)

**INVITE_CODE_CRITERIA:**

```typescript
{
  length: 8,
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  formatRegex: /^[A-Z0-9]{8}$/,
}
```

**Error Messages:**

- Fehlend: `"Invite-Code wird benötigt"`
- Ungültiger Typ: `"Invite-Code muss ein Text sein"`
- Falsche Länge: `"Invite-Code muss exakt 8 Zeichen lang sein"`
- Ungültige Zeichen: `"Invite-Code darf nur Großbuchstaben (A-Z) und Ziffern (0-9) enthalten"`

**Varianten:**

#### A) Standard Schema (strikte Validierung)

```typescript
import { inviteCodeSchema } from '@bluelight-hub/shared/schemas';

// Nur Uppercase akzeptiert
inviteCodeSchema.parse('ABC12345'); // ✅ OK
inviteCodeSchema.parse('abc12345'); // ❌ Error: Nur Großbuchstaben
inviteCodeSchema.parse('ABC123');   // ❌ Error: Exakt 8 Zeichen
inviteCodeSchema.parse('ABC12345X');// ❌ Error: Exakt 8 Zeichen
inviteCodeSchema.parse('ABC123@5'); // ❌ Error: Nur A-Z0-9
```

**Verwendung:** Backend DTOs (strikte Validierung nach Normalisierung)

#### B) Normalized Schema (Auto-Uppercase)

```typescript
import { inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

// Konvertiert automatisch zu Uppercase
inviteCodeSchemaNormalized.parse('abc12345'); // ✅ OK → 'ABC12345'
inviteCodeSchemaNormalized.parse('ABC12345'); // ✅ OK → 'ABC12345'
inviteCodeSchemaNormalized.parse('aBc123De'); // ✅ OK → 'ABC123DE'
```

**Verwendung:** Frontend Forms (bessere UX, User kann Kleinbuchstaben eingeben)

**Beispiele:**

```typescript
// Frontend: Auto-Normalisierung für UX
const form = useForm({
  validators: {
    onChange: z.object({
      code: inviteCodeSchemaNormalized, // User kann lowercase eingeben
    }),
  },
});

// Backend: Strikte Validierung
export class RegisterDto {
  @ValidateWithZod(inviteCodeSchema) // Nur uppercase akzeptiert
  inviteCode!: string;
}
```

**Verwendung:**

- Backend: Register DTO, Invite-Code-Validierung
- Frontend: Register-Formular, Admin-Invite-Creation

**Synchronisation:** Dieses Schema ist synchronisiert mit `InviteCodeValue` Value Object aus
`@backend/domain/value-objects/invite-code-value.ts` (8 Zeichen, A-Z0-9).

---

### 4. Server-URL Schema

**Import:**

```typescript
import { serverUrlSchema, type ServerUrl } from '@bluelight-hub/shared/schemas';
```

**Validierung:**

- **Format:** Gültige URL
- **Erlaubte Protokolle:** `http://`, `https://`
- **Entwicklung:** `localhost` und `127.0.0.1` erlaubt

**Error Messages:**

- Ungültige URL: `"Ungültige Server-URL"`
- Falsches Protokoll: `"Server-URL muss mit http:// oder https:// beginnen"`

**Beispiele:**

```typescript
serverUrlSchema.parse('https://api.example.com');  // ✅ OK
serverUrlSchema.parse('http://localhost:3091');    // ✅ OK
serverUrlSchema.parse('http://127.0.0.1:3091');    // ✅ OK
serverUrlSchema.parse('ftp://server.com');         // ❌ Error: Nur http/https
serverUrlSchema.parse('invalid-url');              // ❌ Error: Ungültige URL
serverUrlSchema.parse('example.com');              // ❌ Error: Ungültige URL (fehlt Protokoll)
```

**Verwendung:**

- Frontend: Server-Setup-Formular, Multi-Server-Configuration

---

## 🔄 Schema Lifecycle

### 1. Schema Definition

```typescript
// packages/shared/src/schemas/auth/invite-code.schema.ts
export const inviteCodeSchema = z
  .string()
  .trim()
  .length(8, "Exakt 8 Zeichen")
  .regex(/^[A-Z0-9]{8}$/, "Nur A-Z und 0-9");
```

### 2. Export in Index

```typescript
// packages/shared/src/schemas/auth/index.ts
export * from './invite-code.schema';
```

### 3. Build

```bash
pnpm --filter @bluelight-hub/shared build
```

### 4. Frontend Integration

```typescript
import { inviteCodeSchemaNormalized } from '@bluelight-hub/shared/schemas';

const formSchema = z.object({
  code: inviteCodeSchemaNormalized,
});
```

### 5. Backend Integration

```typescript
import { inviteCodeSchema } from '@bluelight-hub/shared/schemas';
import { ValidateWithZod } from '@/application/common/validation';

export class RegisterDto {
  @ValidateWithZod(inviteCodeSchema)
  inviteCode!: string;
}
```

---

## 📊 Schema Comparison

| Feature | Username | Password | Invite-Code | Server-URL |
|---------|----------|----------|-------------|------------|
| **Min Length** | 3 | 8 | 8 (exakt) | - |
| **Max Length** | 20 | 128 | 8 (exakt) | - |
| **Case-Sensitive** | Ja | Ja | Nein (uppercase) | Ja |
| **Normalisierung** | Nein | Nein | Ja (optional) | Nein |
| **Komplexität** | Niedrig | Hoch | Mittel | Niedrig |
| **Frontend UX** | Standard | Criteria Display | Auto-Uppercase | Standard |
| **Backend Sync** | - | ✅ | ✅ (Value Object) | - |

---

## 🔗 Related Files

### Schemas

- `packages/shared/src/schemas/auth/username.schema.ts`
- `packages/shared/src/schemas/auth/password.schema.ts`
- `packages/shared/src/schemas/auth/invite-code.schema.ts`
- `packages/shared/src/schemas/auth/server-url.schema.ts`
- `packages/shared/src/schemas/auth/index.ts`

### Validation (Plain Functions)

- `packages/shared/src/validation/password.schema.ts`

### Backend Value Objects

- `packages/backend/src/domain/value-objects/invite-code-value.ts`

### Backend DTOs (Beispiele)

- `packages/backend/src/application/admin/dto/complete-setup.dto.ts`
- `packages/backend/src/application/auth/dto/register.dto.ts`

### Frontend Schemas (Beispiele)

- `packages/frontend/src/features/auth/schemas/setup-form.schema.ts`
- `packages/frontend/src/features/auth/schemas/register-form.schema.ts`

---

## 📝 Maintenance Checklist

Bei Änderungen an Schemas:

1. ✅ Schema-Datei aktualisieren (`packages/shared/src/schemas/auth/*.schema.ts`)
2. ✅ Tests aktualisieren (`packages/shared/src/schemas/auth/__tests__/*.spec.ts`)
3. ✅ Backend Value Objects synchronisieren (falls relevant)
4. ✅ Backend DTOs aktualisieren
5. ✅ Frontend Schemas aktualisieren
6. ✅ Dokumentation aktualisieren (`README.md`, `SCHEMA_OVERVIEW.md`)
7. ✅ Package neu bauen (`pnpm --filter @bluelight-hub/shared build`)
8. ✅ Integration testen (Frontend + Backend)

---

## 🧪 Testing

Siehe `INTEGRATION_EXAMPLES.md` für vollständige Test-Beispiele.

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
