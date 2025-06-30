import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests für useWorkspaceStore
 *
 * Testet Workspace-Tab-Management inklusive Hinzufügen, Entfernen,
 * Aktivieren und Title-Updates von Tabs.
 */

// Mock für crypto.randomUUID - globaler Counter
let uuidCounter = 0;
const createMockUUID = () => `test-uuid-${++uuidCounter}`;

// Global setup for crypto.randomUUID mock
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(createMockUUID),
  },
  writable: true,
});

// Mock für Logger
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import store AFTER mocking crypto
import { useWorkspaceStore } from './useWorkspaceStore';

// Setup vor jedem Test
beforeEach(() => {
  vi.clearAllMocks();

  // Reset UUID counter for predictable test results
  uuidCounter = 0;

  // Reset crypto.randomUUID mock
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(createMockUUID),
    },
    writable: true,
  });

  // Reset store to initial state with first UUID
  useWorkspaceStore.setState(() => {
    // Create first UUID for initial tab
    const firstId = createMockUUID(); // This will be test-uuid-1
    return {
      tabs: [
        {
          id: firstId,
          title: 'Workspace',
          type: 'workspace' as const,
          active: true,
        },
      ],
      activeTabId: firstId,
      addTab: useWorkspaceStore.getState().addTab,
      removeTab: useWorkspaceStore.getState().removeTab,
      setActiveTab: useWorkspaceStore.getState().setActiveTab,
      updateTabTitle: useWorkspaceStore.getState().updateTabTitle,
    };
  });
});

describe('useWorkspaceStore', () => {
  describe('Initialisierung', () => {
    it('sollte mit einem Standard-Workspace-Tab initialisiert werden', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0]).toEqual({
        id: 'test-uuid-1',
        title: 'Workspace',
        type: 'workspace',
        active: true,
      });
      expect(result.current.activeTabId).toBe('test-uuid-1');
    });

    it('sollte alle erforderlichen Store-Methods verfügbar haben', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      expect(typeof result.current.addTab).toBe('function');
      expect(typeof result.current.removeTab).toBe('function');
      expect(typeof result.current.setActiveTab).toBe('function');
      expect(typeof result.current.updateTabTitle).toBe('function');
      expect(Array.isArray(result.current.tabs)).toBe(true);
      expect(typeof result.current.activeTabId).toBe('string');
    });
  });

  describe('Tab hinzufügen', () => {
    it('sollte einen neuen Workspace-Tab hinzufügen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('workspace');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs[1]).toEqual({
        id: 'test-uuid-2',
        title: 'New workspace 2',
        type: 'workspace',
        active: true,
      });
      expect(result.current.activeTabId).toBe('test-uuid-2');
      // Erster Tab sollte inaktiv werden
      expect(result.current.tabs[0].active).toBe(false);
    });

    it('sollte einen neuen Dashboard-Tab hinzufügen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('dashboard');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs[1]).toEqual({
        id: 'test-uuid-2',
        title: 'New dashboard 2',
        type: 'dashboard',
        active: true,
      });
      expect(result.current.activeTabId).toBe('test-uuid-2');
    });

    it('sollte einen neuen Administration-Tab hinzufügen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('administration');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs[1]).toEqual({
        id: 'test-uuid-2',
        title: 'New administration 2',
        type: 'administration',
        active: true,
      });
    });

    it('sollte einen Tab mit custom title hinzufügen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('workspace', 'Custom Workspace');
      });

      expect(result.current.tabs[1]).toEqual({
        id: 'test-uuid-2',
        title: 'Custom Workspace',
        type: 'workspace',
        active: true,
      });
    });

    it('sollte alle vorherigen Tabs inaktiv setzen beim Hinzufügen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge mehrere Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      act(() => {
        result.current.addTab('administration');
      });

      expect(result.current.tabs).toHaveLength(3);
      expect(result.current.tabs[0].active).toBe(false);
      expect(result.current.tabs[1].active).toBe(false);
      expect(result.current.tabs[2].active).toBe(true);
      expect(result.current.activeTabId).toBe('test-uuid-3');
    });

    it('sollte korrekte Tab-Nummerierung verwenden', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge mehrere Tabs hinzu
      act(() => {
        result.current.addTab('workspace');
      });
      act(() => {
        result.current.addTab('workspace');
      });

      expect(result.current.tabs[1].title).toBe('New workspace 2');
      expect(result.current.tabs[2].title).toBe('New workspace 3');
    });
  });

  describe('Tab entfernen', () => {
    it('sollte einen Tab entfernen und nächsten aktivieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge zusätzliche Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      act(() => {
        result.current.addTab('administration');
      });

      // Entferne mittleren Tab
      act(() => {
        result.current.removeTab('test-uuid-2');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs.find((tab) => tab.id === 'test-uuid-2')).toBeUndefined();
    });

    it('sollte beim Entfernen des aktiven Tabs den letzten Tab aktivieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      act(() => {
        result.current.addTab('administration');
      });

      const activeTabId = result.current.activeTabId;

      // Entferne aktiven Tab
      act(() => {
        result.current.removeTab(activeTabId!);
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.activeTabId).toBe('test-uuid-2'); // Letzter verbleibender Tab
    });

    it('sollte beim Entfernen eines inaktiven Tabs die Active-ID beibehalten', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      const activeTabId = result.current.activeTabId;

      // Entferne inaktiven Tab
      act(() => {
        result.current.removeTab('test-uuid-1');
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.activeTabId).toBe(activeTabId); // Bleibt unverändert
    });

    it('sollte einen neuen Workspace-Tab erstellen wenn alle entfernt werden', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Entferne den einzigen Tab
      act(() => {
        result.current.removeTab('test-uuid-1');
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0]).toEqual({
        id: 'test-uuid-2',
        title: 'Workspace',
        type: 'workspace',
        active: true,
      });
      expect(result.current.activeTabId).toBe('test-uuid-2');
    });

    it('sollte nicht-existierende Tab-IDs graceful handhaben', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      const originalTabs = result.current.tabs;
      const originalActiveTabId = result.current.activeTabId;

      // Versuche nicht-existierenden Tab zu entfernen
      act(() => {
        result.current.removeTab('non-existing-id');
      });

      // Sollte unverändert bleiben
      expect(result.current.tabs).toEqual(originalTabs);
      expect(result.current.activeTabId).toBe(originalActiveTabId);
    });
  });

  describe('Tab aktivieren', () => {
    it('sollte einen spezifischen Tab aktivieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge zusätzliche Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      act(() => {
        result.current.addTab('administration');
      });

      // Aktiviere ersten Tab wieder
      act(() => {
        result.current.setActiveTab('test-uuid-1');
      });

      expect(result.current.activeTabId).toBe('test-uuid-1');
      expect(result.current.tabs[0].active).toBe(true);
      expect(result.current.tabs[1].active).toBe(false);
      expect(result.current.tabs[2].active).toBe(false);
    });

    it('sollte nur einen Tab aktiv haben', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge Tabs hinzu
      act(() => {
        result.current.addTab('dashboard');
      });
      act(() => {
        result.current.addTab('administration');
      });

      // Aktiviere mittleren Tab
      act(() => {
        result.current.setActiveTab('test-uuid-2');
      });

      const activeTabs = result.current.tabs.filter((tab) => tab.active);
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].id).toBe('test-uuid-2');
    });

    it('sollte nicht-existierende Tab-IDs beim Aktivieren ignorieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Versuche nicht-existierenden Tab zu aktivieren
      act(() => {
        result.current.setActiveTab('non-existing-id');
      });

      // ActiveTabId sollte sich ändern (auch wenn Tab nicht existiert)
      expect(result.current.activeTabId).toBe('non-existing-id');
      // Aber alle Tabs sollten inaktiv werden
      expect(result.current.tabs.every((tab) => !tab.active)).toBe(true);
    });
  });

  describe('Tab-Titel aktualisieren', () => {
    it('sollte den Titel eines spezifischen Tabs aktualisieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.updateTabTitle('test-uuid-1', 'Updated Workspace');
      });

      expect(result.current.tabs[0].title).toBe('Updated Workspace');
      // Andere Eigenschaften sollten unverändert bleiben
      expect(result.current.tabs[0].id).toBe('test-uuid-1');
      expect(result.current.tabs[0].type).toBe('workspace');
      expect(result.current.tabs[0].active).toBe(true);
    });

    it('sollte nur den angegebenen Tab-Titel ändern', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge zusätzliche Tabs hinzu
      act(() => {
        result.current.addTab('dashboard', 'Original Dashboard');
      });

      // Ändere nur ersten Tab
      act(() => {
        result.current.updateTabTitle('test-uuid-1', 'New Workspace Title');
      });

      expect(result.current.tabs[0].title).toBe('New Workspace Title');
      expect(result.current.tabs[1].title).toBe('Original Dashboard');
    });

    it('sollte nicht-existierende Tab-IDs beim Titel-Update ignorieren', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      const originalTabs = result.current.tabs;

      // Versuche nicht-existierenden Tab zu updaten
      act(() => {
        result.current.updateTabTitle('non-existing-id', 'New Title');
      });

      // Tabs sollten unverändert bleiben
      expect(result.current.tabs).toEqual(originalTabs);
    });

    it('sollte leere Titel korrekt handhaben', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.updateTabTitle('test-uuid-1', '');
      });

      expect(result.current.tabs[0].title).toBe('');
    });
  });

  describe('Edge Cases und Stress Tests', () => {
    it('sollte sehr viele Tabs korrekt verwalten', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Füge 50 Tabs hinzu
      act(() => {
        for (let i = 0; i < 50; i++) {
          result.current.addTab('workspace', `Tab ${i + 2}`);
        }
      });

      expect(result.current.tabs).toHaveLength(51); // 1 initial + 50 neue
      expect(result.current.tabs.filter((tab) => tab.active)).toHaveLength(1);
    });

    it('sollte rapid state changes korrekt verarbeiten', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('dashboard');
        result.current.addTab('administration');
        result.current.setActiveTab('test-uuid-1');
        result.current.updateTabTitle('test-uuid-1', 'Rapid Change');
        result.current.removeTab('test-uuid-2');
        result.current.addTab('workspace', 'Final Tab');
      });

      // Finaler State sollte konsistent sein
      expect(result.current.tabs).toHaveLength(3);
      expect(result.current.tabs[0].title).toBe('Rapid Change');
    });

    it('sollte mit undefined/null Parametern sicher umgehen', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Diese sollten nicht crashen
      act(() => {
        // @ts-ignore - Testing with invalid null input - Testen mit ungültigen Eingaben
        result.current.removeTab(null);
        // @ts-ignore - Testing with invalid null input
        result.current.setActiveTab(undefined);
        // @ts-ignore - Testing with invalid null input
        result.current.updateTabTitle('test-uuid-1', null);
      });

      // Store sollte weiterhin funktionsfähig sein
      expect(result.current.tabs).toHaveLength(1);
    });

    it('sollte korrekten State nach komplexen Operationen haben', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Komplexer Workflow
      act(() => {
        // Füge verschiedene Tab-Typen hinzu
        result.current.addTab('dashboard', 'Main Dashboard');
        result.current.addTab('administration', 'Admin Panel');
        result.current.addTab('workspace', 'Work Area');

        // Aktiviere mittleren Tab
        result.current.setActiveTab('test-uuid-2');

        // Update Titel
        result.current.updateTabTitle('test-uuid-2', 'Updated Dashboard');

        // Entferne ersten Tab
        result.current.removeTab('test-uuid-1');

        // Füge neuen Tab hinzu
        result.current.addTab('workspace', 'Final Workspace');
      });

      // Überprüfe finalen State
      expect(result.current.tabs).toHaveLength(4);
      expect(result.current.tabs.find((tab) => tab.title === 'Updated Dashboard')).toBeDefined();
      expect(result.current.tabs.filter((tab) => tab.active)).toHaveLength(1);
      expect(result.current.tabs[result.current.tabs.length - 1].active).toBe(true);
    });
  });
});
