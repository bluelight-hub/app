---
project_name: bluelight-hub
date: 2026-01-15
status: complete
sections_completed: [technology_stack, critical_rules, api_workflow, frontend_patterns, code_organisation, workflow, testing, dont_miss]
optimized_for_llm: true
---

# Project Context für AI Agents

_Kritische Regeln und Patterns für konsistente Code-Implementierung. Fokus auf nicht-offensichtliche Details._

---

## Technology Stack

**Backend:** NestJS + Prisma + PostgreSQL (Hexagonal Architecture)
**Frontend:** React + Vite + Tauri (Desktop-App) + TanStack Ecosystem
**Styling:** Tailwind CSS + Headless UI (NIEMALS andere CSS-Frameworks)
**DevTools:** Biome (NICHT ESLint/Prettier), pnpm, Semantic Release

---

## Kritische Implementierungsregeln

### AC1: DI Import Pattern (KRITISCH)

`import type` wird zur Compile-Zeit entfernt → bricht NestJS DI zur Laufzeit.

```typescript
// ✅ RICHTIG: Injectable Classes mit normalem import
import { EinsatzRepository } from '@infrastructure/repositories/einsatz.repository';
import { TokenHash } from '@domain/value-objects/token-hash';

// ❌ FALSCH: import type für Injectable Classes
import type { EinsatzRepository } from '@infrastructure/repositories/einsatz.repository';
```

**Automatische Prüfung:** `pnpm --filter @bluelight-hub/backend check:di:imports`

### AC7: API Response Decorators (KRITISCH)

IMMER `@ApiWrappedResponse` statt Standard-Swagger-Decorators für korrekte OpenAPI-Generierung.

```typescript
// ✅ RICHTIG
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste' })

// ❌ FALSCH
@ApiOkResponse({ type: EinsatzDto })
```

### AC3: Framework-Agnostizität

Application Layer (`src/application/`) darf NUR diese NestJS-Imports haben:
- `@Injectable`, `@Inject`, `@Optional`

VERBOTEN: `@Controller`, `HttpException`, `Response`, etc.

### AC4: Result Pattern

`Result<T>` für erwartete Fehler, Exceptions nur für unerwartete Fehler (DB-Ausfall, etc.).

```typescript
// ✅ RICHTIG: Result Pattern
return Result.fail('Validation failed');

// ❌ FALSCH: Exceptions für Business-Logik
throw new ValidationException('...');
```

### AC5: Outbox Pattern

Domain Events MÜSSEN atomar mit Domain-Operationen gespeichert werden → `TransactionalCommandHandler` nutzen.

### AC2: DI Token Constants

Zentralisierte Tokens aus `@infrastructure/di-tokens.ts`, keine Inline-Strings.

---

## API Client Workflow

**NIEMALS manuelle Fetch-Calls!**

1. Backend-Endpoint mit `@ApiWrappedResponse` erstellen
2. `pnpm run generate-api` ausführen
3. Frontend nutzt `@bluelight-hub/shared/client`
4. TanStack Query Hook mit `QUERY_KEYS` erstellen

```typescript
// ✅ RICHTIG
const useEinsaetze = () => useQuery({
  queryKey: QUERY_KEYS.einsatz.list(),
  queryFn: () => api.einsatz.findAll(),
});

// ❌ FALSCH
const fetchEinsaetze = () => fetch('/api/einsatz');
```

---

## Frontend Patterns

### Forms: NUR @tanstack/react-form + Zod

```typescript
const form = useForm({
  validatorAdapter: zodValidator(),
  validators: { onChange: schema },
});
```

### State Management
- **Server State:** @tanstack/react-query
- **Client State:** @tanstack/react-store
- **NIEMALS:** Redux, Zustand, oder andere Libraries

### Query Keys
IMMER aus `@/queryKeys` - keine hardcoded Keys.

---

## Code Organisation

### Backend (Hexagonal Architecture)
```
domain/      → WAS (Business Rules, Framework-agnostic)
application/ → WANN (Use Cases, Result<T> returns)
infrastructure/ → WIE (Prisma, Events, Adapters)
modules/     → WO (HTTP Controller)
```

### Frontend (Feature-based + Atomic Design)
```
features/<name>/
├── api/       → queries.ts, mutations.ts
├── ui/        → atoms/, molecules/, organisms/
├── stores/    → TanStack Store
└── schemas/   → Zod Schemas
```

### Datei-Naming
- Backend: `kebab-case` mit Suffix (`.handler.ts`, `.repository.ts`, `.aggregate.ts`)
- Frontend: `kebab-case.tsx`
- Tests: `<name>.spec.ts`

---

## Commit & Workflow

### Format
```
<emoji>(<context>): <title>
```

### Wichtige Emojis
| Emoji | Version-Bump |
|-------|--------------|
| 💥 | MAJOR (Breaking) |
| ✨ | MINOR (Feature) |
| 🐛 | PATCH (Fix) |

### Pre-commit Hooks
NIEMALS `--no-verify` - Hook prüft:
1. DI Import Pattern (AC1)
2. Circular Dependencies
3. Biome Lint

---

## Testing

### Backend (Jest)
AAA Pattern mit Given-When-Then Kommentaren, `jest.clearAllMocks()` in beforeEach.

### Frontend (Vitest)
@testing-library/react für Component Tests.

---

## Don't-Miss Rules

- **TailwindUI:** Nur auf explizite User-Anfrage (Premium-Komponenten müssen kopiert werden)
- **JSDoc:** Deutsch, erkläre "warum" nicht "was"
- **Desktop-App:** Frontend ist Tauri, nicht reiner Web-Client
- **Biome Config:** `useImportType: "off"` ist bewusst (AC1 nutzt Custom Script)

---

## Usage Guidelines

**Für AI Agents:**
- Diese Datei VOR jeder Code-Implementierung lesen
- ALLE Regeln exakt befolgen
- Im Zweifel die restriktivere Option wählen

**Für Menschen:**
- Datei lean und fokussiert halten
- Bei Tech-Stack-Änderungen aktualisieren
- Quartalsweise auf veraltete Regeln prüfen
