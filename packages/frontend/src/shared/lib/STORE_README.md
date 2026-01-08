# Tauri Store Service

Zentrale Schnittstelle für verschlüsselte lokale Datenpersistierung in der Bluelight Hub Desktop-Anwendung.

## Installation Status

- [x] Plugin installiert: `@tauri-apps/plugin-store@^2.4.1`
- [x] Tauri Capabilities konfiguriert: `src-tauri/capabilities/default.json`
- [x] Service implementiert: `store.service.ts`
- [x] React Hooks implementiert: `use-store.ts`
- [x] Unit Tests: `__tests__/store.service.test.ts`
- [x] Hook Tests: `__tests__/use-store.test.ts`
- [x] Dokumentation: `/docs/development-guide/tauri-plugins.md`

## Quick Start

### Service-basierter Zugriff

```typescript
import { storeService } from '@/shared/lib';

// Initialize (auto on first use)
await storeService.initialize();

// Set
await storeService.set('key', 'value');

// Get
const value = await storeService.get('key', 'default');

// Delete
await storeService.delete('key');
```

### React Hook Integration

```typescript
import { useStore, useStoreObject } from '@/shared/hooks';

// Single value
const [theme, setTheme] = useStore('userTheme', 'light');

// Multiple values
const { values, set, setAll, isLoading } = useStoreObject('settings', {
  theme: 'light',
  language: 'en',
});
```

## Architecture

```
store.service.ts
├─ initializeStore()    # Global Store initialization
├─ getStore()           # Get initialized instance
├─ setStoreValue()      # Persist key-value
├─ getStoreValue()      # Load key-value
├─ hasStoreKey()        # Check key existence
├─ deleteStoreKey()     # Remove key
├─ clearStore()         # Clear all
├─ getStoreKeys()       # List all keys
└─ storeService object  # Facade with all methods

use-store.ts
├─ useStore<T>         # Hook for single value
└─ useStoreObject<T>   # Hook for object with properties
```

## Features

- **Encryption:** Automatic XChaCha20-Poly1305 encryption
- **Type-Safe:** Full TypeScript generic support
- **React Integration:** Hooks with auto-save and rollback
- **Error Handling:** Graceful error management in all operations
- **Testing:** Fully mocked for unit tests

## File Locations

| File | Purpose |
|------|---------|
| `store.service.ts` | Core service implementation |
| `use-store.ts` | React hooks |
| `__tests__/store.service.test.ts` | Service unit tests |
| `__tests__/use-store.test.ts` | Hook tests |
| `__tests__/store.integration.example.ts` | Usage examples |
| `/docs/development-guide/tauri-plugins.md` | Full documentation |

## Capabilities Configured

All necessary capabilities are configured in `src-tauri/capabilities/default.json`:

- `store:default` - Initialize store
- `store:allow-get` - Read values
- `store:allow-set` - Write values
- `store:allow-has` - Check key existence
- `store:allow-delete` - Remove keys
- `store:allow-clear` - Clear all
- `store:allow-keys` - List keys

## Testing

```bash
# Unit tests
pnpm --filter @bluelight-hub/frontend test

# Coverage
pnpm --filter @bluelight-hub/frontend test:coverage

# Watch mode
pnpm --filter @bluelight-hub/frontend test --watch
```

## Common Use Cases

1. **User Preferences** - Theme, language, layout settings
2. **Authentication** - Store tokens locally (with caution)
3. **Form State** - Auto-save multi-step forms
4. **Cache** - Application-level caching with TTL
5. **UI State** - Sidebar width, window position, etc.

## Security Considerations

- Data is encrypted by Tauri automatically
- Only readable by this application on this computer
- Not suitable for Multi-Device sync without additional auth
- Sensitive data should be additionally hashed (tokens in HttpOnly cookies preferred)

## Error Recovery

All hooks automatically rollback values if save fails:

```typescript
const [value, setValue] = useStore('key', 'default');

try {
  await setValue('new');  // If this fails,
                          // value reverts to previous state
} catch (error) {
  console.error('Save failed, value rolled back');
}
```

## Data Location

- **macOS:** `~/Library/Application Support/dev.rubeen.bluelight-hub/app-store.json`
- **Linux:** `~/.local/share/dev.rubeen.bluelight-hub/app-store.json`
- **Windows:** `%APPDATA%/bluelight-hub/app-store.json`

## Troubleshooting

### Store not persisting
- Check capabilities in `src-tauri/capabilities/default.json`
- Verify `@tauri-apps/plugin-store` is installed
- Clear app cache and rebuild

### Type errors with mocks in tests
- Use `as unknown as Record<string, unknown>` for mock casting
- Mock all Store methods: `get`, `set`, `has`, `delete`, `clear`, `keys`, `save`

### Encryption errors
- Store creates encryption key automatically on first use
- Key is managed by OS, cannot be manually set
- If corrupted, the store can be reset: delete the json file

## Next Steps

1. Use hooks in features for user preferences
2. Implement auth token persistence
3. Add cache layer for API responses
4. Auto-save form progress in complex wizards
5. Persist UI layout preferences
