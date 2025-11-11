# Quick Navigation by Use Case

## "I need to add a new API endpoint"

1. Read: [Backend API Contracts](./.bmm-backend-api-contracts.md)
2. Read: [Backend Data Models](./.bmm-backend-data-models.md)
3. Create endpoint in Backend with OpenAPI decorators
4. Run: `pnpm run generate-api`
5. Create TanStack Query hook in Frontend
6. Reference: [API Integration](./.bmm-frontend-api-integration.md)

**Example:**
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
// pnpm run generate-api

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
```

## "I need to add a new UI component"

1. Read: [Component Inventory](./.bmm-frontend-components.md)
2. Follow Atomic Design principles (atoms → molecules → organisms)
3. Use Tailwind CSS + Headless UI (ONLY!)
4. Reference existing components for patterns

**Atomic Design Structure:**
```
atoms/      # Basic elements (Button, Input, Badge)
molecules/  # Composite components (FormField, SearchBar)
organisms/  # Complex modules (EinsatzList, ETBEditor)
templates/  # Page layouts
pages/      # Route components
```

## "I need to add a new database model"

1. Read: [Data Models](./.bmm-backend-data-models.md)
2. Update: `packages/backend/prisma/schema.prisma`
3. Run: `pnpm --filter @bluelight-hub/backend prisma migrate dev`
4. Update DTOs and controllers
5. Regenerate API client: `pnpm run generate-api`

**Prisma Migration:**
```bash
# Create migration
pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_example_model

# Generate Prisma Client
pnpm --filter @bluelight-hub/backend prisma:generate

# Update API and regenerate client
pnpm run generate-api
```

## "I need to understand data flow"

1. Read: [Integration Architecture](./.bmm-integration-architecture.md)
2. Read: [State Management](./.bmm-frontend-state-management.md)
3. Read: [API Integration](./.bmm-frontend-api-integration.md)

**Complete Request Flow:**
```
Component → TanStack Query Hook → Generated API Client → Backend Controller → Service → Prisma → PostgreSQL
```

---
