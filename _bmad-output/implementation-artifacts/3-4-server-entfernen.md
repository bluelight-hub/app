# Story 3.4: Server entfernen

Status: done

## Story

Als **Nutzer mit mehreren konfigurierten Servern**,
möchte ich **einen Server aus meiner Liste entfernen können**,
damit **ich nicht mehr benötigte Server-Einträge aufräumen kann und meine Liste übersichtlich bleibt**.

## Acceptance Criteria

### AC1: Löschen mit Bestätigung

**Given** der Nutzer ist auf der Server-Verwaltungsseite (`/server/manage`)
**When** der Nutzer auf das Delete-Icon eines Server-Eintrags klickt
**Then** erscheint ein Bestätigungs-Dialog
**And** der Dialog zeigt den Server-Namen zur Bestätigung

### AC2: Löschung bestätigen

**Given** der Bestätigungs-Dialog ist geöffnet
**When** der Nutzer auf "Entfernen" klickt
**Then** wird der Server aus der lokalen Liste gelöscht
**And** der zugehörige Access-Token wird gelöscht
**And** ein Toast bestätigt "Server 'XYZ' entfernt"
**And** der Dialog schließt sich

### AC3: Löschung abbrechen

**Given** der Bestätigungs-Dialog ist geöffnet
**When** der Nutzer auf "Abbrechen" klickt oder Escape drückt
**Then** wird der Server nicht gelöscht
**And** der Dialog schließt sich

### AC4: Letzten Server löschen

**Given** der Nutzer versucht den einzigen konfigurierten Server zu löschen
**When** die Löschung bestätigt wird
**Then** wird der Server gelöscht
**And** der Nutzer wird zum Server-Setup weitergeleitet (`/server/setup`)
**And** ein Toast erscheint "Du brauchst mindestens einen Server"

### AC5: Default-Server löschen

**Given** der zu löschende Server ist der zuletzt verwendete (aktive)
**When** er gelöscht wird
**Then** wird der nächste Server in der Liste als Default markiert

### AC6: Eingeloggten Server löschen

**Given** der Nutzer ist beim zu löschenden Server eingeloggt
**When** er den Server löscht
**Then** wird er automatisch ausgeloggt (Auth-State cleared)
**And** der Server wird aus der Liste entfernt
**And** er landet auf dem Login-Screen (`/auth`) oder Setup (`/server/setup` falls letzter Server)

## Tasks / Subtasks

- [x] **Task 1: Delete-Confirmation-Dialog Komponente erstellen** (AC: 1, 2, 3)
  - [x] 1.1 Erstelle `features/server/ui/molecules/ServerDeleteConfirmDialog.tsx`
  - [x] 1.2 Props: `server: ServerConfig | null`, `open: boolean`, `onConfirm: () => void`, `onCancel: () => void`
  - [x] 1.3 Headless UI Dialog (analog zu Edit-Modal Pattern aus Story 3.3)
  - [x] 1.4 Danger-Styling: Rotes Icon (PiTrash), roter "Entfernen"-Button
  - [x] 1.5 Dialog-Text: "Möchtest du den Server '{serverName}' wirklich entfernen?"
  - [x] 1.6 Hinweis-Text: "Diese Aktion kann nicht rückgängig gemacht werden."
  - [x] 1.7 Buttons: "Abbrechen" (secondary) + "Entfernen" (danger, rechts)
  - [x] 1.8 Escape-Key schließt Dialog (via Headless UI `onClose`)
  - [x] 1.9 ARIA Labels für Accessibility
  - [x] 1.10 Schreibe Unit-Tests für ServerDeleteConfirmDialog (20 Tests)

- [x] **Task 2: `handleDeleteServer` in ServerManagementPage implementieren** (AC: 2, 4, 5, 6)
  - [x] 2.1 State für Delete-Modal: `deletingServerId: string | null`
  - [x] 2.2 `useServerById(deletingServerId)` für Server-Daten
  - [x] 2.3 `handleDeleteClick(serverId)`: Öffnet Modal (setzt deletingServerId)
  - [x] 2.4 `handleDeleteConfirm()`: Führt Löschung aus
  - [x] 2.5 Rufe `removeServer(serverId)` aus Store auf
  - [x] 2.6 Toast: `toast.success(\`Server '${serverName}' entfernt\`)`
  - [x] 2.7 Check: War das der letzte Server? (`servers.length === 0` nach Delete)
  - [x] 2.8 Bei letztem Server: `navigate({ to: '/server/setup' })` + Info-Toast
  - [x] 2.9 Cleanup: `setDeletingServerId(null)` nach Abschluss
  - [x] 2.10 Auto-Close Effect (analog zu Edit-Modal C5 Fix)

- [x] **Task 3: Auth-State Handling bei aktivem Server** (AC: 6)
  - [x] 3.1 Check: Ist der zu löschende Server der aktive Server?
  - [x] 3.2 Wenn ja: Auth-State clearen (via removeServer Store-Action Token-Sync)
  - [x] 3.3 Navigate zu `/auth` wenn noch Server übrig, sonst `/server/setup`
  - [x] 3.4 Race-Condition Protection mit auto-close Effect

- [x] **Task 4: Loading-State und Error-Handling** (AC: 2)
  - [x] 4.1 `isDeleting` State für Button-Loading
  - [x] 4.2 Disable Buttons während Deletion
  - [x] 4.3 Error-Handling mit try/catch und Toast
  - [x] 4.4 Ensure Dialog closes auch bei Error

- [x] **Task 5: Unit-Tests für ServerManagementPage Delete-Flow** (AC: 1-6)
  - [x] 5.1 Test: Delete-Button öffnet Confirm-Dialog
  - [x] 5.2 Test: Confirm löscht Server und zeigt Toast
  - [x] 5.3 Test: Cancel schließt Dialog ohne Löschung
  - [x] 5.4 Test: Letzter Server → Redirect zu /server/setup
  - [x] 5.5 Test: Aktiver Server → Auth-State wird geclearet
  - [x] 5.6 Test: Loading-State während Deletion
  - [x] 5.7 Schreibe 12 Tests (12 neue Delete-Flow Tests hinzugefügt)

- [x] **Task 6: E2E Tests mit Chrome MCP** (AC: 1-6)
  - [x] 6.1 Test: Delete-Icon öffnet Bestätigungs-Dialog
  - [x] 6.2 Test: Bestätigen → Server aus Liste entfernt + Toast
  - [x] 6.3 Test: Abbrechen → Dialog schließt, Server bleibt
  - [x] 6.4 Test: Escape → Dialog schließt, Server bleibt
  - [x] 6.5 Test: Letzter Server → Redirect zu Setup-Page
  - [x] 6.6 Test: Aktiver Server löschen → Logout + Redirect

## Dev Notes

### Architektur-Patterns (MUST FOLLOW)

**KRITISCH: Bestehende Patterns aus Story 3.3 wiederverwenden!**

Das Edit-Modal Pattern ist bereits in `ServerManagementPage.tsx` etabliert. Diese Story fügt ein analoges Delete-Confirmation-Modal hinzu.

```typescript
// ✅ RICHTIG: Etabliertes Pattern aus Story 3.3 adaptieren
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useServerById } from '../../hooks/use-server-by-id';
import { removeServer } from '../../stores/server.store';

// ❌ FALSCH: Andere Modal-Library oder custom Dialog
```

### Store Action: `removeServer` ist BEREITS implementiert!

```typescript
// packages/frontend/src/features/server/stores/server.store.ts (Zeile 248-288)

/**
 * Entfernt einen Server aus der Konfiguration.
 *
 * Auto-Fallback: Wenn aktiver Server gelöscht wird, wird der erste
 * verfügbare Server aktiv gesetzt (oder null bei 0 Servern).
 * Token-Synchronisation erfolgt automatisch.
 *
 * @param serverId - ID des zu löschenden Servers
 */
export async function removeServer(serverId: string): Promise<void> {
  // ... bereits vollständig implementiert
}
```

**Wichtig:** Die Store-Action handled bereits:
- ✅ Server aus Liste entfernen
- ✅ Auto-Fallback wenn aktiver Server gelöscht (AC5)
- ✅ Token-Synchronisation (AC2: Token wird automatisch geclearet)
- ✅ Storage Sync

### ServerDeleteConfirmDialog Struktur

```typescript
// packages/frontend/src/features/server/ui/molecules/ServerDeleteConfirmDialog.tsx

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { PiTrash, PiWarning } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/Button';
import type { ServerConfig } from '../../types/server-config';

interface ServerDeleteConfirmDialogProps {
  /** Server der gelöscht werden soll (null wenn Dialog geschlossen) */
  server: ServerConfig | null;
  /** Ob der Dialog geöffnet ist */
  open: boolean;
  /** Callback wenn Löschung bestätigt wird */
  onConfirm: () => void;
  /** Callback wenn Löschung abgebrochen wird */
  onCancel: () => void;
  /** Loading-State während Löschung */
  isLoading?: boolean;
}

export function ServerDeleteConfirmDialog({
  server,
  open,
  onConfirm,
  onCancel,
  isLoading = false,
}: ServerDeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      className="relative z-50"
      data-testid="delete-server-dialog"
      aria-label={server ? `Server "${server.name}" entfernen` : 'Server entfernen'}
    >
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity data-[closed]:opacity-0"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="mx-auto w-full max-w-sm transform rounded-xl bg-white p-6 shadow-xl transition-all data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-800"
        >
          {/* Warning Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <PiTrash className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>

          {/* Title */}
          <DialogTitle className="mt-4 text-center font-semibold text-lg text-gray-900 dark:text-white">
            Server entfernen
          </DialogTitle>

          {/* Description */}
          <Description className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Möchtest du den Server <span className="font-medium">"{server?.name}"</span> wirklich entfernen?
          </Description>

          {/* Warning */}
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-500">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              appearance="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              intent="danger"
              onClick={onConfirm}
              loading={isLoading}
              className="flex-1"
            >
              Entfernen
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### ServerManagementPage Integration

```typescript
// In ServerManagementPage.tsx - zu ergänzen

import { ServerDeleteConfirmDialog } from '../molecules/ServerDeleteConfirmDialog';
import { removeServer } from '../../stores/server.store';
import { useServerList } from '../../hooks';
import { toast } from 'sonner';

export function ServerManagementPage() {
  const navigate = useNavigate();
  const servers = useServerList();

  // State für Edit-Modal (Story 3.3) - EXISTING
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const editingServer = useServerById(editingServerId);

  // State für Delete-Modal (Story 3.4) - NEW
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingServer = useServerById(deletingServerId);

  // C5 Fix: Auto-Close wenn Server verschwindet
  useEffect(() => {
    if (deletingServerId && !deletingServer) {
      setDeletingServerId(null);
    }
  }, [deletingServerId, deletingServer]);

  /**
   * Öffnet den Delete-Bestätigungs-Dialog.
   */
  const handleDeleteServer = (serverId: string) => {
    setDeletingServerId(serverId);
  };

  /**
   * Bestätigt die Löschung und führt sie aus.
   */
  const handleDeleteConfirm = async () => {
    if (!deletingServerId || !deletingServer) return;

    const serverName = deletingServer.name;
    const wasLastServer = servers.length === 1;

    setIsDeleting(true);
    try {
      await removeServer(deletingServerId);

      // Toast mit Server-Name
      toast.success(`Server '${serverName}' entfernt`);

      // Navigation nach Löschung
      if (wasLastServer) {
        toast.info('Du brauchst mindestens einen Server');
        void navigate({ to: '/server/setup' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Entfernen', { description: message });
    } finally {
      setIsDeleting(false);
      setDeletingServerId(null);
    }
  };

  /**
   * Schließt den Delete-Dialog ohne Aktion.
   */
  const closeDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setDeletingServerId(null);
    }
  }, [isDeleting]);

  return (
    <AuthLayout>
      {/* ... existing content ... */}

      {/* Delete-Confirmation-Dialog (Story 3.4) */}
      <ServerDeleteConfirmDialog
        server={deletingServer}
        open={deletingServerId !== null && deletingServer !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isLoading={isDeleting}
      />
    </AuthLayout>
  );
}
```

### Auth-State Handling

Der Auth-State muss bei Löschung des aktiven Servers berücksichtigt werden:

```typescript
// Option 1: Prüfen ob User eingeloggt ist und aktiver Server gelöscht wird
const activeServerId = useStore(serverStore, (s) => s.activeServerId);
const isLoggedIn = useAuth(); // oder ähnlicher Hook

const handleDeleteConfirm = async () => {
  // ...
  const wasActiveServer = deletingServerId === activeServerId;

  await removeServer(deletingServerId);

  if (wasActiveServer && isLoggedIn) {
    // Auth-State clearen falls nötig
    // removeServer() setzt bereits automatisch den nächsten Server als aktiv
    // Bei letztem Server: activeServerId wird null
  }
  // ...
};
```

**Hinweis:** Der `removeServer` Store-Action handled bereits das Setzen des neuen aktiven Servers. Falls der User eingeloggt war, muss ggf. der Auth-State invalidiert werden.

### Button Component - Danger Intent

Prüfe ob `Button` Komponente `intent="danger"` unterstützt:

```typescript
// Falls nicht vorhanden, Tailwind-Klassen nutzen:
<button
  type="button"
  onClick={onConfirm}
  disabled={isLoading}
  className={cn(
    "flex-1 rounded-lg px-4 py-2 font-medium text-white",
    "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50"
  )}
>
  {isLoading ? <Spinner /> : 'Entfernen'}
</button>
```

### Test-Patterns

```typescript
// Unit Test Pattern für ServerDeleteConfirmDialog
describe('ServerDeleteConfirmDialog', () => {
  const mockServer: ServerConfig = {
    id: 'test-1',
    name: 'Test Server',
    url: 'https://test.example.com',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: '2026-01-10T00:00:00Z',
  };

  it('should display server name in dialog', () => {
    // Given
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    // When
    render(
      <ServerDeleteConfirmDialog
        server={mockServer}
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Then
    expect(screen.getByText(/Test Server/)).toBeInTheDocument();
    expect(screen.getByText(/wirklich entfernen/)).toBeInTheDocument();
  });

  it('should call onConfirm when Entfernen clicked', async () => {
    // Given
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    // When
    render(
      <ServerDeleteConfirmDialog
        server={mockServer}
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    // Then
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when Abbrechen clicked', async () => {
    // Given
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    // When
    render(
      <ServerDeleteConfirmDialog
        server={mockServer}
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /Abbrechen/i }));

    // Then
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should disable buttons when loading', () => {
    // Given/When
    render(
      <ServerDeleteConfirmDialog
        server={mockServer}
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
      />
    );

    // Then
    expect(screen.getByRole('button', { name: /Abbrechen/i })).toBeDisabled();
  });
});

// Integration Test für Delete-Flow in ServerManagementPage
describe('ServerManagementPage - Delete Flow', () => {
  beforeEach(() => {
    serverStore.setState({
      servers: [
        { id: '1', name: 'Server 1', url: 'https://s1.com', isDefault: true, createdAt: '', lastUsedAt: '' },
        { id: '2', name: 'Server 2', url: 'https://s2.com', isDefault: false, createdAt: '', lastUsedAt: '' },
      ],
      activeServerId: '1',
      connectionStatus: new Map(),
      isHydrated: true,
    });
  });

  it('should open delete dialog when delete button clicked', async () => {
    // Given
    const user = userEvent.setup();

    // When
    render(<ServerManagementPage />);
    const deleteButtons = screen.getAllByRole('button', { name: /löschen/i });
    await user.click(deleteButtons[0]);

    // Then
    expect(screen.getByTestId('delete-server-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Server 1/)).toBeInTheDocument();
  });

  it('should remove server and show toast on confirm', async () => {
    // Given
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'success');

    // When
    render(<ServerManagementPage />);
    await user.click(screen.getAllByRole('button', { name: /löschen/i })[0]);
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    // Then
    await waitFor(() => {
      expect(serverStore.state.servers).toHaveLength(1);
      expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('Server 1'));
    });
  });

  it('should navigate to setup when last server deleted', async () => {
    // Given
    serverStore.setState((s) => ({ ...s, servers: s.servers.slice(0, 1) })); // Nur 1 Server
    const user = userEvent.setup();
    const navigateMock = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigateMock);

    // When
    render(<ServerManagementPage />);
    await user.click(screen.getByRole('button', { name: /löschen/i }));
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    // Then
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/server/setup' });
    });
  });
});
```

### Learnings aus Story 3.3 (WICHTIG!)

**Patterns die übernommen werden:**
1. ✅ Modal-State Pattern: `deletingServerId: string | null`
2. ✅ Auto-Close Effect (C5 Fix): Wenn Server verschwindet
3. ✅ `useServerById` Hook für Server-Daten
4. ✅ `useCallback` für stabile Handler-Referenzen
5. ✅ Loading-State während async Operation
6. ✅ Toast-Notifications für Success/Error

**Code Review Issues aus Story 3.3 die hier relevant sind:**
- H6: Dynamische ARIA-Labels mit Server-Namen
- M8: Unified Handler für Modal-Close

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-P2 | UI Reaktion < 50ms | TanStack Store (in-memory), kein async Load |
| NFR-U2 | Max 3 Klicks | Delete Icon → Confirm → Done = 2 Klicks ✓ |
| NFR-U3 | Deutsche UI-Texte | Alle Labels, Buttons, Toasts in Deutsch |
| NFR-R2 | Fehlerfeedback < 2s | Toast sofort nach Operation |

### Project Structure Notes

**Neue Dateien zu erstellen:**
```
packages/frontend/src/features/server/
└── ui/
    └── molecules/
        ├── ServerDeleteConfirmDialog.tsx           # NEU: Bestätigungs-Dialog
        └── __tests__/
            └── ServerDeleteConfirmDialog.test.tsx  # NEU: Tests
```

**Zu modifizierende Dateien:**
```
packages/frontend/src/features/server/
└── ui/
    ├── molecules/
    │   └── index.ts                        # MODIFY: Export ServerDeleteConfirmDialog
    └── pages/
        ├── ServerManagementPage.tsx        # MODIFY: Delete-Modal Integration
        └── __tests__/
            └── ServerManagementPage.test.tsx  # MODIFY: Delete-Tests
```

### Git Commit Flow

**Empfohlene Commit-Reihenfolge:**
1. `✨(server): Add ServerDeleteConfirmDialog component`
2. `✨(server): Integrate delete confirmation in ServerManagementPage`
3. `🧪(server): Add comprehensive tests for server delete feature`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: _bmad-output/implementation-artifacts/3-3-server-bearbeiten.md]
- [Source: packages/frontend/src/features/server/stores/server.store.ts#removeServer]
- [Source: packages/frontend/src/features/server/ui/pages/ServerManagementPage.tsx]
- [Source: CLAUDE.md#Frontend-Patterns]

### PRD Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| FR5: Server entfernen | Story-Scope | ServerDeleteConfirmDialog + removeServer |
| FR5.1: Bestätigung vor Löschung | AC1, AC3 | Confirmation Dialog |
| FR5.2: Token löschen | AC2 | Automatisch via removeServer Store-Action |
| FR5.3: Letzter Server → Setup | AC4 | Navigate to /server/setup |
| NFR-U2: Max 3 Klicks | ✓ | Delete Icon → Confirm = 2 Klicks |

### Implementierungshinweise

**Einfachheit der Story:**
Diese Story ist relativ einfach, da:
1. `removeServer()` ist BEREITS vollständig implementiert im Store
2. `ServerListItem` hat BEREITS einen Delete-Button mit `onDelete` Prop
3. Das Modal-Pattern ist von Story 3.3 etabliert

**Hauptarbeit:**
1. `ServerDeleteConfirmDialog` Komponente erstellen (Danger-Styling)
2. State-Management in `ServerManagementPage` ergänzen
3. Navigation-Logik für letzten Server

**Geschätzte Komplexität:** Niedrig bis Mittel
- Keine Backend-Änderungen
- Keine neuen Store-Actions
- Etablierte Patterns wiederverwenden

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript-Fehler behoben: Button Import-Pfad korrigiert, isLoading Prop in Tests
- 20 Unit-Tests für ServerDeleteConfirmDialog (alle bestanden)
- 12 Unit-Tests für ServerManagementPage Delete-Flow (alle bestanden)
- 6 E2E Tests mit Chrome MCP manuell durchgeführt (alle bestanden)

### Completion Notes List

- ✅ ServerDeleteConfirmDialog Komponente mit Headless UI Dialog erstellt
- ✅ Danger-Styling mit PiTrash Icon und rotem Button implementiert
- ✅ Delete-Modal State-Management in ServerManagementPage integriert
- ✅ removeServer Store-Action (bereits vorhanden) für Löschung genutzt
- ✅ Toast-Notifications für Erfolg, Info und Fehler implementiert
- ✅ Navigation zu /server/setup bei letztem Server
- ✅ Auth-State wird automatisch via Store Token-Sync geclearet
- ✅ Loading-State mit disabled Buttons während async Operation
- ✅ Auto-Close Effect wenn Server verschwindet (C5 Fix Pattern)
- ✅ Escape-Key und Abbrechen-Button schließen Dialog ohne Löschung
- ✅ Alle 6 Acceptance Criteria erfüllt

### File List

**Neue Dateien:**
- packages/frontend/src/features/server/ui/molecules/ServerDeleteConfirmDialog.tsx
- packages/frontend/src/features/server/ui/molecules/__tests__/ServerDeleteConfirmDialog.test.tsx

**Modifizierte Dateien:**
- packages/frontend/src/features/server/ui/molecules/index.ts (Export hinzugefügt)
- packages/frontend/src/features/server/ui/pages/ServerManagementPage.tsx (Delete-Modal Integration)
- packages/frontend/src/features/server/ui/pages/__tests__/ServerManagementPage.test.tsx (12 Delete-Flow Tests)

### Change Log

- 2026-01-12: Story 3.4 implementiert - Server entfernen Feature mit Bestätigungs-Dialog, 49 Tests bestanden
- 2026-01-12: Code Review - 12 Findings (4H, 5M, 3L) identifiziert und behoben:
  - H1: Auth-State Bereinigung bei aktivem Server (AC6 vollständig)
  - H2: activeServerId subscription hinzugefügt
  - H3: Race Condition Toast/Navigate mit setTimeout gefixt
  - H4: role="alertdialog" für WCAG Compliance
  - M1-M5: Test-Qualität verbessert, Kontrast gefixt, ARIA-Konflikte behoben
  - L1-L3: Code-Klarheit verbessert
- 2026-01-12: 50 Tests bestanden, Story auf done gesetzt
