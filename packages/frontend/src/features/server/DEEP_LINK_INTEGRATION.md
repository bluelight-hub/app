# Deep Link Integration - Desktop App

## Overview

Deep Link Integration ermöglicht das Hinzufügen von neuen Servern via `bluelight://connect` URLs direkt aus einem
Webbrowser in die Desktop App. Diese Dokumentation beschreibt die vollständige End-to-End Integration.

## Architecture

```
User clicks Link in Browser
        ↓
OS opens Tauri Desktop App
        ↓
Tauri Deep Link Plugin
        ↓
DeepLinkService (Event Emitter)
        ↓
useDeepLinkEffect Hook
        ↓
useExchangeInvite Mutation (API Call)
        ↓
Server Store (Persistence)
        ↓
TanStack Router Navigation to /auth
```

## Components

### 1. DeepLinkService (Event Layer)

**Location:** `src/features/server/services/deep-link.service.ts`

**Responsibilities:**

- Tauri Plugin Integration (Cold Start + Warm Start)
- URL Parsing (`bluelight://connect?url=...&invite=...&expires=...`)
- Client-side Validation (Protocol, Parameters, Expiry)
- Event Emission (`deep-link-received`, `deep-link-error`)

**Pattern:** Singleton with Event Emitter

**Example:**

```typescript
const deepLinkService = DeepLinkService.getInstance();

deepLinkService.on('deep-link-received', (params) => {
  console.log('Server URL:', params.serverUrl);
  console.log('Invite Code:', params.inviteCode);
  console.log('Expires At:', params.expiresAt);
});

deepLinkService.initialize();
```

### 2. useExchangeInvite (API Layer)

**Location:** `src/features/server/api/mutations.ts`

**Responsibilities:**

- API Call: POST `/auth/exchange-invite`
- Server Store Updates (addServer, setActiveServer)
- Query Cache Invalidation
- Error Handling

**Integration:**

```typescript
const exchangeInvite = useExchangeInvite();

exchangeInvite.mutate('INV_12345678', {
  onSuccess: (response) => {
    // Server automatically added to store
    // Server automatically set as active
    console.log('Server Name:', response.data.serverInfo.name);
  },
  onError: (error) => {
    console.error('Exchange failed:', error);
  },
});
```

### 3. useDeepLinkEffect (Integration Layer)

**Location:** `src/features/server/hooks/useDeepLinkEffect.ts`

**Responsibilities:**

- App Lifecycle Hook Integration
- Event Listener Registration
- Orchestration (DeepLinkService → useExchangeInvite → Navigation)
- Toast Notifications (sonner)
- Error Handling

**Integration:**

```typescript
// In __root.tsx
function RootComponent() {
  useDeepLinkEffect(); // Initialize Deep Link Handler

  return <App />;
}
```

**Features:**

- ✅ Loading UI (Toast Notification)
- ✅ Client-side Expiry Check
- ✅ API Call via useExchangeInvite
- ✅ Success Toast mit Server Name
- ✅ Navigation zu Login Screen (`/auth`)
- ✅ Error Handling mit User-friendly Messages
- ✅ Cleanup on Unmount

## URL Format

```
bluelight://connect?url=<SERVER_URL>&invite=<INVITE_CODE>&expires=<ISO_8601_TIMESTAMP>
```

**Parameters:**

- `url` (required): Backend API Base URL (z.B. `https://api.feuerwehr.de`)
- `invite` (required): Zeitlich begrenzter Invite Code (z.B. `INV_12345678`)
- `expires` (optional): ISO 8601 Timestamp für Link-Ablauf

**Examples:**

```
bluelight://connect?url=https://api.test.de&invite=INV_12345678

bluelight://connect?url=https://api.test.de&invite=INV_12345678&expires=2025-01-15T14:00:00.000Z
```

## Flow Diagrams

### Success Flow

```
1. User clicks Deep Link in Browser
   ↓
2. Tauri opens Desktop App (Cold/Warm Start)
   ↓
3. DeepLinkService emits 'deep-link-received' event
   ↓
4. useDeepLinkEffect receives event
   ↓
5. Optional: Client-side Expiry Check (if expires parameter present)
   ↓
6. Show Loading Toast ("Verbinde mit Server...")
   ↓
7. useExchangeInvite.mutateAsync(inviteCode)
   ↓
8. Backend validates Invite Code + returns Server-Access-Token
   ↓
9. useExchangeInvite.onSuccess: addServer() + setActiveServer()
   ↓
10. Show Success Toast ("Server 'XYZ' hinzugefügt")
   ↓
11. Navigate to /auth (Login Screen)
```

### Error Flow: Expired Link (Client-side)

```
1. User clicks Deep Link with old expires parameter
   ↓
2. useDeepLinkEffect receives event
   ↓
3. Client-side Expiry Check: Date(expires) < Date.now()
   ↓
4. Show Error Toast ("Dieser Einladungslink ist abgelaufen")
   ↓
5. STOP (no API call, no navigation)
```

### Error Flow: Invalid Invite Code

```
1. User clicks Deep Link
   ↓
2. useExchangeInvite.mutateAsync(inviteCode)
   ↓
3. Backend returns 400 Bad Request (Invalid Invite Code)
   ↓
4. useExchangeInvite.onError triggered
   ↓
5. Show Error Toast ("Fehler beim Verbinden mit Server")
   ↓
6. STOP (no navigation)
```

## Error Handling

### Client-side Validation Errors

| Error Type           | Toast Message             | Description                            |
| -------------------- | ------------------------- | -------------------------------------- |
| `INVALID_PROTOCOL`   | "Ungültiger Link"         | Protocol nicht `bluelight://`          |
| `MISSING_PARAMETERS` | "Ungültiger Link"         | Fehlende `url` oder `invite` Parameter |
| `EXPIRED_LINK`       | "Link abgelaufen"         | Client-side Expiry Check failed        |
| `PARSE_ERROR`        | "Fehler beim Verarbeiten" | URL parsing fehlgeschlagen             |

### API Call Errors

- **Network Error:** Toast mit Retry-Suggestion
- **Invalid Invite Code:** Toast mit "Bitte neuen Link anfordern"
- **Server Error:** Toast mit Error Message
- **All Errors:** Navigation zu Login Screen NICHT ausgeführt

## Toast Notifications

### Loading State

```typescript
toast.loading('Verbinde mit Server...', {
  description: 'Tausche Einladungscode ein',
});
```

### Success State

```typescript
toast.success("Server 'Test Server' hinzugefügt", {
  description: 'Du wirst zur Anmeldung weitergeleitet',
  duration: 2500,
});
```

### Error State

```typescript
toast.error('Fehler beim Verbinden mit Server', {
  description: error.message,
  duration: 5000,
});
```

## Testing

### Unit Tests

**Location:** `src/features/server/hooks/useDeepLinkEffect.spec.tsx`

**Test Suites:**

1. **Success Flow:** Deep Link → Exchange → Navigate
2. **Error Handling:** Expired Links, Invalid Codes, Network Errors
3. **Deep Link Error Events:** Protocol, Parameters, Parsing Errors
4. **Cleanup:** Event Listener removal on unmount

**Run Tests:**

```bash
pnpm --filter @bluelight-hub/frontend test useDeepLinkEffect
```

### Integration Test Example

```typescript
// Given: Valid Deep Link
const mockResponse = {
  data: {
    accessToken: 'test-token-123',
    serverInfo: {
      name: 'Test Server',
      baseUrl: 'https://api.test.de',
    },
  },
};

mockMutateAsync.mockResolvedValue(mockResponse);

// When: Emit Deep Link Event
deepLinkService.emit('deep-link-received', {
  serverUrl: 'https://api.test.de',
  inviteCode: 'INV_12345678',
  expiresAt: null,
});

// Then: Verify Navigation
await waitFor(() => {
  expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
});
```

## Backend Integration

### API Endpoint

```
POST /auth/exchange-invite
Content-Type: application/json

{
  "inviteCode": "INV_12345678"
}
```

### Response Format

```json
{
  "data": {
    "accessToken": "sat_abc123...",
    "serverInfo": {
      "name": "Feuerwehr München",
      "baseUrl": "https://api.feuerwehr-muenchen.de"
    }
  },
  "meta": {
    "timestamp": "2025-01-09T14:00:00.000Z",
    "version": "alpha",
    "requestId": "req-123"
  }
}
```

## Server Store Integration

### Automatic Server Addition

```typescript
// In useExchangeInvite.onSuccess
const newServer = {
  name: serverInfo.name,
  url: serverInfo.baseUrl,
  accessToken,
  isDefault: false,
  lastUsedAt: new Date().toISOString(),
};

await addServer(newServer); // Persisted to storage
```

### Automatic Active Server Selection

```typescript
// In useExchangeInvite.onSuccess (after addServer)
await setActiveServer(addedServer.id);
```

**Result:**

- Server erscheint in Server List UI
- Server ist als aktiv markiert
- Alle API Calls verwenden neuen Server
- Navigation zu Login Screen

## Navigation

### Target Route

```
/auth
```

**Route Definition:** `src/routes/auth.tsx`

**Component:** `LoginWindow`

**Before Load Guard:**

- Check `isSetupRedirectInProgress()`
- Redirect zu `/setup` falls Server nicht konfiguriert

### Navigation Call

```typescript
navigate({ to: '/auth' });
```

**Timing:** Nach erfolgreicher API Response und Server Store Update

## Troubleshooting

### Problem: Deep Link startet App nicht

**Lösung:**

1. Check Tauri Plugin Configuration (`tauri.conf.json`)
2. Verify Protocol Registration (`bluelight://`)
3. Rebuild Desktop App (`pnpm --filter @bluelight-hub/frontend tauri:build`)

### Problem: Toast Notifications nicht sichtbar

**Lösung:**

1. Verify `<Toaster />` in `__root.tsx`
2. Check Z-Index Conflicts
3. Verify sonner CSS Import

### Problem: Navigation funktioniert nicht

**Lösung:**

1. Check Route exists (`/auth` in `src/routes/auth.tsx`)
2. Verify TanStack Router Setup
3. Check Browser Console for Navigation Errors

### Problem: Server erscheint nicht in Liste

**Lösung:**

1. Check `addServer()` in `useExchangeInvite.onSuccess`
2. Verify Storage Persistence (`localStorage` oder Tauri Store)
3. Check Query Cache Invalidation

## Related Documentation

- **DeepLinkService Tests:** `src/features/server/services/__tests__/deep-link.service.spec.ts`
- **useExchangeInvite Tests:** `src/features/server/api/__tests__/mutations.spec.ts`
- **Toast Integration Guide:** `src/features/server/ui/molecules/TOAST_INTEGRATION.md`
- **Server Store:** `src/features/server/stores/server.store.ts`
- **TanStack Router:** `src/routes/`

## Version History

| Version | Date       | Changes                            |
| ------- | ---------- | ---------------------------------- |
| 1.0.0   | 2025-01-09 | Initial implementation (Story 2.4) |
|         |            | - DeepLinkService Event Emitter    |
|         |            | - useExchangeInvite Mutation       |
|         |            | - useDeepLinkEffect Hook           |
|         |            | - Navigation to /auth              |
|         |            | - Toast Notifications              |
|         |            | - Integration Tests                |
