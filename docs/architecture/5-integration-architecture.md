# 5. Integration Architecture

## Backend ↔ Frontend Communication

**REST API via Generated TypeScript Client:**

```
┌─────────────────────────────────────────┐
│ Frontend                                │
│ ┌─────────────────────────────────────┐ │
│ │ useEinsaetze() Hook                 │ │
│ │   ↓                                 │ │
│ │ TanStack Query                      │ │
│ │   ↓                                 │ │
│ │ api.einsatz().getEinsaetze()        │ │
│ │   ↓                                 │ │
│ │ Generated EinsatzApi Client         │ │
│ └─────────────────┬───────────────────┘ │
└───────────────────┼─────────────────────┘
                    │
                    │ HTTP GET /api/alpha/einsaetze
                    │ Cookie: accessToken=...
                    │
┌───────────────────▼─────────────────────┐
│ Backend                                 │
│ ┌─────────────────────────────────────┐ │
│ │ @Get() findAll()                    │ │
│ │   ↓                                 │ │
│ │ @UseGuards(JwtAuthGuard)            │ │
│ │   ↓                                 │ │
│ │ EinsatzController                   │ │
│ │   ↓                                 │ │
│ │ EinsatzService                      │ │
│ │   ↓                                 │ │
│ │ EinsatzRepository                   │ │
│ │   ↓                                 │ │
│ │ Prisma Client                       │ │
│ └─────────────────┬───────────────────┘ │
└───────────────────┼─────────────────────┘
                    │
                    │ SQL Query
                    │
┌───────────────────▼─────────────────────┐
│ PostgreSQL                              │
└─────────────────────────────────────────┘
```

## API Generation Workflow

**Step-by-Step:**

1. **Backend: Define API with OpenAPI decorators**
   ```typescript
   @ApiOperation({ summary: 'Get all missions' })
   @ApiResponse({ status: 200, type: [EinsatzDto] })
   @Get()
   async findAll(): Promise<Einsatz[]> {
     return this.einsatzService.findAll();
   }
   ```

2. **Generate OpenAPI Spec**
   ```bash
   # Automatic on backend start
   # Output: packages/backend/openapi.json
   ```

3. **Generate TypeScript Client**
   ```bash
   pnpm run generate-api
   # Uses: openapi-typescript-codegen
   # Output: packages/shared/client/apis/
   ```

4. **Frontend: Import Generated Client**
   ```typescript
   import { api } from '@/api/backend-api';

   const useEinsaetze = () => {
     return useQuery({
       queryKey: ['einsaetze'],
       queryFn: () => api.einsatz().getEinsaetze()
     });
   };
   ```

**Benefits:**
- ✅ Type-safety across frontend/backend
- ✅ Auto-completion in IDE
- ✅ Compile-time errors for API mismatches
- ✅ Single source of truth (Backend OpenAPI)
- ✅ No manual API client maintenance

## Data Flow (Optimistic Updates)

**Pattern (ADR-020):**

```
User Action (e.g., Create Einsatz)
  ↓
1. Frontend: Optimistic Update (TanStack Query)
   - Update local cache immediately
   - Show pending indicator
  ↓
2. Backend: API Request
   - POST /api/alpha/einsaetze
  ↓
3a. Success:
   - Replace optimistic data with server data
   - Remove pending indicator
   - Show success toast

3b. Failure:
   - Rollback optimistic update
   - Restore previous data
   - Show error toast
  ↓
4. Refetch (onSettled)
   - Ensure data consistency
```

**Implementation:**
```typescript
const useCreateEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.einsatz().create(data),

    onMutate: async (newEinsatz) => {
      await queryClient.cancelQueries(['einsaetze']);
      const previous = queryClient.getQueryData(['einsaetze']);

      queryClient.setQueryData(['einsaetze'], (old) => [
        ...old,
        { ...newEinsatz, id: `temp-${Date.now()}` }
      ]);

      return { previous };
    },

    onError: (err, vars, context) => {
      queryClient.setQueryData(['einsaetze'], context.previous);
      toast.error('Fehler beim Erstellen');
    },

    onSuccess: (data) => {
      queryClient.setQueryData(['einsaetze'], (old) =>
        old.map(e => e.id.startsWith('temp-') ? data : e)
      );
      toast.success('Einsatz erstellt');
    },

    onSettled: () => {
      queryClient.invalidateQueries(['einsaetze']);
    }
  });
};
```

## Error Handling

**Frontend:**
- TanStack Query error handling
- Toast notifications (Sonner)
- Automatic retry on 401 (token refresh)
- Global error boundary

**Backend:**
- NestJS exception filters
- Custom HTTP exceptions
- Validation pipes (class-validator)
- Global error interceptor

---
