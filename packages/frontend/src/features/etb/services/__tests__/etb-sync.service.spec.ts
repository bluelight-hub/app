/**
 * Unit Tests fuer ETB Sync Service
 *
 * **Story 5.10 AC2, AC3:**
 * - Chronologische Sync-Verarbeitung
 * - Max 3 Retry-Versuche bei Fehlern
 * - Timestamp Preservation (occurredAt)
 * - Network-Error Handling
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { EtbSyncService } from '../etb-sync.service';
import type { EtbQueueAction } from '../../stores/offline.store';

// ============================================
// Mocks
// ============================================

vi.mock('../../stores/offline.store', () => ({
  getQueuedActions: vi.fn(() => []),
  removeFromQueue: vi.fn().mockResolvedValue(undefined),
  updateRetryCount: vi.fn().mockResolvedValue(undefined),
  setEtbLastSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/reminders/services/offline-detection.service', () => ({
  offlineDetectionService: {
    isOffline: vi.fn(() => false),
  },
}));

const mockEtbApi = {
  etbCqrsControllerAddEintragVAlpha: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/shared', () => ({
  api: {
    etb: () => mockEtbApi,
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================
// Imports nach Mocks
// ============================================

import { getQueuedActions, removeFromQueue, updateRetryCount, setEtbLastSync } from '../../stores/offline.store';
import { offlineDetectionService } from '@/features/reminders/services/offline-detection.service';

// ============================================
// Test Factory
// ============================================

function createTestAction(overrides: Partial<EtbQueueAction> = {}): EtbQueueAction {
  return {
    id: 'action-1',
    actionType: 'addEintrag',
    payload: {
      text: "Erinnerung 'Test' bestaetigt von User",
      kategorie: 'SYSTEM',
      metadata: {
        eventType: 'ErinnerungAcknowledged',
        erinnerungId: 'erinnerung-1',
      },
      occurredAt: '2026-01-19T12:30:00.000Z',
    },
    einsatzId: 'einsatz-1',
    timestamp: '2026-01-19T12:35:00.000Z',
    retryCount: 0,
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('EtbSyncService', () => {
  let service: EtbSyncService;

  beforeEach(() => {
    service = new EtbSyncService();
    vi.clearAllMocks();
    (offlineDetectionService.isOffline as Mock).mockReturnValue(false);
    (getQueuedActions as Mock).mockReturnValue([]);
    mockEtbApi.etbCqrsControllerAddEintragVAlpha.mockResolvedValue(undefined);
  });

  describe('syncAll()', () => {
    it('should return 0 when offline', async () => {
      // Given
      (offlineDetectionService.isOffline as Mock).mockReturnValue(true);

      // When
      const result = await service.syncAll();

      // Then
      expect(result).toBe(0);
      expect(getQueuedActions).not.toHaveBeenCalled();
    });

    it('should return 0 when queue is empty', async () => {
      // Given
      (getQueuedActions as Mock).mockReturnValue([]);

      // When
      const result = await service.syncAll();

      // Then
      expect(result).toBe(0);
    });

    it('should process actions and return success count', async () => {
      // Given
      const action1 = createTestAction({ id: 'action-1', timestamp: '2026-01-19T12:00:00.000Z' });
      const action2 = createTestAction({ id: 'action-2', timestamp: '2026-01-19T13:00:00.000Z' });
      (getQueuedActions as Mock).mockReturnValue([action1, action2]);

      // When
      const result = await service.syncAll();

      // Then
      expect(result).toBe(2);
      expect(removeFromQueue).toHaveBeenCalledWith('action-1');
      expect(removeFromQueue).toHaveBeenCalledWith('action-2');
      expect(setEtbLastSync).toHaveBeenCalled();
    });

    it('should continue processing after individual action failure', async () => {
      // Given
      const action1 = createTestAction({ id: 'action-1' });
      const action2 = createTestAction({ id: 'action-2' });
      (getQueuedActions as Mock).mockReturnValue([action1, action2]);

      // Erster Call schlaegt fehl, zweiter gelingt
      mockEtbApi.etbCqrsControllerAddEintragVAlpha.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce(undefined);

      // When
      const result = await service.syncAll();

      // Then: 1 erfolgreich, 1 fehlgeschlagen
      expect(result).toBe(1);
      expect(updateRetryCount).toHaveBeenCalledWith('action-1', 1);
      expect(removeFromQueue).toHaveBeenCalledWith('action-2');
    });

    it('should break sync loop on network error', async () => {
      // Given
      const action1 = createTestAction({ id: 'action-1' });
      const action2 = createTestAction({ id: 'action-2' });
      (getQueuedActions as Mock).mockReturnValue([action1, action2]);

      mockEtbApi.etbCqrsControllerAddEintragVAlpha.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // When
      const result = await service.syncAll();

      // Then: Abbruch nach Network-Error, action-2 nicht versucht
      expect(result).toBe(0);
      expect(mockEtbApi.etbCqrsControllerAddEintragVAlpha).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeAction()', () => {
    it('should execute addEintrag action and remove from queue', async () => {
      // Given
      const action = createTestAction();

      // When
      await service.executeAction(action);

      // Then
      expect(mockEtbApi.etbCqrsControllerAddEintragVAlpha).toHaveBeenCalledWith({
        etbId: 'einsatz-1',
        addEintragDto: {
          text: "Erinnerung 'Test' bestaetigt von User",
          kategorie: 'SYSTEM',
          einsatzId: 'einsatz-1',
          metadata: {
            eventType: 'ErinnerungAcknowledged',
            erinnerungId: 'erinnerung-1',
          },
          occurredAt: '2026-01-19T12:30:00.000Z',
        },
      });
      expect(removeFromQueue).toHaveBeenCalledWith('action-1');
    });

    it('should skip action when max retry count exceeded', async () => {
      // Given
      const action = createTestAction({ retryCount: 3 });

      // When / Then
      await expect(service.executeAction(action)).rejects.toThrow('Max retry count exceeded');
      expect(mockEtbApi.etbCqrsControllerAddEintragVAlpha).not.toHaveBeenCalled();
    });

    it('should increment retry count on failure', async () => {
      // Given
      const action = createTestAction({ retryCount: 1 });
      mockEtbApi.etbCqrsControllerAddEintragVAlpha.mockRejectedValueOnce(new Error('API error'));

      // When / Then
      await expect(service.executeAction(action)).rejects.toThrow();
      expect(updateRetryCount).toHaveBeenCalledWith('action-1', 2);
    });

    it('should throw on unknown action type', async () => {
      // Given
      const action = createTestAction({ actionType: 'unknown' as never });

      // When / Then
      await expect(service.executeAction(action)).rejects.toThrow('Unknown action type');
    });
  });

  describe('Timestamp Preservation (AC3)', () => {
    it('should pass occurredAt to API DTO', async () => {
      // Given
      const specificTime = '2025-06-15T08:45:00.000Z';
      const action = createTestAction({
        payload: {
          text: 'Test',
          kategorie: 'SYSTEM',
          metadata: { eventType: 'ErinnerungSnoozed', erinnerungId: 'er-1' },
          occurredAt: specificTime,
        },
      });

      // When
      await service.executeAction(action);

      // Then
      expect(mockEtbApi.etbCqrsControllerAddEintragVAlpha).toHaveBeenCalledWith(
        expect.objectContaining({
          addEintragDto: expect.objectContaining({
            occurredAt: specificTime,
          }),
        }),
      );
    });
  });
});
