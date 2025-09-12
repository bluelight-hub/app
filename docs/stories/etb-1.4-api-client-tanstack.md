# Story 1.4: API-Client-Generierung und TanStack Query Hooks

## Story Details
- **Story ID**: ETB-1.4
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 3
- **Sprint**: Phase 1

## User Story
**Als** Frontend-Entwickler  
**möchte ich** typsichere API-Calls nutzen  
**damit** die Kommunikation robust ist

## Acceptance Criteria
- [ ] API-Client mit `pnpm run generate-api` generiert
- [ ] TanStack Query Hooks implementiert
  - [ ] useEtb() - ETB abrufen
  - [ ] useCreateEtbEintrag() - Eintrag erstellen
  - [ ] useUpdateEtbEintrag() - Eintrag aktualisieren
  - [ ] useDeleteEtbEintrag() - Eintrag löschen
  - [ ] useEtbTextbausteine() - Textbausteine laden
- [ ] Optimistic Updates für bessere UX
- [ ] Error-Handling mit Toast-Notifications
- [ ] Retry-Logic konfiguriert
- [ ] Cache-Invalidierung implementiert

## Technical Requirements

### 1. Query Keys Management
```typescript
// packages/frontend/src/hooks/etb/etbQueryKeys.ts
export const etbKeys = {
  all: ['etb'] as const,
  lists: () => [...etbKeys.all, 'list'] as const,
  list: (filters: string) => [...etbKeys.lists(), { filters }] as const,
  details: () => [...etbKeys.all, 'detail'] as const,
  detail: (id: string) => [...etbKeys.details(), id] as const,
  eintraege: (etbId: string) => [...etbKeys.detail(etbId), 'eintraege'] as const,
  textbausteine: () => ['etb-textbausteine'] as const,
}
```

### 2. Main Query Hook
```typescript
// packages/frontend/src/hooks/etb/useEtb.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { etbKeys } from './etbQueryKeys'

export const useEtb = (einsatzId: string) => {
  return useQuery({
    queryKey: etbKeys.detail(einsatzId),
    queryFn: () => api.etb().getEtbByEinsatzId(einsatzId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
```

### 3. Mutations with Optimistic Updates
```typescript
// packages/frontend/src/hooks/etb/useEtbMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { toast } from '@/components/ui/toast'

export const useCreateEtbEintrag = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateEtbEintragDto) => 
      api.etb().createEtbEintrag(data),
    
    onMutate: async (newEintrag) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: etbKeys.eintraege(newEintrag.etbId) 
      })
      
      // Snapshot previous value
      const previousEintraege = queryClient.getQueryData(
        etbKeys.eintraege(newEintrag.etbId)
      )
      
      // Optimistically update
      queryClient.setQueryData(
        etbKeys.eintraege(newEintrag.etbId),
        (old: EtbEintrag[]) => [...old, { 
          ...newEintrag, 
          id: 'temp-' + Date.now(),
          timestamp: new Date(),
        }]
      )
      
      return { previousEintraege }
    },
    
    onError: (err, newEintrag, context) => {
      // Rollback on error
      queryClient.setQueryData(
        etbKeys.eintraege(newEintrag.etbId),
        context?.previousEintraege
      )
      toast.error('Fehler beim Erstellen des Eintrags')
    },
    
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: etbKeys.eintraege(variables.etbId) 
      })
    },
    
    onSuccess: () => {
      toast.success('Eintrag erfolgreich erstellt')
    },
  })
}
```

### 4. Real-time Subscription Integration
```typescript
// packages/frontend/src/hooks/etb/useEtbRealtime.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/hooks/useWebSocket'

export const useEtbRealtime = (etbId: string) => {
  const queryClient = useQueryClient()
  const { subscribe, unsubscribe } = useWebSocket()
  
  useEffect(() => {
    const channel = `etb:${etbId}`
    
    const handleUpdate = (event: EtbUpdateEvent) => {
      // Invalidate specific queries based on event type
      switch (event.type) {
        case 'EINTRAG_CREATED':
        case 'EINTRAG_UPDATED':
        case 'EINTRAG_DELETED':
          queryClient.invalidateQueries({ 
            queryKey: etbKeys.eintraege(etbId) 
          })
          break
        case 'ETB_LOCKED':
          queryClient.invalidateQueries({ 
            queryKey: etbKeys.detail(etbId) 
          })
          break
      }
    }
    
    subscribe(channel, handleUpdate)
    
    return () => unsubscribe(channel, handleUpdate)
  }, [etbId, queryClient, subscribe, unsubscribe])
}
```

### Hook-Struktur:
```
packages/frontend/src/hooks/etb/
├── useEtb.ts
├── useEtbMutations.ts
├── useEtbTextbausteine.ts
├── useEtbRealtime.ts
├── etbQueryKeys.ts
└── index.ts

// Keine manuellen API-Helper!
// NUR generierte Clients aus packages/shared/client/apis/
```

## Definition of Done
- [ ] Alle Hooks mit TypeScript typisiert
- [ ] Optimistic Updates getestet
- [ ] Error-States behandelt
- [ ] Loading-States implementiert
- [ ] Cache-Strategy dokumentiert

## Dependencies
- Story 1.3 (Backend API)

## Notes
- NIEMALS manuelle fetch() Calls
- IMMER TanStack Query verwenden
- Query Keys zentral verwalten
- Stale Time: 30 Sekunden für ETB-Daten