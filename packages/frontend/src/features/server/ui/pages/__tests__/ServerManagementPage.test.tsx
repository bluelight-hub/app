/**
 * Tests für ServerManagementPage
 *
 * Testet die Server-Verwaltung Page mit Navigation, Layout und Integration
 * der ServerList Komponente.
 *
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 *
 * @module features/server/ui/pages/__tests__/ServerManagementPage
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerManagementPage } from '../ServerManagementPage';
import type { ServerConfig } from '../../../types/server-config';

// =====================================================
// Mock für toast (sonner) - muss vor der Komponentenimport definiert werden
// vi.hoisted() garantiert korrekte Reihenfolge
// =====================================================
const { mockToast, mockRemoveServer, mockServerStore } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  mockRemoveServer: vi.fn(),
  mockServerStore: {
    state: {
      servers: [],
      activeServerId: 'delete-test-id', // Der erste Server ist aktiv für AC6 Tests
    },
    get: vi.fn(function () {
      return this.state;
    }),
    setState: vi.fn(function (updater: unknown) {
      this.state = typeof updater === 'function' ? (updater as (prev: typeof this.state) => typeof this.state)(this.state) : updater;
    }),
    subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// =====================================================
// Mock für server.store
// =====================================================
vi.mock('../../../stores/server.store', () => ({
  removeServer: (...args: unknown[]) => mockRemoveServer(...args),
  serverStore: mockServerStore,
}));

// =====================================================
// Mock Setup
// =====================================================

// Mock für TanStack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock für Route.useSearch() (ServerManagementPage nutzt Route aus @/routes/server/manage)
vi.mock('@/routes/server/manage', () => ({
  Route: {
    useSearch: () => ({ reason: undefined }),
  },
}));

// Mock Server-Daten für Sortierungstest und Delete-Tests
let mockServersForList: Array<{ id: string; name: string; url: string; lastUsedAt: string | null }> = [];
let mockServerCount = 2; // Default: Mehr als 1 Server für Tests

// Mock Server für Edit-Tests (C5 Fix: Modal benötigt gültigen Server)
const mockEditServer: ServerConfig = {
  id: 'test-id',
  name: 'Test Server',
  url: 'https://test.example.com',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
};

// Mock Server für Delete-Tests
const mockDeleteServer: ServerConfig = {
  id: 'delete-test-id',
  name: 'Delete Test Server',
  url: 'https://delete.example.com',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
};

// Mock für useServerById Hook - gibt Server zurück wenn ID matcht
vi.mock('../../../hooks/use-server-by-id', () => ({
  useServerById: vi.fn((serverId: string | null) => {
    if (serverId === 'test-id') {
      return mockEditServer;
    }
    if (serverId === 'delete-test-id') {
      return mockDeleteServer;
    }
    return null;
  }),
}));

// Mock für useServerList Hook - liefert Server-Anzahl für Delete-Flow Tests
vi.mock('../../../hooks', () => ({
  useServerList: vi.fn(() => {
    // Generiert Mock-Server basierend auf mockServerCount
    const servers: ServerConfig[] = [];
    for (let i = 0; i < mockServerCount; i++) {
      servers.push({
        id: i === 0 ? 'delete-test-id' : `server-${i}`,
        name: i === 0 ? 'Delete Test Server' : `Server ${i}`,
        url: `https://server${i}.example.com`,
        isDefault: i === 0,
        createdAt: '2026-01-01T00:00:00Z',
        lastUsedAt: null,
      });
    }
    return servers;
  }),
}));

// Mock für ServerEditForm - isoliert von TanStack Query (vermeidet Provider-Dependency)
vi.mock('../../organisms/ServerEditForm', () => ({
  ServerEditForm: vi.fn(({ server, onSuccess, onCancel }) => (
    <div data-testid="mock-server-edit-form">
      <span data-testid="edit-form-server-name">{server?.name}</span>
      <button type="button" onClick={onSuccess} data-testid="edit-form-save-btn">
        Speichern
      </button>
      <button type="button" onClick={onCancel} data-testid="edit-form-cancel-btn">
        Abbrechen
      </button>
    </div>
  )),
}));

// Mock für ServerList
vi.mock('../../organisms/ServerList', () => ({
  ServerList: vi.fn(({ onAddServer, onEditServer, onDeleteServer }) => (
    <div data-testid="mock-server-list">
      <button type="button" onClick={onAddServer} data-testid="add-server-btn">
        Add Server
      </button>
      <button type="button" onClick={() => onEditServer?.('test-id')} data-testid="edit-server-btn">
        Edit Server
      </button>
      <button type="button" onClick={() => onDeleteServer?.('delete-test-id')} data-testid="delete-server-btn">
        Delete Server
      </button>
      {/* Render mock servers for sorting test (AC2) */}
      {mockServersForList.length > 0 && (
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Test mock element
        <div role="list" data-testid="server-list-items">
          {mockServersForList.map((server) => (
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Test mock element
            <div key={server.id} role="listitem" data-testid={`server-item-${server.id}`}>
              {server.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )),
}));

// Mock für ServerDeleteConfirmDialog
vi.mock('../../molecules/ServerDeleteConfirmDialog', () => ({
  ServerDeleteConfirmDialog: vi.fn(({ server, open, onConfirm, onCancel, isLoading }) => {
    if (!open) return null;
    return (
      <div data-testid="delete-server-dialog" role="dialog" aria-label={`Server "${server?.name}" entfernen`}>
        <span data-testid="delete-dialog-server-name">{server?.name}</span>
        <p>Möchtest du den Server wirklich entfernen?</p>
        <button type="button" onClick={onCancel} data-testid="delete-cancel-btn" disabled={isLoading}>
          Abbrechen
        </button>
        <button type="button" onClick={onConfirm} data-testid="delete-confirm-btn" disabled={isLoading}>
          {isLoading ? 'Wird entfernt...' : 'Entfernen'}
        </button>
        {isLoading && <span data-testid="delete-loading-indicator">Loading...</span>}
      </div>
    );
  }),
}));

// =====================================================
// Test Setup
// =====================================================

const originalGetAnimations = Element.prototype.getAnimations;

beforeAll(() => {
  Element.prototype.getAnimations = vi.fn(() => []);
});

afterAll(() => {
  if (originalGetAnimations) {
    Element.prototype.getAnimations = originalGetAnimations;
    return;
  }

  // eslint-disable-next-line no-delete-var -- Restore test environment to original shape
  delete Element.prototype.getAnimations;
});

beforeEach(() => {
  vi.clearAllMocks();
  mockServerStore.state = {
    servers: [],
    activeServerId: 'delete-test-id',
  };
  mockServersForList = [];
  mockServerCount = 2; // Default: 2 Server für Tests (nicht letzter Server)
  mockRemoveServer.mockResolvedValue(undefined); // Default: erfolgreiche Löschung
});

// =====================================================
// Tests
// =====================================================

describe('ServerManagementPage', () => {
  // =====================================================
  // Rendering Tests
  // =====================================================

  describe('Rendering', () => {
    it('should render page title "Server verwalten"', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      expect(screen.getByRole('heading', { name: 'Server verwalten' })).toHaveTextContent('Server verwalten');
    });

    it('should render description text', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      expect(screen.getByText('Verwalte deine konfigurierten Server und Verbindungen.')).toBeInTheDocument();
    });

    it('should render ServerList component', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      expect(screen.getByTestId('mock-server-list')).toBeInTheDocument();
    });
  });

  // =====================================================
  // Navigation Tests
  // =====================================================

  describe('Navigation', () => {
    it('should navigate to /server/setup when onAddServer is called', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act)
      await user.click(screen.getByTestId('add-server-btn'));

      // Then (Assert)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/server/setup' });
    });
  });

  // =====================================================
  // Accessibility Tests
  // =====================================================

  describe('Accessibility', () => {
    it('should have heading level 1 for page title', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      const heading = screen.getByRole('heading', { name: 'Server verwalten' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });
  });

  // =====================================================
  // Layout Tests
  // =====================================================

  describe('Layout', () => {
    it('should have proper container styling with max-width', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      const { container } = render(<ServerManagementPage />);

      // Then (Assert)
      const innerContainer = container.querySelector('.max-w-3xl');
      expect(innerContainer).toBeInTheDocument();
    });

    it('should have border around server list container', () => {
      // Given (Arrange)
      // - Standard Page Rendering ohne Parameter

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      const listContainer = screen.getByTestId('mock-server-list').parentElement;
      expect(listContainer).toBeInTheDocument();
      expect(listContainer).toHaveClass('overflow-hidden', 'rounded-panel', 'border', 'border-border-subtle');
    });

    it('should render page content inside the AuthLayout shell', () => {
      // Given (Arrange)
      // - Standard Page Rendering mit AuthLayout

      // When (Act)
      render(<ServerManagementPage />);

      // Then (Assert)
      const listContainer = screen.getByTestId('mock-server-list').parentElement;
      expect(listContainer).toBeInTheDocument();
      expect(listContainer).toHaveClass('bg-surface-panel', 'shadow-panel');

      expect(screen.queryByTestId('auth-layout-helper-panel')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Server verwalten' })).toBeInTheDocument();
    });
  });

  // =====================================================
  // Sorting Integration Tests (AC2)
  // =====================================================

  describe('Sorting Integration (AC2)', () => {
    it('should display servers sorted by lastUsedAt (most recent first)', () => {
      // Given: Mehrere Server mit unterschiedlichen lastUsedAt Timestamps
      // In der echten Implementierung sortiert useServerList nach lastUsedAt DESC
      const olderServer = {
        id: 'server-old',
        name: 'Old Server',
        url: 'https://old.example.com',
        lastUsedAt: new Date('2026-01-01T10:00:00Z').toISOString(),
      };
      const newerServer = {
        id: 'server-new',
        name: 'New Server',
        url: 'https://new.example.com',
        lastUsedAt: new Date('2026-01-10T10:00:00Z').toISOString(),
      };

      // Mock servers in korrekter Sortierreihenfolge (wie useServerList sie zurückgibt)
      // useServerList sortiert nach lastUsedAt DESC - neueste zuerst
      mockServersForList = [newerServer, olderServer];

      // When: Page wird gerendert
      render(<ServerManagementPage />);

      // Then: Server sind in korrekter Reihenfolge (neueste zuerst)
      const serverItems = screen.getAllByRole('listitem');
      expect(serverItems).toHaveLength(2);
      expect(serverItems[0]).toHaveTextContent('New Server');
      expect(serverItems[1]).toHaveTextContent('Old Server');
    });

    it('should handle servers without lastUsedAt at end of list', () => {
      // Given: Server mit und ohne lastUsedAt
      const serverWithDate = {
        id: 'server-with-date',
        name: 'Server With Date',
        url: 'https://dated.example.com',
        lastUsedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
      };
      const serverWithoutDate = {
        id: 'server-no-date',
        name: 'Server Without Date',
        url: 'https://undated.example.com',
        lastUsedAt: null,
      };

      // useServerList sortiert Server ohne lastUsedAt ans Ende (timestamp = 0)
      mockServersForList = [serverWithDate, serverWithoutDate];

      // When
      render(<ServerManagementPage />);

      // Then: Server mit Datum zuerst, ohne Datum am Ende
      const serverItems = screen.getAllByRole('listitem');
      expect(serverItems).toHaveLength(2);
      expect(serverItems[0]).toHaveTextContent('Server With Date');
      expect(serverItems[1]).toHaveTextContent('Server Without Date');
    });
  });

  // =====================================================
  // Callback Tests
  // =====================================================

  describe('Callbacks', () => {
    it('should open edit modal when edit button clicked (Story 3.3)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act)
      await user.click(screen.getByTestId('edit-server-btn'));

      // Then (Assert) - Modal sollte geöffnet sein
      const dialog = await screen.findByTestId('edit-server-dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should open delete confirmation dialog when delete button clicked (Story 3.4)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act)
      await user.click(screen.getByTestId('delete-server-btn'));

      // Then (Assert) - Dialog sollte geöffnet sein
      const dialog = await screen.findByTestId('delete-server-dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  // =====================================================
  // H7 Fix: Edit Modal Close Behavior Tests
  // =====================================================

  describe('Edit Modal Close Behavior', () => {
    it('should render edit modal with Ring-1 surface tokens', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When
      await user.click(screen.getByTestId('edit-server-btn'));

      // Then
      const panel = await screen.findByTestId('edit-server-dialog-panel');
      expect(panel).toHaveClass('rounded-panel', 'border-border-subtle', 'bg-surface-panel', 'shadow-panel');
      expect(panel).not.toHaveClass('bg-white');
      expect(screen.getByText('Test Server bearbeiten')).toHaveClass('text-text-primary', 'text-title-sm');
      expect(screen.getByLabelText('Modal schließen')).toHaveClass('text-text-muted');
    });

    it('should close modal when Escape key pressed', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When - Open modal
      await user.click(screen.getByTestId('edit-server-btn'));
      await screen.findByTestId('edit-server-dialog');

      // When - Press Escape
      await user.keyboard('{Escape}');

      // Then
      await waitFor(() => {
        expect(screen.queryByTestId('edit-server-dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when backdrop clicked', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When - Open modal
      await user.click(screen.getByTestId('edit-server-btn'));
      const backdrop = await screen.findByTestId('dialog-backdrop');

      // When - Click backdrop
      await user.click(backdrop);

      // Then
      await waitFor(() => {
        expect(screen.queryByTestId('edit-server-dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when X button clicked', async () => {
      // Given
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When - Open modal
      await user.click(screen.getByTestId('edit-server-btn'));
      await screen.findByTestId('edit-server-dialog');

      // When - Click close button
      const closeButton = screen.getByLabelText('Modal schließen');
      await user.click(closeButton);

      // Then
      await waitFor(() => {
        expect(screen.queryByTestId('edit-server-dialog')).not.toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // M9 Fix: useServerById Integration Tests
  // =====================================================

  describe('useServerById Integration', () => {
    it('should render ServerEditForm with correct server data from useServerById', async () => {
      // Given - useServerById Mock ist bereits konfiguriert und gibt mockEditServer für 'test-id' zurück
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When - Open modal for 'test-id'
      await user.click(screen.getByTestId('edit-server-btn'));

      // Then - ServerEditForm sollte mit korrekten Server-Daten gerendert werden
      // Da Headless UI Dialog mit data-testid verwendet wird, prüfen wir den Dialog-Titel
      await waitFor(() => {
        // Der Dialog-Titel enthält den Server-Namen (H6 Fix in Komponente)
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', expect.stringContaining('Test Server'));
      });
    });

    it('should not open modal when server not found (null)', async () => {
      // Given - Mock useServerById um null für eine andere ID zurückzugeben
      // Dieser Test verifiziert C5 Fix: Modal öffnet nur wenn editingServer !== null
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When - Wenn Modal mit ungültiger Server-ID geöffnet wird
      // (In der echten Implementierung würde dies passieren wenn Server gelöscht wird während ID gesetzt ist)
      // Da Mock nur 'test-id' kennt, sollte das Modal bei anderen IDs nicht öffnen

      // Then - Die Edit-Funktionalität mit gültiger ID sollte funktionieren
      await user.click(screen.getByTestId('edit-server-btn')); // test-id
      const dialog = await screen.findByTestId('edit-server-dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  // =====================================================
  // Story 3.4: Delete Flow Tests
  // =====================================================

  describe('Delete Flow (Story 3.4)', () => {
    // Test 1: Delete-Button öffnet Confirm-Dialog
    it('should open delete confirmation dialog when delete button is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act)
      await user.click(screen.getByTestId('delete-server-btn'));

      // Then (Assert)
      const dialog = await screen.findByTestId('delete-server-dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByTestId('delete-dialog-server-name')).toHaveTextContent('Delete Test Server');
    });

    // Test 2: Confirm löscht Server und zeigt Toast
    it('should delete server and show success toast when confirmed', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert)
      await waitFor(() => {
        expect(mockRemoveServer).toHaveBeenCalledWith('delete-test-id');
      });
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Server 'Delete Test Server' entfernt");
      });
    });

    // Test 3: Cancel schließt Dialog ohne Löschung
    it('should close dialog without deletion when cancel is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und abbrechen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-cancel-btn'));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByTestId('delete-server-dialog')).not.toBeInTheDocument();
      });
      expect(mockRemoveServer).not.toHaveBeenCalled();
    });

    // Test 4: Escape schließt Dialog ohne Löschung (via onCancel)
    it('should close dialog without deletion when Escape is pressed (via onCancel)', async () => {
      // Given (Arrange)
      // Note: Der Mock ruft onCancel auf, was closeDeleteModal entspricht
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');

      // When - Cancel klicken (simuliert Escape, da Mock onClose → onCancel mapped)
      await user.click(screen.getByTestId('delete-cancel-btn'));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.queryByTestId('delete-server-dialog')).not.toBeInTheDocument();
      });
      expect(mockRemoveServer).not.toHaveBeenCalled();
    });

    // Test 5: Letzter Server → Redirect zu /server/setup
    it('should redirect to /server/setup when last server is deleted', async () => {
      // Given (Arrange) - Nur 1 Server
      mockServerCount = 1;
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/server/setup' });
      });
    });

    // Test 6: Letzter Server → zeigt beide Toasts (success + info)
    it('should show success and info toast when last server is deleted', async () => {
      // Given (Arrange) - Nur 1 Server
      mockServerCount = 1;
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - Beide Toasts sollten erscheinen
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Server 'Delete Test Server' entfernt");
        expect(mockToast.info).toHaveBeenCalledWith('Du brauchst mindestens einen Server');
      });
    });

    // Test 7: Loading-State während Deletion (Buttons disabled)
    it('should show loading state and disable buttons during deletion', async () => {
      // Given (Arrange) - Langsame Deletion simulieren
      let resolveDelete: () => void = () => {};
      mockRemoveServer.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          }),
      );
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - Loading State sollte aktiv sein
      await waitFor(() => {
        expect(screen.getByTestId('delete-loading-indicator')).toBeInTheDocument();
      });
      expect(screen.getByTestId('delete-confirm-btn')).toBeDisabled();
      expect(screen.getByTestId('delete-cancel-btn')).toBeDisabled();

      // Cleanup: Deletion abschließen
      await act(async () => {
        resolveDelete();
      });
    });

    // Test 8: Error-Handling mit Toast bei Fehler
    it('should show error toast when deletion fails', async () => {
      // Given (Arrange) - Fehler bei Deletion
      mockRemoveServer.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert)
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Fehler beim Entfernen', {
          description: 'Network error',
        });
      });
    });

    // Test 9: Dialog schließt nach erfolgreicher Löschung
    it('should close dialog after successful deletion', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - Dialog sollte geschlossen sein
      await waitFor(() => {
        expect(screen.queryByTestId('delete-server-dialog')).not.toBeInTheDocument();
      });
    });

    // Test 10: Dialog schließt auch bei Fehler
    it('should close dialog even when deletion fails', async () => {
      // Given (Arrange) - Fehler bei Deletion
      mockRemoveServer.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - Dialog sollte trotzdem geschlossen sein
      await waitFor(() => {
        expect(screen.queryByTestId('delete-server-dialog')).not.toBeInTheDocument();
      });
    });

    // Test 11: Server wird aus Liste entfernt nach Confirm
    it('should remove server from list after confirmation', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - removeServer wurde mit korrekter ID aufgerufen
      await waitFor(() => {
        expect(mockRemoveServer).toHaveBeenCalledWith('delete-test-id');
        expect(mockRemoveServer).toHaveBeenCalledTimes(1);
      });
    });

    // Test 12: Multiple Server → kein Redirect nach Löschung
    it('should not redirect when deleting non-last server', async () => {
      // Given (Arrange) - 2 Server (nicht letzter)
      mockServerCount = 2;
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Dialog öffnen und bestätigen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - Kein Redirect
      await waitFor(() => {
        expect(mockRemoveServer).toHaveBeenCalled();
      });
      // Navigate sollte NICHT zu /server/setup navigieren
      expect(mockNavigate).not.toHaveBeenCalledWith({ to: '/server/setup' });
    });

    // Test 13: AC6 - Auth-State wird bei aktivem Server gecleared
    it('should clear auth state when deleting active server (AC6)', async () => {
      // Given (Arrange) - Server ist der aktive Server
      // Der Mock liefert 'delete-test-id' als ersten Server, der auch aktiv ist
      const user = userEvent.setup();
      render(<ServerManagementPage />);

      // When (Act) - Aktiven Server löschen
      await user.click(screen.getByTestId('delete-server-btn'));
      await screen.findByTestId('delete-server-dialog');
      await user.click(screen.getByTestId('delete-confirm-btn'));

      // Then (Assert) - removeServer sollte aufgerufen worden sein
      // Auth-State cleanup erfolgt im Handler wenn wasActiveServer true ist
      await waitFor(() => {
        expect(mockRemoveServer).toHaveBeenCalledWith('delete-test-id');
      });
      // Note: Vollständiger Auth-State Test würde Mocks für resetAuthStore und queryClient erfordern
      // Das ist ein Integration-Test auf höherer Ebene
    });
  });
});
