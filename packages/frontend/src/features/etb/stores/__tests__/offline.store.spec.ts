/**
 * Unit Tests fuer ETB Offline Store
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 5.10 AC1, AC2, AC3:**
 * - queue: Offline erstellte ETB-Aktionen
 * - lastSync: Letzte erfolgreiche Synchronisation
 * - Timestamp Preservation: occurredAt bleibt erhalten
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  etbOfflineStore,
  resetEtbOfflineStore,
  queueEtbAction,
  removeFromQueue,
  getQueuedActions,
  updateRetryCount,
  setEtbLastSync,
  useEtbQueueCount,
  useEtbLastSync,
  useEtbOfflineStoreState,
  ETB_OFFLINE_STORE_KEYS,
  type EtbQueueAction,
} from '../offline.store';

// ============================================
// Mocks
// ============================================

/**
 * Mock Tauri Store
 *
 * Simuliert die Tauri Store API fuer Unit Tests
 */
vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ============================================
// Test Factories
// ============================================

/**
 * Factory fuer Test-EtbQueueAction
 */
function createTestEtbAction(overrides: Partial<EtbQueueAction> = {}): EtbQueueAction {
  return {
    id: 'action-test-1',
    actionType: 'addEintrag',
    payload: {
      text: 'Test ETB Eintrag',
      kategorie: 'SYSTEM',
      metadata: {
        eventType: 'ErinnerungAcknowledged',
        erinnerungId: 'erinnerung-1',
      },
      occurredAt: new Date(2026, 0, 19, 12, 30, 0).toISOString(),
    },
    einsatzId: 'einsatz-1',
    timestamp: new Date(2026, 0, 19, 12, 35, 0).toISOString(),
    retryCount: 0,
    ...overrides,
  };
}

describe('etbOfflineStore', () => {
  beforeEach(async () => {
    await resetEtbOfflineStore();
  });

  describe('ETB_OFFLINE_STORE_KEYS', () => {
    it('should export correct store keys', () => {
      // Then (Assert)
      expect(ETB_OFFLINE_STORE_KEYS.QUEUE).toBe('etb.offline.queue');
      expect(ETB_OFFLINE_STORE_KEYS.LAST_SYNC).toBe('etb.offline.lastSync');
    });
  });

  describe('initial state', () => {
    it('should have empty queue', () => {
      // When (Act)
      const state = etbOfflineStore.state;

      // Then (Assert)
      expect(state.queue).toEqual([]);
    });

    it('should have null lastSync', () => {
      // When (Act)
      const state = etbOfflineStore.state;

      // Then (Assert)
      expect(state.lastSync).toBeNull();
    });
  });

  describe('queueEtbAction() - AC1 Offline queueing', () => {
    it('should add ETB action to queue', async () => {
      // Given (Arrange)
      const action = createTestEtbAction();

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(1);
      expect(etbOfflineStore.state.queue[0]).toEqual(action);
    });

    it('should add multiple actions in order', async () => {
      // Given (Arrange)
      const action1 = createTestEtbAction({
        id: 'action-1',
        timestamp: '2026-01-19T12:00:00.000Z',
      });
      const action2 = createTestEtbAction({
        id: 'action-2',
        timestamp: '2026-01-19T12:01:00.000Z',
      });

      // When (Act)
      await queueEtbAction(action1);
      await queueEtbAction(action2);

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(2);
      expect(etbOfflineStore.state.queue[0].id).toBe('action-1');
      expect(etbOfflineStore.state.queue[1].id).toBe('action-2');
    });

    it('should deduplicate actions with same ID (AC1)', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({ id: 'action-1' });

      // When (Act)
      await queueEtbAction(action);
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(1);
    });

    it('should deduplicate when ID exists but payload differs', async () => {
      // Given (Arrange)
      const action1 = createTestEtbAction({
        id: 'action-1',
        payload: { text: 'First', kategorie: 'SYSTEM', metadata: { eventType: 'Test', erinnerungId: 'e1' }, occurredAt: '2026-01-19T12:00:00.000Z' },
      });
      const action2 = createTestEtbAction({
        id: 'action-1',
        payload: { text: 'Second', kategorie: 'SYSTEM', metadata: { eventType: 'Test', erinnerungId: 'e1' }, occurredAt: '2026-01-19T12:01:00.000Z' },
      });

      // When (Act)
      await queueEtbAction(action1);
      await queueEtbAction(action2);

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(1);
      expect(etbOfflineStore.state.queue[0].payload.text).toBe('First');
    });
  });

  describe('removeFromQueue() - AC2 Sync entfernt Einträge', () => {
    it('should remove action from queue after successful sync', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({ id: 'action-1' });
      await queueEtbAction(action);
      expect(etbOfflineStore.state.queue).toHaveLength(1);

      // When (Act)
      await removeFromQueue('action-1');

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(0);
    });

    it('should not throw when removing non-existent ID (AC2)', async () => {
      // When (Act) & Then (Assert)
      await expect(removeFromQueue('non-existent')).resolves.not.toThrow();
    });

    it('should only remove specified action', async () => {
      // Given (Arrange)
      const action1 = createTestEtbAction({ id: 'action-1' });
      const action2 = createTestEtbAction({ id: 'action-2' });
      await queueEtbAction(action1);
      await queueEtbAction(action2);

      // When (Act)
      await removeFromQueue('action-1');

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(1);
      expect(etbOfflineStore.state.queue[0].id).toBe('action-2');
    });
  });

  describe('updateRetryCount() - AC2 Retry bei Fehler max 3', () => {
    it('should increment retry count', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({ id: 'action-1', retryCount: 0 });
      await queueEtbAction(action);

      // When (Act)
      await updateRetryCount('action-1', 1);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].retryCount).toBe(1);
    });

    it('should allow retry count up to 3', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({ id: 'action-1', retryCount: 2 });
      await queueEtbAction(action);

      // When (Act)
      await updateRetryCount('action-1', 3);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].retryCount).toBe(3);
    });

    it('should preserve other action properties when updating retry count', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({
        id: 'action-1',
        retryCount: 0,
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e1' },
          occurredAt: '2026-01-19T12:00:00.000Z',
        },
      });
      await queueEtbAction(action);

      // When (Act)
      await updateRetryCount('action-1', 2);

      // Then (Assert)
      const updatedAction = etbOfflineStore.state.queue[0];
      expect(updatedAction.retryCount).toBe(2);
      expect(updatedAction.payload.text).toBe('Test');
      expect(updatedAction.payload.occurredAt).toBe('2026-01-19T12:00:00.000Z');
    });

    it('should not affect other actions', async () => {
      // Given (Arrange)
      const action1 = createTestEtbAction({ id: 'action-1', retryCount: 0 });
      const action2 = createTestEtbAction({ id: 'action-2', retryCount: 0 });
      await queueEtbAction(action1);
      await queueEtbAction(action2);

      // When (Act)
      await updateRetryCount('action-1', 2);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].retryCount).toBe(2);
      expect(etbOfflineStore.state.queue[1].retryCount).toBe(0);
    });
  });

  describe('getQueuedActions() - AC2 Sortierung', () => {
    it('should return actions sorted by timestamp', async () => {
      // Given (Arrange)
      const action1 = createTestEtbAction({
        id: 'action-1',
        timestamp: '2026-01-19T12:02:00.000Z',
      });
      const action2 = createTestEtbAction({
        id: 'action-2',
        timestamp: '2026-01-19T12:00:00.000Z',
      });
      const action3 = createTestEtbAction({
        id: 'action-3',
        timestamp: '2026-01-19T12:01:00.000Z',
      });

      await queueEtbAction(action1);
      await queueEtbAction(action2);
      await queueEtbAction(action3);

      // When (Act)
      const sorted = getQueuedActions();

      // Then (Assert)
      expect(sorted).toHaveLength(3);
      expect(sorted[0].id).toBe('action-2'); // 12:00
      expect(sorted[1].id).toBe('action-3'); // 12:01
      expect(sorted[2].id).toBe('action-1'); // 12:02
    });

    it('should return empty array when queue is empty', () => {
      // When (Act)
      const sorted = getQueuedActions();

      // Then (Assert)
      expect(sorted).toEqual([]);
    });

    it('should not mutate original queue', async () => {
      // Given (Arrange)
      const action = createTestEtbAction();
      await queueEtbAction(action);

      // When (Act)
      const sorted = getQueuedActions();
      sorted.push(createTestEtbAction({ id: 'should-not-affect-store' }));

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toHaveLength(1);
    });
  });

  describe('Timestamp Preservation - AC3', () => {
    it('should preserve occurredAt through queue operations', async () => {
      // Given (Arrange)
      const occurredAt = '2026-01-19T12:30:00.000Z';
      const action = createTestEtbAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e1' },
          occurredAt,
        },
      });

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].payload.occurredAt).toBe(occurredAt);
    });

    it('should preserve occurredAt after retry count update', async () => {
      // Given (Arrange)
      const occurredAt = '2026-01-19T12:30:00.000Z';
      const action = createTestEtbAction({
        id: 'action-1',
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e1' },
          occurredAt,
        },
      });
      await queueEtbAction(action);

      // When (Act)
      await updateRetryCount('action-1', 1);
      await updateRetryCount('action-1', 2);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].payload.occurredAt).toBe(occurredAt);
    });

    it('should preserve occurredAt in sorted actions', async () => {
      // Given (Arrange)
      const occurredAt = '2026-01-19T12:30:00.000Z';
      const action = createTestEtbAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e1' },
          occurredAt,
        },
        timestamp: '2026-01-19T12:35:00.000Z',
      });
      await queueEtbAction(action);

      // When (Act)
      const sorted = getQueuedActions();

      // Then (Assert)
      expect(sorted[0].payload.occurredAt).toBe(occurredAt);
    });

    it('should preserve different occurredAt values for different actions', async () => {
      // Given (Arrange)
      const occurredAt1 = '2026-01-19T12:30:00.000Z';
      const occurredAt2 = '2026-01-19T12:31:00.000Z';

      const action1 = createTestEtbAction({
        id: 'action-1',
        payload: {
          text: 'Test 1',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e1' },
          occurredAt: occurredAt1,
        },
      });
      const action2 = createTestEtbAction({
        id: 'action-2',
        payload: {
          text: 'Test 2',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'Test', erinnerungId: 'e2' },
          occurredAt: occurredAt2,
        },
      });

      // When (Act)
      await queueEtbAction(action1);
      await queueEtbAction(action2);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].payload.occurredAt).toBe(occurredAt1);
      expect(etbOfflineStore.state.queue[1].payload.occurredAt).toBe(occurredAt2);
    });
  });

  describe('setEtbLastSync()', () => {
    it('should update lastSync timestamp', async () => {
      // Given (Arrange)
      const timestamp = '2026-01-19T12:00:00.000Z';

      // When (Act)
      await setEtbLastSync(timestamp);

      // Then (Assert)
      expect(etbOfflineStore.state.lastSync).toBe(timestamp);
    });

    it('should allow setting to null', async () => {
      // Given (Arrange)
      await setEtbLastSync('2026-01-19T12:00:00.000Z');

      // When (Act)
      await setEtbLastSync(null);

      // Then (Assert)
      expect(etbOfflineStore.state.lastSync).toBeNull();
    });
  });

  describe('resetEtbOfflineStore()', () => {
    it('should reset all state to initial values', async () => {
      // Given (Arrange)
      await queueEtbAction(createTestEtbAction());
      await setEtbLastSync('2026-01-19T12:00:00.000Z');

      // When (Act)
      await resetEtbOfflineStore();

      // Then (Assert)
      expect(etbOfflineStore.state.queue).toEqual([]);
      expect(etbOfflineStore.state.lastSync).toBeNull();
    });
  });

  describe('EtbActionType support', () => {
    it('should support addEintrag action type', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({ actionType: 'addEintrag' });

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].actionType).toBe('addEintrag');
    });
  });

  describe('Event metadata preservation', () => {
    it('should preserve eventType in metadata', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: {
            eventType: 'ErinnerungAcknowledged',
            erinnerungId: 'e1',
          },
          occurredAt: '2026-01-19T12:00:00.000Z',
        },
      });

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].payload.metadata.eventType).toBe('ErinnerungAcknowledged');
    });

    it('should preserve erinnerungId in metadata', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: {
            eventType: 'ErinnerungEskaliert',
            erinnerungId: 'erinnerung-123',
          },
          occurredAt: '2026-01-19T12:00:00.000Z',
        },
      });

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      expect(etbOfflineStore.state.queue[0].payload.metadata.erinnerungId).toBe('erinnerung-123');
    });

    it('should preserve custom metadata fields', async () => {
      // Given (Arrange)
      const action = createTestEtbAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: {
            eventType: 'Test',
            erinnerungId: 'e1',
            customField: 'custom-value',
            nestedObject: { key: 'value' },
          },
          occurredAt: '2026-01-19T12:00:00.000Z',
        },
      });

      // When (Act)
      await queueEtbAction(action);

      // Then (Assert)
      const metadata = etbOfflineStore.state.queue[0].payload.metadata;
      expect(metadata.customField).toBe('custom-value');
      expect(metadata.nestedObject).toEqual({ key: 'value' });
    });
  });

  describe('React hooks exports', () => {
    it('should export useEtbQueueCount hook', () => {
      // Then (Assert)
      expect(typeof useEtbQueueCount).toBe('function');
    });

    it('should export useEtbLastSync hook', () => {
      // Then (Assert)
      expect(typeof useEtbLastSync).toBe('function');
    });

    it('should export useEtbOfflineStoreState hook', () => {
      // Then (Assert)
      expect(typeof useEtbOfflineStoreState).toBe('function');
    });
  });
});
