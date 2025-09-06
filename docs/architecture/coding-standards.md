# Coding Standards - Bluelight Hub

## 🎯 Überblick

Dieses Dokument definiert die Coding-Standards und Konventionen für das Bluelight Hub Projekt. Alle Entwickler müssen
diese Standards einhalten, um konsistenten, wartbaren und qualitativ hochwertigen Code zu gewährleisten.

## 📋 Allgemeine Prinzipien

### Core Values

1. **Klarheit über Cleverness** - Code soll verständlich sein, nicht clever
2. **Konsistenz** - Einheitliche Patterns über alle Module hinweg
3. **Explizit über Implizit** - Intentionen klar ausdrücken
4. **Typsicherheit** - TypeScript strikt nutzen, keine `any` ohne Dokumentation
5. **Clean Code** - SOLID Prinzipien befolgen

### Breaking Rules (NIEMALS brechen!)

- **NIEMALS** manuelle API-Helper erstellen - IMMER generierte Clients nutzen
- **NIEMALS** andere UI-Frameworks als Tailwind CSS + Headless UI verwenden
- **NIEMALS** HTML Forms - IMMER @tanstack/react-form mit Zod
- **NIEMALS** `--no-verify` bei Commits verwenden
- **NIEMALS** Redux oder andere State-Libraries - NUR @tanstack/react-store

## 🏗️ Architektur-Standards

### Frontend (React + TypeScript)

#### Atomic Design Pattern

```text
// Struktur MUSS Atomic Design folgen:
src/
├── components/
│   ├── atoms/        // Basis-Komponenten
│   ├── molecules/    // Kombinierte Komponenten  
│   ├── organisms/    // Komplexe Module
│   ├── templates/    // Seiten-Layouts
│   └── pages/        // Route-Komponenten
```

#### Component Guidelines

```tsx
// ✅ RICHTIG: Funktionale Komponente mit TypeScript
interface ButtonProps {
    variant: 'primary' | 'secondary';
    onClick: () => void;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({variant, onClick, children}) => {
    return (
        <button
            className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
                variant === 'secondary' && "bg-gray-200 text-gray-800 hover:bg-gray-300"
            )}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

// ❌ FALSCH: Class Component oder untypisierte Props
```

#### State Management

```typescript
// ✅ RICHTIG: TanStack Store für globalen State
import {Store} from '@tanstack/react-store';

export const userStore = new Store({
    user: null,
    isAuthenticated: false,
});

// ❌ FALSCH: Redux, MobX, Zustand
```

#### API Integration

```typescript
// ✅ RICHTIG: Generierte API-Clients mit TanStack Query
import {useQuery} from '@tanstack/react-query';
import {api} from '@/api/generated';

export const useEinsaetze = () => {
    return useQuery({
        queryKey: ['einsaetze'],
        queryFn: () => api.einsatz().getEinsaetze(),
    });
};

// ❌ FALSCH: Manueller fetch oder axios
```

### Backend (NestJS + TypeScript)

#### Module Structure

```text
// Jedes Modul MUSS diese Struktur haben:
modules /
└── feature /
    ├── controllers /
    │   └── feature.controller.ts
    ├── services /
    │   └── feature.service.ts
    ├── repositories /
    │   └── feature.repository.ts
    ├── dto /
    │   ├── create - feature.dto.ts
    │   └── update - feature.dto.ts
    ├── entities /
    │   └── feature.entity.ts
    └── feature.module.ts
```

#### Service Pattern

```typescript
// ✅ RICHTIG: Clean Service mit Dependency Injection
@Injectable()
export class EinsatzService {
    constructor(
        private readonly repository: EinsatzRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {
    }

    async createEinsatz(dto: CreateEinsatzDto): Promise<Einsatz> {
        const einsatz = await this.repository.create(dto);
        this.eventEmitter.emit('einsatz.created', einsatz);
        return einsatz;
    }
}

// ❌ FALSCH: Direct DB access in Controller
```

#### DTOs und Validation

```typescript
// ✅ RICHTIG: Class-validator mit Swagger decorators
import {IsString, IsEnum, IsOptional} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class CreateEinsatzDto {
    @ApiProperty({description: 'Einsatzbezeichnung'})
    @IsString()
    bezeichnung: string;

    @ApiProperty({enum: EinsatzStatus})
    @IsEnum(EinsatzStatus)
    status: EinsatzStatus;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    beschreibung?: string;
}
```

## 🎨 UI/UX Standards

### Tailwind CSS Konventionen

```tsx
// ✅ RICHTIG: Utility-First mit cn() helper
import {cn} from '@/utils/cn';

<div className={cn(
    "flex items-center gap-4",
    isActive && "bg-blue-50",
    isDisabled && "opacity-50 cursor-not-allowed"
)}></div>

// ❌ FALSCH: Inline styles oder CSS-in-JS
<div style={{display: 'flex'}}></div>
```

### Headless UI Integration

```tsx
// ✅ RICHTIG: Headless UI mit Tailwind styling
import {Dialog} from '@headlessui/react';

<Dialog
    open={isOpen}
    onClose={() => setOpen(false)}
    className="relative z-50"
>
    <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
    {/* Dialog content */}
</Dialog>

// ❌ FALSCH: Custom modal implementations
```

### Forms mit TanStack Form

```typescript
// ✅ RICHTIG: TanStack Form mit Zod validation
import {useForm} from '@tanstack/react-form';
import {z} from 'zod';

const schema = z.object({
    bezeichnung: z.string().min(3),
    status: z.enum(['aktiv', 'abgeschlossen']),
});

export const EinsatzForm = () => {
    const form = useForm({
        defaultValues: {bezeichnung: '', status: 'aktiv'},
        onSubmit: async ({value}) => {
            const validated = schema.parse(value);
            await api.einsatz().createEinsatz(validated);
        },
    });
};
```

## 💾 Datenbank-Standards

### Prisma Schema Conventions

```prisma
// ✅ RICHTIG: Klare Namenskonventionen
model Einsatz {
  id          String        @id @default(cuid())
  bezeichnung String        
  status      EinsatzStatus 
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  einheiten  Einheit[]
  ereignisse Ereignis[]

  @@map("einsaetze")
}

enum EinsatzStatus {
  VORBEREITUNG
  AKTIV
  ABGESCHLOSSEN

  @@map("einsatz_status")
}
```

### Migration Best Practices

```bash
# ✅ RICHTIG: Descriptive migration names
npx prisma migrate dev --name add_einsatz_status_field

# ❌ FALSCH: Generic names
npx prisma migrate dev --name update
```

## 🧪 Testing Standards

### Unit Tests

```typescript
// ✅ RICHTIG: Descriptive test with AAA pattern
describe('EinsatzService', () => {
    describe('createEinsatz', () => {
        it('should create a new Einsatz with status VORBEREITUNG', async () => {
            // Arrange
            const dto = {bezeichnung: 'Brand Hauptstraße'};

            // Act
            const result = await service.createEinsatz(dto);

            // Assert
            expect(result.status).toBe(EinsatzStatus.VORBEREITUNG);
            expect(result.bezeichnung).toBe(dto.bezeichnung);
        });
    });
});
```

### E2E Tests

```typescript
// ✅ RICHTIG: Playwright für E2E
import {test, expect} from '@playwright/test';

test('Einsatz creation flow', async ({page}) => {
    await page.goto('/einsaetze/neu');
    await page.fill('[name="bezeichnung"]', 'Test Einsatz');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/einsaetze/[^/]+');
});
```

## 📝 Code Documentation

### JSDoc Standards (Deutsch für technische Docs)

```typescript
/**
 * Erstellt einen neuen Einsatz im System.
 *
 * @param dto - Die Einsatzdaten für die Erstellung
 * @returns Der erstellte Einsatz mit generierter ID
 * @throws {ValidationException} Wenn die Eingabedaten ungültig sind
 * @throws {ConflictException} Wenn bereits ein aktiver Einsatz existiert
 *
 * @example
 * const einsatz = await service.createEinsatz({
 *   bezeichnung: 'Brand Hauptstraße 15',
 *   einsatzart: 'BRAND_MITTEL'
 * });
 */
async function createEinsatz(dto: CreateEinsatzDto): Promise<Einsatz> {
    // Implementation
}
```

## 🔄 Git Workflow

### Branch Naming

```text
# Format: <type>/<ticket>-<description>
feature/APP-123-einsatz-verwaltung
bugfix/APP-456-fix-login-redirect
hotfix/APP-789-critical-db-issue
```

### Commit Messages

```text
# Format: <emoji>(<scope>): <description>
✨(einsatz): Add Einsatz creation with minimal data
🐛(auth): Fix JWT token refresh logic
♻️(ui): Refactor Button component to use Headless UI
💥(api): BREAKING: Change API response format

# Semantic Release Triggers:
# 💥 → Major version (Breaking changes)
# ✨ → Minor version (New features)
# 🐛 → Patch version (Bug fixes)
```

## 🚨 Error Handling

### Frontend Error Boundaries

```tsx
// ✅ RICHTIG: Error Boundary für robuste Apps
export class ErrorBoundary extends Component {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // Send to monitoring service
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback/>;
        }
        return this.props.children;
    }
}
```

### Backend Exception Handling

```typescript
// ✅ RICHTIG: Custom exceptions mit proper HTTP codes
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        if (exception instanceof HttpException) {
            return response.status(exception.getStatus()).json({
                statusCode: exception.getStatus(),
                message: exception.message,
                timestamp: new Date().toISOString(),
            });
        }

        // Log unknown errors
        console.error('Unhandled exception:', exception);
        return response.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
        });
    }
}
```

## 🔒 Security Standards

### Authentication & Authorization

```typescript
// ✅ RICHTIG: JWT mit proper guards
@Controller('einsaetze')
@UseGuards(JwtAuthGuard)
export class EinsatzController {
    @Post()
    @Roles('EINSATZLEITER', 'ADMIN')
    @UseGuards(RolesGuard)
    async create(@Body() dto: CreateEinsatzDto) {
        // Only EINSATZLEITER or ADMIN can create
    }
}
```

### Data Validation

```typescript
// ✅ RICHTIG: Immer validieren, niemals vertrauen
const sanitizedInput = DOMPurify.sanitize(userInput);
const validated = schema.parse(sanitizedInput);
```

## 🎯 Performance Guidelines

### Lazy Loading

```tsx
// ✅ RICHTIG: Lazy load heavy components
const MapComponent = lazy(() => import('./components/Map'));

<Suspense fallback={<MapSkeleton/>}>
    <MapComponent/>
</Suspense>
```

### Query Optimization

```typescript
// ✅ RICHTIG: Select only needed fields
const einsatz = await prisma.einsatz.findUnique({
    where: {id},
    select: {
        id: true,
        bezeichnung: true,
        status: true,
        // Nicht alles laden
    }
});
```

## 📦 Dependency Management

### Package Installation

```bash
# ✅ RICHTIG: Workspace-aware installation
pnpm add --filter @bluelight-hub/frontend react-icons

# ❌ FALSCH: Direct npm/yarn in subfolder
cd packages/frontend && npm install react-icons
```

## 🔍 Code Review Checklist

Vor jedem PR sicherstellen:

- [ ] Code folgt allen Standards in diesem Dokument
- [ ] Tests geschrieben und grün
- [ ] API-Client regeneriert falls Backend-Änderungen
- [ ] JSDoc für public methods (Backend)
- [ ] Keine `console.log` statements
- [ ] Keine `any` types ohne Kommentar
- [ ] Tailwind classes statt inline styles
- [ ] TanStack Form für alle Forms
- [ ] Commit messages folgen Convention
- [ ] Branch naming korrekt
- [ ] arc42 Dokumentation aktualisiert falls Architektur-Änderung

## 📚 Weiterführende Ressourcen

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [NestJS Best Practices](https://docs.nestjs.com/techniques)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/reusing-styles)
- [Clean Code Principles](https://clean-code-developer.de/)