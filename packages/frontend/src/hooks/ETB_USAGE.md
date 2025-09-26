# ETB API Client Usage Patterns

## Übersicht

Die ETB (Einsatztagebuch) API-Integration nutzt TanStack Query für effizientes Datenmanagement mit automatischem Caching, Retry-Logic und Optimistic Updates.

## Hooks

### 1. `useEtb(einsatzId, page?, limit?)`

Lädt das ETB für einen spezifischen Einsatz mit optionaler Paginierung.

```tsx
import { useEtb } from '@/hooks/useEtb';

function EtbComponent({ einsatzId }) {
  const { data: etb, isLoading, error } = useEtb(einsatzId, 1, 20);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <EtbList entries={etb.data.eintraege} />;
}
```

### 2. `useTextbausteine()`

Lädt alle verfügbaren Textbausteine für die schnelle Eingabe.

```tsx
import { useTextbausteine } from '@/hooks/useEtb';

function TextbausteinePicker() {
  const { data, isLoading } = useTextbausteine();

  return (
    <Select>
      {data?.data?.map((textbaustein) => (
        <Option key={textbaustein.id} value={textbaustein.text}>
          {textbaustein.kategorie}: {textbaustein.text}
        </Option>
      ))}
    </Select>
  );
}
```

### 3. `useCreateEtb()`

Erstellt ein neues ETB für einen Einsatz.

```tsx
import { useCreateEtb } from '@/hooks/useEtb';

function CreateEtbButton({ einsatzId }) {
  const createEtb = useCreateEtb();

  const handleCreate = () => {
    createEtb.mutate({
      einsatzId,
      einsatzleiter: 'Max Mustermann',
    });
  };

  return (
    <Button onClick={handleCreate} disabled={createEtb.isPending}>
      ETB erstellen
    </Button>
  );
}
```

### 4. `useCreateEtbEintrag()`

Fügt einen neuen Eintrag zum ETB hinzu.

```tsx
import { useCreateEtbEintrag } from '@/hooks/useEtb';

function AddEtbEntry({ etbId }) {
  const createEintrag = useCreateEtbEintrag();

  const handleSubmit = (formData) => {
    createEintrag.mutate({
      etbId,
      data: {
        zeit: new Date().toISOString(),
        absender: formData.absender,
        empfaenger: formData.empfaenger,
        nachricht: formData.nachricht,
        kategorie: 'MELDUNG',
      },
    });
  };

  return <EtbEntryForm onSubmit={handleSubmit} />;
}
```

### 5. `useUpdateEtbEintrag()`

Aktualisiert einen bestehenden ETB-Eintrag.

```tsx
import { useUpdateEtbEintrag } from '@/hooks/useEtb';

function EditEtbEntry({ eintragId, currentData }) {
  const updateEintrag = useUpdateEtbEintrag();

  const handleUpdate = (updatedData) => {
    updateEintrag.mutate({
      eintragId,
      data: updatedData,
    });
  };

  return <EtbEntryForm defaultValues={currentData} onSubmit={handleUpdate} />;
}
```

### 6. `useDeleteEtbEintrag()`

Löscht einen ETB-Eintrag (Soft Delete).

```tsx
import { useDeleteEtbEintrag } from '@/hooks/useEtb';

function DeleteEtbEntryButton({ eintragId, einsatzId }) {
  const deleteEintrag = useDeleteEtbEintrag();

  const handleDelete = () => {
    if (confirm('Eintrag wirklich löschen?')) {
      deleteEintrag.mutate({ eintragId, einsatzId });
    }
  };

  return (
    <Button onClick={handleDelete} variant="danger">
      Löschen
    </Button>
  );
}
```

### 7. `useEtbOperations(einsatzId?)`

Kombinierter Hook für alle ETB-Operationen.

```tsx
import { useEtbOperations } from '@/hooks/useEtb';

function EtbManager({ einsatzId }) {
  const {
    etb,
    isLoadingEtb,
    textbausteine,
    createEintrag,
    updateEintrag,
    deleteEintrag,
    isCreatingEintrag,
  } = useEtbOperations(einsatzId);

  // Alle ETB-Funktionen in einem Hook
}
```

## Caching-Strategien

### Stale Time

- **ETB-Daten**: 30 Sekunden - ETB wird häufig aktualisiert
- **Textbausteine**: 60 Sekunden - Textbausteine ändern sich selten

### Query Keys Struktur

```tsx
QUERY_KEYS.etb = {
  all: ['etb'],
  byEinsatz: (einsatzId, page?, limit?) => ['etb', 'einsatz', einsatzId, { page, limit }],
  eintraege: (etbId) => ['etb', etbId, 'eintraege'],
  eintrag: (eintragId) => ['etb', 'eintrag', eintragId],
  textbausteine: () => ['etb', 'textbausteine'],
};
```

### Cache Invalidierung

Nach Mutationen werden relevante Queries automatisch invalidiert:

- **Create ETB**: Invalidiert `byEinsatz` Query
- **Create/Update/Delete Eintrag**: Invalidiert `byEinsatz` und spezifische `eintrag` Queries
- **Alle Mutationen**: Invalidieren global `etb.all` für Konsistenz

## Error Handling

### Retry Logic

Alle Queries und Mutationen nutzen exponentielles Backoff:

```tsx
function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}
```

- **Max Retries**: 3
- **Backoff**: 1s, 2s, 4s, 8s, 16s, max 30s

### Error Messages

Nutzt zentralisiertes Error Handling mit Toast-Benachrichtigungen:

```tsx
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { toast } from 'sonner';

// Automatische Fehlerbehandlung in Hooks
onError: async (error) => {
  const message = await getApiErrorMessage(error, 'Fallback-Nachricht', 'operation-name');
  toast.error('Fehler', { description: message });
};
```

## Optimistic Updates

Momentan sind Optimistic Updates vorbereitet aber nicht vollständig implementiert. Die Struktur ist vorhanden in den `onMutate` Callbacks:

```tsx
onMutate: async ({ etbId, data }) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({
    queryKey: QUERY_KEYS.etb.eintraege(etbId),
  });

  // TODO: Implement optimistic update
  // const previousData = queryClient.getQueryData(...);
  // queryClient.setQueryData(..., optimisticData);

  return { etbId, data };
};
```

## Best Practices

1. **Verwende den kombinierten Hook** (`useEtbOperations`) wenn mehrere ETB-Funktionen benötigt werden
2. **Nutze Textbausteine** für konsistente und schnelle Eingabe
3. **Implementiere Loading States** während Mutationen laufen
4. **Behandle Fehler graceful** mit Fallback-UI
5. **Nutze TypeScript** für Type-Safety mit generierten Types

## Performance-Optimierungen

1. **Lazy Loading**: Lade ETB nur wenn benötigt (`enabled: !!einsatzId`)
2. **Paginierung**: Nutze Paginierung für große ETB-Listen
3. **Selective Invalidation**: Invalidiere nur betroffene Queries
4. **Stale-While-Revalidate**: Zeige gecachte Daten während Revalidierung

## Migration von Legacy Code

Falls alter Code direkte API-Calls nutzt:

```tsx
// ALT - Direkte API Calls
const response = await fetch('/api/etb/' + einsatzId);
const data = await response.json();

// NEU - Mit Hooks
const { data, isLoading } = useEtb(einsatzId);
```

## Testing

Für Tests können die Hooks mit Mock-Providern gewrappt werden:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

test('loads ETB data', async () => {
  const { result } = renderHook(() => useEtb('einsatz-123'), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toBeDefined();
});
```