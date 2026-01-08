# Tauri Plugins

Dokumentation der im Bluelight Hub integrierten Tauri Plugins.

## Überblick

Das Bluelight Hub Projekt nutzt verschiedene Tauri Plugins für native Desktop-Funktionalität:

- **@tauri-apps/plugin-store** - Verschlüsselte lokale Datenverwaltung
- **@tauri-apps/plugin-http** - HTTP-Requests mit nativen Fähigkeiten
- **@tauri-apps/plugin-shell** - Shell-Command Ausführung
- **@tauri-apps/plugin-barcode-scanner** - Barcode-Scanning (Hardware)

## Store Plugin v2.4.1

### Übersicht

Das Store Plugin bietet verschlüsselte lokale Persistierung für App-Daten (Settings, Cache, User Preferences).

**Dokumentation:** https://v2.tauri.app/plugin/store/

### Features

- Automatische Verschlüsselung der Datei
- Typ-sicher durch Generics
- Lazy-Loading und Auto-Save
- Error Handling
- Synchron und Async APIs

### Installation & Konfiguration

Das Plugin ist bereits installiert:

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/plugin-store": "^2.4.1"
  }
}
```

#### Capabilities konfigurieren

Die folgenden Capabilities sind in `src-tauri/capabilities/default.json` definiert:

```json
{
  "permissions": [
    "store:default",
    "store:allow-get",
    "store:allow-set",
    "store:allow-has",
    "store:allow-delete",
    "store:allow-clear",
    "store:allow-keys"
  ]
}
```

Diese Capabilities freischalten folgende Operationen:

| Permission        | Operation          | Beschreibung                           |
|-------------------|-------------------|----------------------------------------|
| `store:default`   | Initialization    | Store initialisieren                   |
| `store:allow-get` | Get               | Wert abrufen                          |
| `store:allow-set` | Set               | Wert speichern                        |
| `store:allow-has` | Has               | Prüfe Schlüssel-Existenz              |
| `store:allow-delete` | Delete         | Schlüssel löschen                     |
| `store:allow-clear` | Clear          | Alle Schlüssel löschen                |
| `store:allow-keys` | Keys            | Alle Schlüssel auflisten              |

### Service API

**Datei:** `src/shared/lib/store.service.ts`

```typescript
import { storeService } from '@/shared/lib/store.service';

// Initialize (auto-called on first use)
await storeService.initialize('app-store.json');

// Set value
await storeService.set('userPreferences', { theme: 'dark' });

// Get value
const prefs = await storeService.get('userPreferences', { theme: 'light' });

// Check key exists
const exists = await storeService.has('userPreferences');

// Delete key
await storeService.delete('userPreferences');

// Get all keys
const allKeys = await storeService.keys();

// Clear store
await storeService.clear();
```

### React Hook Integration

**Datei:** `src/shared/hooks/use-store.ts`

#### useStore Hook

Für einfache Key-Value Speicherung:

```typescript
import { useStore } from '@/shared/hooks/use-store';

export function UserPreferences() {
  // Auto-persisting hook für einzelnen Wert
  const [theme, setTheme, deleteTheme, isLoading] = useStore(
    'userTheme',
    'light' // default value
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button onClick={() => deleteTheme()}>
        Reset to Default
      </button>
    </div>
  );
}
```

#### useStoreObject Hook

Für komplexe Einstellungen mit mehreren Properties:

```typescript
import { useStoreObject } from '@/shared/hooks/use-store';

interface AppSettings {
  theme: string;
  language: string;
  sidebarCollapsed: boolean;
  autoSave: boolean;
}

export function SettingsPanel() {
  const { values, set, setAll, isLoading } = useStoreObject<AppSettings>(
    'appSettings',
    {
      theme: 'light',
      language: 'en',
      sidebarCollapsed: false,
      autoSave: true,
    }
  );

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div>
      <select
        value={values.theme}
        onChange={(e) => set('theme', e.target.value)}
      >
        <option>light</option>
        <option>dark</option>
      </select>

      <button
        onClick={() =>
          setAll({
            theme: 'dark',
            language: 'de',
            autoSave: false,
          })
        }
      >
        Apply Dark Mode Settings
      </button>
    </div>
  );
}
```

### Encryption

Das Store Plugin verschlüsselt Daten automatisch mit dem `TweetNaCl` Crypto-System:

- Datei: `app-store.json` (im App-Datenverzeichnis)
- Verschlüsselung: XChaCha20-Poly1305
- Key Management: Automatisch vom Betriebssystem
- Lesbar nur von der Anwendung auf diesem Computer

**Sicherheitshinweise:**
- Die Verschlüsselung bietet Schutz gegen lokales Ausspähen
- Sensitive Daten (Tokens, Passwords) sollten zusätzlich gehashed werden
- Nicht geeignet für Multi-Device Sync ohne zusätzliche Authentifizierung

### Error Handling

Alle Store-Funktionen haben Error Handling:

```typescript
import { useStore } from '@/shared/hooks/use-store';

export function Component() {
  const [value, setValue] = useStore('key');

  const handleSave = async () => {
    try {
      await setValue('newValue');
    } catch (error) {
      console.error('Failed to save:', error);
      // Wert wird automatisch zurückgerollt bei Fehler
      // Benutzer sieht letzten bekannten Zustand
    }
  };
}
```

Die Hooks rollen Werte automatisch zurück wenn das Speichern fehlschlägt.

### Testing

Store-Funktionen sind vollständig getestet:

```bash
# Tests ausführen
pnpm --filter @bluelight-hub/frontend test

# Mit Coverage
pnpm --filter @bluelight-hub/frontend test:coverage
```

**Test-Dateien:**
- `src/shared/lib/__tests__/store.service.test.ts` - Service Tests
- `src/shared/hooks/__tests__/use-store.test.ts` - Hook Tests

### Beispiel: User Authentifizierung

```typescript
import { useStore } from '@/shared/hooks/use-store';

export function useAuthState() {
  const [authToken, setAuthToken] = useStore<string | undefined>(
    'authToken'
  );
  const [refreshToken, setRefreshToken] = useStore<string | undefined>(
    'refreshToken'
  );

  return {
    isAuthenticated: !!authToken,
    authToken,
    setAuthToken,
    setRefreshToken,
    logout: async () => {
      await setAuthToken(undefined);
      await setRefreshToken(undefined);
    },
  };
}
```

### Datenspeicher-Pfad

Der Store wird im Tauri App-Datenverzeichnis gespeichert:

- **macOS:** `~/Library/Application Support/dev.rubeen.bluelight-hub/app-store.json`
- **Linux:** `~/.local/share/dev.rubeen.bluelight-hub/app-store.json`
- **Windows:** `%APPDATA%/bluelight-hub/app-store.json`

## Andere Plugins

### HTTP Plugin v2.5.4

Für erweiterte HTTP-Requests mit nativen Cookies und Certificate Pinning.

**Verwendung:** Backend-Kommunikation (primär durch generierter API-Client)

### Shell Plugin v2.3.3

Für Ausführung von System-Commands (Notfall-Tools, System-Integration).

### Barcode Scanner v2.4.2

Für Hardware-Barcode-Scanner-Integration in der ETB-App.

## Best Practices

1. **Initialisierung:** Store wird auto-initialisiert bei erstem Zugriff
2. **Error Handling:** Immer Promises mit try-catch handhaben
3. **Performance:** Hooks laden Werte lazy - kein Race Condition
4. **Testing:** Alle Services sind mockbar für Tests
5. **Sicherheit:** Keine Plaintext-Secrets speichern (Token sollten HttpOnly Cookies sein)

## Troubleshooting

### Store lädt nicht

```typescript
// Debug-Ausgabe aktivieren
const store = await storeService.initialize();
console.log('Store ready:', store);
```

### Permissions Error

Stelle sicher, dass Capabilities in `src-tauri/capabilities/default.json` definiert sind:

```bash
# Build neu
pnpm --filter @bluelight-hub/frontend build
```

### Encryption-Fehler

Der Store erstellt automatisch einen Encryption-Key beim ersten Start. Falls der Key verloren geht:

```typescript
// Alter Store migrieren
const oldStore = new Store('old-store.json');
const newStore = new Store('app-store.json');

const keys = await oldStore.keys();
for (const key of keys) {
  const value = await oldStore.get(key);
  await newStore.set(key, value);
}
await newStore.save();
```

## Weiterführende Dokumentation

- [Tauri Store v2 Docs](https://v2.tauri.app/plugin/store/)
- [Tauri Security Best Practices](https://v2.tauri.app/references/security/)
- [App-Datenverzeichnisse](https://v2.tauri.app/api/js/path/)
