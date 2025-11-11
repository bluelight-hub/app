# Quick Navigation by Use Case

## "I need to add a new API endpoint"

**Steps:**
1. Read: [Backend API Contracts](./backend-api-contracts.md) - Understand existing patterns
2. Read: [Backend Data Models](./backend-data-models.md) - Understand database schema
3. Create endpoint in Backend with OpenAPI decorators
4. Run: `pnpm run generate-api` - Generate TypeScript client
5. Create TanStack Query hook in Frontend
6. Reference: [API Integration](./frontend-api-integration.md) - Usage patterns

**Example Flow:**
```typescript
// 1. Backend: packages/backend/src/example/example.controller.ts
@Controller('example')
@ApiTags('Example')
export class ExampleController {
  @Get()
  @ApiOperation({ summary: 'Get all examples' })
  @ApiResponse({ status: 200, type: [ExampleResponseDto] })
  async findAll(): Promise<ExampleResponseDto[]> {
    return this.exampleService.findAll();
  }
}

// 2. Generate API client
// $ pnpm run generate-api

// 3. Frontend: packages/frontend/src/hooks/queries/useExample.ts
export const useExamples = () => {
  return useQuery({
    queryKey: ['examples'],
    queryFn: async () => {
      const response = await api.example().findAll();
      return response.data;
    },
  });
};

// 4. Component: packages/frontend/src/components/organisms/ExampleList.tsx
export const ExampleList = () => {
  const { data, isLoading } = useExamples();
  return <>{/* render */}</>;
};
```

## "I need to add a new UI component"

**Steps:**
1. Read: [Component Inventory](./frontend-components.md) - Explore existing components
2. Follow Atomic Design principles:
   - **Atoms:** Basic elements (Button, Input, Badge)
   - **Molecules:** Composite components (FormField, SearchBar)
   - **Organisms:** Complex modules (EinsatzList, ETBEditor)
   - **Templates:** Page layouts
   - **Pages:** Route components
3. Use **ONLY** Tailwind CSS + Headless UI (no other frameworks!)
4. Reference existing components for patterns

**Example:**
```typescript
// packages/frontend/src/components/molecules/ExampleCard.tsx
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';

export const ExampleCard = ({ title, status }: Props) => {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant={status}>{status}</Badge>
      </div>
      <Button onClick={handleAction}>Action</Button>
    </div>
  );
};
```

## "I need to add a new database model"

**Steps:**
1. Read: [Data Models](./backend-data-models.md) - Understand schema conventions
2. Update: `packages/backend/prisma/schema.prisma`
3. Run: `pnpm --filter @bluelight-hub/backend prisma migrate dev`
4. Update DTOs and controllers
5. Regenerate API client: `pnpm run generate-api`

**Example:**
```prisma
// packages/backend/prisma/schema.prisma
model Example {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(255)
  description String?  @db.Text
  status      ExampleStatus @default(ACTIVE)

  // Audit fields (always include!)
  createdAt   DateTime @default(now())
  createdBy   String   @db.VarChar(100)
  updatedAt   DateTime @updatedAt
  updatedBy   String?  @db.VarChar(100)

  // Soft delete (if applicable)
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  deletedBy   String?  @db.VarChar(100)

  @@index([status])
  @@index([isDeleted])
}

enum ExampleStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

## "I need to understand data flow"

**Reading Order:**
1. [Integration Architecture](./integration-architecture.md) - **Start here**
2. [State Management](./frontend-state-management.md) - Frontend state patterns
3. [API Integration](./frontend-api-integration.md) - Frontend-backend communication

**Complete Request Flow:**
```
User Interaction
    ↓
Component (React)
    ↓
TanStack Query Hook (caching, optimistic updates)
    ↓
Generated API Client (type-safe, auto-generated)
    ↓
HTTP Request (axios, cookies for auth)
    ↓
Backend Controller (NestJS, OpenAPI decorators)
    ↓
Service Layer (business logic)
    ↓
Prisma Repository (ORM)
    ↓
PostgreSQL Database
```

## "I need to setup the project"

**Reading Order:**
1. [Development Guide](./development-guide.md) - **Complete setup instructions**
2. [Technology Stack](./technology-stack.md) - Understand dependencies
3. [Project Structure](./project-structure.md) - Navigate the codebase

**Quick Setup:**
```bash
# 1. Clone and install
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub
pnpm install

# 2. Setup database
docker-compose up -d postgres

# 3. Configure environment
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
# Edit .env files as needed

# 4. Run migrations
pnpm --filter @bluelight-hub/backend prisma migrate dev

# 5. Generate API client
pnpm run generate-api

# 6. Start all services
pnpm -r dev

# 7. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# Swagger: http://localhost:3000/api
```

---
