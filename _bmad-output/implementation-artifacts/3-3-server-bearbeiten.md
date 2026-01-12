# Story 3.3: Server bearbeiten

Status: review

## Story

Als **Nutzer mit konfigurierten Servern**,
möchte ich **die Details eines Servers (Name, URL) nachträglich ändern können**,
damit **ich Tippfehler korrigieren oder Server umbenennen kann ohne ihn neu anlegen zu müssen**.

## Acceptance Criteria

### AC1: Edit-Formular öffnen

**Given** der Nutzer ist auf der Server-Verwaltungsseite (`/server/manage`)
**When** der Nutzer auf das Edit-Icon eines Server-Eintrags klickt
**Then** öffnet sich ein Edit-Formular mit den aktuellen Server-Daten
**And** Name und URL sind editierbar
**And** der Access-Token ist nicht sichtbar (nur Hinweis "Token gespeichert")

### AC2: Name ändern

**Given** das Edit-Formular ist geöffnet
**When** der Nutzer den Server-Namen ändert und speichert
**Then** wird der neue Name in der Server-Liste angezeigt
**And** ein Toast bestätigt "Server aktualisiert"
**And** das Formular schließt sich

### AC3: URL-Validierung

**Given** das Edit-Formular ist geöffnet
**When** der Nutzer die Server-URL ändert
**Then** validiert das System die URL auf gültiges Format (HTTPS oder localhost)
**And** bei ungültigem Format erscheint Inline-Fehlermeldung

### AC4: Token bleibt erhalten

**Given** der Nutzer ändert die URL eines Servers
**When** die Änderung gespeichert wird
**Then** wird der Access-Token beibehalten
**And** ein optionaler Connection-Test kann ausgeführt werden

### AC5: Abbrechen ohne Speichern

**Given** das Edit-Formular ist geöffnet
**When** der Nutzer auf "Abbrechen" klickt
**Then** werden keine Änderungen gespeichert
**And** das Formular schließt sich ohne Bestätigung

### AC6: Aktiven Server bearbeiten

**Given** der Server gerade der aktive Server ist
**When** der Nutzer ihn bearbeitet
**Then** ist eine Bearbeitung trotzdem möglich
**And** Änderungen werden sofort im Header reflektiert

## Tasks / Subtasks

- [x] **Task 1: `updateServer` Action im Store implementieren** (AC: 2, 3, 4)
  - [x] 1.1 Erstelle `updateServer(serverId: string, updates: Partial<ServerConfig>)` in `server.store.ts`
  - [x] 1.2 Implementiere Duplikat-Check mit Ausnahme für aktuellen Server (`excludeServerId`)
  - [x] 1.3 Erweitere `isServerNameTaken(name, excludeServerId?)` um optionalen Parameter
  - [x] 1.4 URL-Validierung mit `validateUrl()` (bereits vorhanden)
  - [x] 1.5 Immutable Update Pattern analog zu `setActiveServer()`
  - [x] 1.6 Token bleibt erhalten wenn nicht explizit überschrieben
  - [x] 1.7 Schreibe Unit-Tests für `updateServer` (15 Tests)

- [x] **Task 2: `ServerEditForm` Organism erstellen** (AC: 1, 2, 3, 5)
  - [x] 2.1 Erstelle `features/server/ui/organisms/ServerEditForm.tsx`
  - [x] 2.2 Props: `server: ServerConfig`, `onSuccess?: () => void`, `onCancel?: () => void`
  - [x] 2.3 TanStack Form mit Zod-Validierung (serverUrlSchema, serverNameSchema)
  - [x] 2.4 Pre-fill alle Felder mit bestehenden Server-Daten
  - [x] 2.5 Token-Hinweis: "Token gespeichert" (nicht editierbar, nicht sichtbar)
  - [x] 2.6 "Verbindung testen" Button (optional, nutzt `useHealthCheck`)
  - [x] 2.7 "Speichern" und "Abbrechen" Buttons
  - [x] 2.8 Loading-State während Update
  - [x] 2.9 Toast bei erfolgreichem Update: "Server aktualisiert"
  - [x] 2.10 Schreibe Unit-Tests für ServerEditForm (20 Tests)

- [x] **Task 3: Edit-Seite/Modal implementieren** (AC: 1, 5)
  - [x] 3.1 **Option A: Inline Edit in ServerListItem** (GEWÄHLT)
        - Headless UI Dialog für Modal in ServerManagementPage
  - [x] 3.2 ~~Option B: Separate Edit-Route~~ (NICHT GEWÄHLT)
  - [x] 3.3 Entscheidung: Modal in ServerManagementPage (bessere UX)
  - [x] 3.4 Schreibe Integration-Tests (12 Tests)

- [x] **Task 4: ServerManagementPage Integration** (AC: 1, 6)
  - [x] 4.1 Implementiere `handleEditServer(serverId)` in `ServerManagementPage.tsx`
  - [x] 4.2 State für Edit-Modal: `editingServerId: string | null`
  - [x] 4.3 Modal öffnen wenn Edit-Button geklickt
  - [x] 4.4 Modal schließen nach Success oder Cancel
  - [x] 4.5 Schreibe Integration-Tests (12 Tests)

- [x] **Task 5: `useServerById` Hook erstellen** (AC: 1)
  - [x] 5.1 Erstelle `features/server/hooks/use-server-by-id.ts`
  - [x] 5.2 Selector Pattern: `state.servers.find(s => s.id === id)`
  - [x] 5.3 Returns `ServerConfig | null`
  - [x] 5.4 Schreibe Unit-Tests (4 Tests)

- [x] **Task 6: E2E Tests mit Chrome MCP** (AC: 1-6)
  - [x] 6.1 Test: Edit-Button öffnet Modal ✅
  - [x] 6.2 Test: Name ändern + speichern → Server-Liste aktualisiert ✅
  - [x] 6.3 Test: URL ändern → Validierung + speichern ✅
  - [x] 6.4 Test: Abbrechen schließt Modal ohne Änderungen ✅
  - [x] 6.5 Test: Aktiver Server bearbeiten funktioniert ✅

## Dev Notes

### Architektur-Patterns (MUST FOLLOW)

**KRITISCH: Bestehende Patterns wiederverwenden!**

Die Story 2.6 hat `ServerSetupForm` mit umfangreichen Patterns erstellt. Diese Story adaptiert das Pattern für Edit.

```typescript
// ✅ RICHTIG: Bestehende Patterns und Validierungen nutzen
import { serverUrlSchema, serverNameSchema } from '../../schemas/url-params.schema';
import { isServerNameTaken, updateServer } from '../../stores/server.store';
import { useHealthCheck } from '../../api/use-health-check';

// ❌ FALSCH: Neue Validierungslogik erfinden
```

### Neue Store Action: `updateServer`

```typescript
// packages/frontend/src/features/server/stores/server.store.ts

/**
 * Aktualisiert einen existierenden Server.
 *
 * Validiert Name-Eindeutigkeit (mit Ausnahme für aktuellen Server)
 * und URL-Format. Token bleibt erhalten wenn nicht überschrieben.
 *
 * @param serverId - ID des zu aktualisierenden Servers
 * @param updates - Partielle Server-Config (name, url, accessToken optional)
 * @throws Error wenn Server nicht existiert
 * @throws Error wenn Name bereits vergeben (außer eigener Name)
 * @throws Error wenn URL ungültig
 */
export async function updateServer(
  serverId: string,
  updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>
): Promise<void> {
  const state = serverStore.state;
  const server = state.servers.find((s) => s.id === serverId);

  if (!server) {
    throw new Error(`Server with id "${serverId}" does not exist`);
  }

  // Name-Validierung mit Ausnahme für aktuellen Server
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      throw new Error('Server name must be at least 1 character long');
    }
    if (isServerNameTaken(trimmedName, serverId)) {
      throw new Error(`Ein Server mit dem Namen "${trimmedName}" existiert bereits`);
    }
  }

  // URL-Validierung wenn geändert
  if (updates.url !== undefined && !validateUrl(updates.url)) {
    throw new Error('Invalid server URL: must be HTTPS or localhost for development');
  }

  // Immutable Update
  const updatedServers = state.servers.map((s) =>
    s.id === serverId ? { ...s, ...updates } : s
  );

  serverStore.setState((state) => ({
    ...state,
    servers: updatedServers,
  }));

  // Storage Sync
  await saveServers(serverStore.state.servers);
}

/**
 * Erweiterte Version von isServerNameTaken mit Ausnahme-Parameter.
 *
 * @param name - Der zu prüfende Server-Name
 * @param excludeServerId - Optional: Server-ID die vom Check ausgenommen wird (für Edit)
 * @returns true wenn Name bereits existiert (außer beim excluded Server)
 */
export function isServerNameTaken(name: string, excludeServerId?: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  return serverStore.state.servers.some(
    (s) => s.name.toLowerCase() === normalizedName && s.id !== excludeServerId
  );
}
```

### ServerEditForm Struktur

```typescript
// packages/frontend/src/features/server/ui/organisms/ServerEditForm.tsx

interface ServerEditFormProps {
  /** Server der bearbeitet werden soll */
  server: ServerConfig;
  /** Callback nach erfolgreichem Update */
  onSuccess?: () => void;
  /** Callback bei Abbrechen */
  onCancel?: () => void;
  /** CSS className */
  className?: string;
}

export function ServerEditForm({ server, onSuccess, onCancel, className }: ServerEditFormProps) {
  const healthCheck = useHealthCheck();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      serverName: server.name,
      serverUrl: server.url,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        await updateServer(server.id, {
          name: value.serverName,
          url: value.serverUrl,
        });
        toast.success('Server aktualisiert');
        onSuccess?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Aktualisieren', { description: message });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      {/* Server Name Field */}
      <form.Field name="serverName" validators={{...}}>
        {(field) => <Input ... />}
      </form.Field>

      {/* Server URL Field */}
      <form.Field name="serverUrl" validators={{...}}>
        {(field) => <Input ... />}
      </form.Field>

      {/* Token-Hinweis (nicht editierbar) */}
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-sm text-gray-600">
          <PiKey className="inline mr-2" />
          Access-Token gespeichert
        </p>
      </div>

      {/* Optional: Verbindung testen */}
      <Button type="button" onClick={() => healthCheck.mutate({ serverUrl: form.getFieldValue('serverUrl') })}>
        Verbindung testen
      </Button>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" appearance="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Speichern
        </Button>
      </div>
    </form>
  );
}
```

### Modal-Pattern (Option A - Bevorzugt)

```typescript
// In ServerManagementPage.tsx

import { Dialog, DialogTitle, DialogPanel } from '@headlessui/react';

export function ServerManagementPage() {
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const servers = useServerList();

  const editingServer = servers.find(s => s.id === editingServerId);

  const handleEditServer = (serverId: string) => {
    setEditingServerId(serverId);
  };

  const handleEditSuccess = () => {
    setEditingServerId(null);
    toast.success('Server aktualisiert');
  };

  const handleEditCancel = () => {
    setEditingServerId(null);
  };

  return (
    <>
      <ServerList
        onEditServer={handleEditServer}
        onDeleteServer={handleDeleteServer}
        ...
      />

      {/* Edit Modal */}
      <Dialog open={!!editingServerId} onClose={handleEditCancel}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
            <DialogTitle className="text-lg font-semibold mb-4">
              Server bearbeiten
            </DialogTitle>

            {editingServer && (
              <ServerEditForm
                server={editingServer}
                onSuccess={handleEditSuccess}
                onCancel={handleEditCancel}
              />
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
```

### useServerById Hook

```typescript
// packages/frontend/src/features/server/hooks/use-server-by-id.ts

import { useStore } from '@tanstack/react-store';
import { serverStore } from '../stores/server.store';
import type { ServerConfig } from '../types/server-config';

/**
 * Hook für einzelnen Server anhand ID.
 *
 * Optimiert durch Selector-Pattern - nur Re-Render wenn
 * sich der spezifische Server ändert.
 *
 * @param serverId - ID des gesuchten Servers
 * @returns ServerConfig oder null wenn nicht gefunden
 */
export function useServerById(serverId: string | null): ServerConfig | null {
  return useStore(serverStore, (state) =>
    serverId ? state.servers.find((s) => s.id === serverId) ?? null : null
  );
}
```

### Learnings aus Story 3.2 (WICHTIG!)

**Code Review Issues (7 Issues gefixed):**
1. ✅ Single-Server UX Dead End → Dropdown IMMER anzeigen
2. ✅ Memory Leak in Event Listeners → `mounted` Flag
3. ✅ Keyboard Navigation → `onKeyDown` Handler
4. ✅ Menu Positioning → Viewport Boundary Check
5. ✅ Loading-State → `isSwitching` State für Race Conditions
6. ✅ DRY → `getHostSafe()` in shared Utility
7. ✅ ARIA Labels → `aria-label`, `aria-haspopup`, `aria-expanded`

**Diese Patterns anwenden auf ServerEditForm:**
- ARIA Labels für alle interaktiven Elemente
- Loading-State während Submit
- Error-State mit Toast

### Test-Patterns

```typescript
// Unit Test Pattern für updateServer
describe('updateServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    serverStore.setState({
      servers: [
        { id: '1', name: 'Server 1', url: 'https://s1.com', ...},
        { id: '2', name: 'Server 2', url: 'https://s2.com', ...},
      ],
      activeServerId: '1',
      connectionStatus: new Map(),
      isHydrated: true,
    });
  });

  it('should update server name', async () => {
    // Given
    const serverId = '1';
    const newName = 'Neuer Name';

    // When
    await updateServer(serverId, { name: newName });

    // Then
    const server = serverStore.state.servers.find(s => s.id === serverId);
    expect(server?.name).toBe(newName);
  });

  it('should allow same name for same server', async () => {
    // Given - Server 1 hat Name "Server 1"
    const serverId = '1';

    // When - Gleicher Name wie vorher
    await updateServer(serverId, { name: 'Server 1' });

    // Then - Kein Fehler
    expect(serverStore.state.servers.find(s => s.id === serverId)?.name).toBe('Server 1');
  });

  it('should throw error for duplicate name from other server', async () => {
    // Given - Server 2 hat Name "Server 2"
    const serverId = '1';

    // When/Then - Name von Server 2 verwenden
    await expect(updateServer(serverId, { name: 'Server 2' }))
      .rejects.toThrow('existiert bereits');
  });

  it('should preserve token when not provided', async () => {
    // Given
    serverStore.setState(prev => ({
      ...prev,
      servers: prev.servers.map(s =>
        s.id === '1' ? { ...s, accessToken: 'secret-token' } : s
      ),
    }));

    // When - Nur Name ändern
    await updateServer('1', { name: 'Neuer Name' });

    // Then - Token bleibt erhalten
    const server = serverStore.state.servers.find(s => s.id === '1');
    expect(server?.accessToken).toBe('secret-token');
  });
});

// Integration Test für ServerEditForm
describe('ServerEditForm', () => {
  it('should pre-fill form with server data', () => {
    // Given
    const server = { id: '1', name: 'Test', url: 'https://test.com', ... };

    // When
    render(<ServerEditForm server={server} />);

    // Then
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://test.com')).toBeInTheDocument();
  });

  it('should show token hint without actual token', () => {
    // Given
    const server = { id: '1', name: 'Test', url: 'https://test.com', accessToken: 'secret' };

    // When
    render(<ServerEditForm server={server} />);

    // Then
    expect(screen.getByText(/Token gespeichert/i)).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('should call onSuccess after successful update', async () => {
    // Given
    const onSuccess = vi.fn();
    const server = { id: '1', name: 'Test', url: 'https://test.com' };

    // When
    render(<ServerEditForm server={server} onSuccess={onSuccess} />);
    await userEvent.clear(screen.getByLabelText(/Server-Name/i));
    await userEvent.type(screen.getByLabelText(/Server-Name/i), 'Neuer Name');
    await userEvent.click(screen.getByRole('button', { name: /Speichern/i }));

    // Then
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should call onCancel when clicking Abbrechen', async () => {
    // Given
    const onCancel = vi.fn();
    const server = { id: '1', name: 'Test', url: 'https://test.com' };

    // When
    render(<ServerEditForm server={server} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /Abbrechen/i }));

    // Then
    expect(onCancel).toHaveBeenCalled();
  });
});
```

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-P2 | UI Reaktion < 50ms | TanStack Store (in-memory), kein async Load |
| NFR-U2 | Max 3 Klicks | Edit Icon → Form → Speichern = 3 Klicks ✓ |
| NFR-U3 | Deutsche UI-Texte | Alle Labels, Buttons, Toasts in Deutsch |
| NFR-R2 | Fehlerfeedback < 2s | Inline Error + Toast sofort nach Validierung |

### Project Structure Notes

**Neue Dateien zu erstellen:**
```
packages/frontend/src/features/server/
├── ui/
│   └── organisms/
│       ├── ServerEditForm.tsx           # NEU: Edit-Formular
│       └── __tests__/
│           └── ServerEditForm.test.tsx  # NEU: Tests
└── hooks/
    ├── use-server-by-id.ts              # NEU: Hook für einzelnen Server
    └── __tests__/
        └── use-server-by-id.test.ts     # NEU: Tests
```

**Zu modifizierende Dateien:**
```
packages/frontend/src/features/server/
├── stores/
│   └── server.store.ts                  # MODIFY: updateServer() + isServerNameTaken(name, excludeServerId?)
├── ui/
│   ├── organisms/
│   │   ├── index.ts                     # MODIFY: Export ServerEditForm
│   │   └── ServerList.tsx               # MODIFY: Falls Modal hier integriert
│   └── pages/
│       └── ServerManagementPage.tsx     # MODIFY: Edit-Modal Integration
└── hooks/
    └── index.ts                         # MODIFY: Export useServerById
```

### Git Commit Flow

**Empfohlene Commit-Reihenfolge:**
1. `✨(server): Add updateServer action and extend isServerNameTaken`
2. `✨(server): Add useServerById hook for single server access`
3. `✨(server): Add ServerEditForm organism`
4. `✨(server): Integrate edit modal in ServerManagementPage`
5. `🧪(server): Add comprehensive tests for server edit feature`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/implementation-artifacts/3-2-server-dropdown-auf-login-screen.md]
- [Source: packages/frontend/src/features/server/stores/server.store.ts]
- [Source: packages/frontend/src/features/server/ui/organisms/ServerSetupForm.tsx]
- [Source: packages/frontend/src/features/server/ui/pages/ServerManagementPage.tsx]
- [Source: CLAUDE.md#Frontend-Patterns]

### PRD Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| FR4: Server-Details bearbeiten | Story-Scope | ServerEditForm + updateServer |
| FR4.1: Name ändern | AC2 | Form Field + Store Update |
| FR4.2: URL ändern | AC3 | Form Field + Validierung |
| FR4.3: Token erhalten | AC4 | Partielle Updates, Token nicht überschreiben |
| NFR-U2: Max 3 Klicks | ✓ | Edit Icon → Form → Speichern |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

Keine Debug-Logs erforderlich.

### Completion Notes List

1. **Task 1 - updateServer Action**: Implementiert mit Duplikat-Check, URL-Validierung, Token-Erhaltung. 15 Unit-Tests bestanden.
2. **Task 2 - ServerEditForm**: TanStack Form mit Zod-Validierung, Token-Hinweis, Connection-Test, Loading-State. 20 Unit-Tests bestanden.
3. **Task 3 - Edit-Modal**: Headless UI Dialog in ServerManagementPage integriert (Option A: Modal statt separater Route).
4. **Task 4 - ServerManagementPage Integration**: State-Management für editingServerId, Modal öffnen/schließen. 12 Unit-Tests bestanden.
5. **Task 5 - useServerById Hook**: Selector-Pattern mit @tanstack/react-store. 4 Unit-Tests bestanden.
6. **Task 6 - E2E Tests**: Alle 5 Tests mit Chrome MCP bestanden:
   - ✅ Test 6.1: Edit-Button öffnet Modal
   - ✅ Test 6.2: Name ändern + speichern → Server-Liste aktualisiert
   - ✅ Test 6.3: URL ändern → Validierung + speichern
   - ✅ Test 6.4: Abbrechen schließt Modal ohne Änderungen
   - ✅ Test 6.5: Aktiver Server bearbeiten funktioniert

### File List

**Neue Dateien:**
- `packages/frontend/src/features/server/ui/organisms/ServerEditForm.tsx`
- `packages/frontend/src/features/server/ui/organisms/__tests__/ServerEditForm.test.tsx`
- `packages/frontend/src/features/server/hooks/use-server-by-id.ts`
- `packages/frontend/src/features/server/hooks/__tests__/use-server-by-id.test.ts`

**Modifizierte Dateien:**
- `packages/frontend/src/features/server/stores/server.store.ts` (updateServer, isServerNameTaken mit excludeServerId)
- `packages/frontend/src/features/server/stores/__tests__/server.store.test.ts` (15 neue Tests)
- `packages/frontend/src/features/server/ui/organisms/index.ts` (Export ServerEditForm)
- `packages/frontend/src/features/server/ui/pages/ServerManagementPage.tsx` (Edit-Modal Integration)
- `packages/frontend/src/features/server/ui/pages/__tests__/ServerManagementPage.test.tsx` (aktualisierte Tests)
- `packages/frontend/src/features/server/hooks/index.ts` (Export useServerById)
