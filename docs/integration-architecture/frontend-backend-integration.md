# Frontend → Backend Integration

## Generated OpenAPI Client

**Location:** `packages/shared/client/apis/`

**Generation Command:**
```bash
pnpm run generate-api
```

**Process:**
1. Backend exposes OpenAPI spec at `/api-json`
2. OpenAPI Generator CLI reads spec
3. Generates TypeScript client with:
   - Type-safe API functions
   - Request/response DTOs
   - Enum definitions
   - Error handling

**Example Generated Client:**
```typescript
// packages/shared/client/apis/EinsaetzeApi.ts
export class EinsaetzeApi {
  async einsaetzeControllerFindAll(
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<EinsatzResponseDto[]>> {
    return axios.get('/api/einsaetze', options);
  }

  async einsaetzeControllerArchive(
    id: string,
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<EinsatzResponseDto>> {
    return axios.post(`/api/einsaetze/${id}/archive`, {}, options);
  }
}
```

## TanStack Query Integration

**Frontend:** Wraps generated client in Query hooks for caching + reactivity

**Example Hook:**
```typescript
// packages/frontend/src/hooks/queries/useEinsaetze.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useEinsaetze = () => {
  return useQuery({
    queryKey: ['einsaetze'],
    queryFn: async () => {
      const response = await api.einsaetze().einsaetzeControllerFindAll();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const useArchiveEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.einsaetze().einsaetzeControllerArchive(id);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['einsaetze'] });
    },
  });
};
```

**Component Usage:**
```typescript
// packages/frontend/src/components/organisms/EinsatzList.tsx
import { useEinsaetze, useArchiveEinsatz } from '@/hooks/queries/useEinsaetze';

export const EinsatzList = () => {
  const { data: einsaetze, isLoading } = useEinsaetze();
  const archiveMutation = useArchiveEinsatz();

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {einsaetze?.map((einsatz) => (
        <li key={einsatz.id}>
          {einsatz.alarmstichwort}
          <button onClick={() => archiveMutation.mutate(einsatz.id)}>
            Archive
          </button>
        </li>
      ))}
    </ul>
  );
};
```

---
