# Toast Notification Integration

Dieses Feature nutzt `sonner` für Toast Notifications.

## Installation

`sonner` ist bereits installiert (v2.0.7).

## Provider Setup

Der `Toaster` Provider muss in der App Root eingebunden werden:

```tsx
// src/App.tsx oder src/main.tsx
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* Rest of App */}
    </>
  );
}
```

## Usage in Deep Link Integration (Task 5)

### Success Toast
Wird angezeigt wenn Server erfolgreich hinzugefügt wurde:

```typescript
import { toast } from 'sonner';

// On Success
toast.success(`Server '${serverName}' hinzugefügt`, {
  duration: 2500, // 2.5s visible
});
```

### Error Toast
Wird angezeigt wenn Einladungslink abgelaufen ist:

```typescript
import { toast } from 'sonner';

// On Error (Expired Link)
toast.error('Dieser Einladungslink ist abgelaufen.', {
  duration: 3000, // 3s visible
});
```

### Loading Toast (Optional)
Falls längere Verbindungszeiten erwartet werden:

```typescript
import { toast } from 'sonner';

// Start Loading
const toastId = toast.loading('Verbinde mit Server...');

// Update on Success
toast.success(`Server '${serverName}' hinzugefügt`, { id: toastId });

// Update on Error
toast.error('Verbindung fehlgeschlagen.', { id: toastId });
```

## Konfiguration

### Position
Default: `top-right`

Weitere Optionen:
- `top-left`
- `top-center`
- `bottom-left`
- `bottom-center`
- `bottom-right`

### Theme
Unterstützt Dark Mode automatisch via `theme` prop:

```tsx
<Toaster theme="system" />
```

## Accessibility

Sonner unterstützt ARIA Live Regions automatisch:
- Success/Info: `aria-live="polite"`
- Error/Warning: `aria-live="assertive"`
- Loading: `role="status"`

## Integration in App Lifecycle Hook (Task 5)

```typescript
// features/server/hooks/useDeepLinkEffect.ts
import { toast } from 'sonner';
import { useExchangeInvite } from '../api/mutations';

export const useDeepLinkEffect = () => {
  const exchangeInvite = useExchangeInvite({
    onSuccess: (data) => {
      toast.success(`Server '${data.data.serverInfo.name}' hinzugefügt`, {
        duration: 2500,
      });
    },
    onError: (error) => {
      // Check if expired link
      if (error.message.includes('expired')) {
        toast.error('Dieser Einladungslink ist abgelaufen.');
      } else {
        toast.error('Fehler beim Hinzufügen des Servers.');
      }
    },
  });

  // ... rest of hook
};
```

## Testing

Sonner Toasts können in Tests gemockt werden:

```typescript
import { vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));
```

## Dokumentation

- [Sonner GitHub](https://github.com/emilkowalski/sonner)
- [Sonner Docs](https://sonner.emilkowal.ski/)
