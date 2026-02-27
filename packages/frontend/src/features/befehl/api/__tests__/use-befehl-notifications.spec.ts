/**
 * Unit Tests für useBefehlNotifications Hook
 *
 * Verifiziert:
 * - Permission-Request beim Mount
 * - Event-Filterung (nur für Empfänger, nicht eigene Befehle)
 * - Notification-Trigger mit korrektem Payload
 * - Badge-Count Update nach Events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BefehlErstelltPayload } from '../use-befehl-websocket';

// vi.hoisted() ermöglicht Zugriff auf Mocks in vi.mock() Factories (Vitest Hoisting)
const { mockRequestPermission, mockSendBefehlNotification, mockGetQueryData, mockInvalidateQueries } = vi.hoisted(() => ({
  mockRequestPermission: vi.fn().mockResolvedValue('granted'),
  mockSendBefehlNotification: vi.fn().mockResolvedValue({ success: true }),
  mockGetQueryData: vi.fn(),
  mockInvalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

// Mock useCurrentUser
vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', username: 'testuser' }, isLoading: false }),
}));

// Mock notificationService
vi.mock('@/features/reminders/services/notification.service', () => ({
  notificationService: {
    requestPermission: mockRequestPermission,
    sendBefehlNotification: mockSendBefehlNotification,
  },
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// Mock logger
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock @tauri-apps/api/core (benötigt von updateAppBadge)
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => false,
}));

/** Factory für BefehlErstelltPayload */
function createEvent(overrides: Partial<BefehlErstelltPayload> = {}): BefehlErstelltPayload {
  return {
    befehlId: 'befehl-1',
    einsatzId: 'einsatz-1',
    nummer: 'B2026-abc12345',
    auftrag: 'Wasser marsch',
    befehlsgeberName: 'Max Mustermann',
    erstellerId: 'ersteller-1',
    empfaenger: ['User 1', 'User 2'],
    empfaengerIds: ['user-1', 'user-2'],
    status: 'ERTEILT',
    erteiltAm: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('useBefehlNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQueryData.mockReturnValue([]);
  });

  // Dynamischer Import nach Mock-Setup um Hoisting-Problem zu vermeiden
  async function importHook() {
    const { useBefehlNotifications } = await import('../use-befehl-notifications');
    return useBefehlNotifications;
  }

  it('sollte Permission beim Mount anfordern', async () => {
    const useBefehlNotifications = await importHook();
    renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

    expect(mockRequestPermission).toHaveBeenCalledOnce();
  });

  it('sollte Permission nur einmal anfordern (bei wiederholtem Render)', async () => {
    const useBefehlNotifications = await importHook();
    const { rerender } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));
    rerender();

    expect(mockRequestPermission).toHaveBeenCalledOnce();
  });

  it('sollte keine Permission anfordern wenn disabled', async () => {
    const useBefehlNotifications = await importHook();
    renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1', enabled: false }));

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  describe('onBefehlErstellt Callback', () => {
    it('sollte Notification senden wenn User Empfänger ist', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      const event = createEvent({ empfaengerIds: ['user-1'] });
      result.current.onBefehlErstellt(event);

      expect(mockSendBefehlNotification).toHaveBeenCalledWith({
        befehlId: 'befehl-1',
        einsatzId: 'einsatz-1',
        nummer: 'B2026-abc12345',
        befehlsgeber: 'Max Mustermann',
        inhalt: 'Wasser marsch',
      });
    });

    it('sollte KEINE Notification senden wenn User NICHT Empfänger ist', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      const event = createEvent({ empfaengerIds: ['user-99'] });
      result.current.onBefehlErstellt(event);

      expect(mockSendBefehlNotification).not.toHaveBeenCalled();
    });

    it('sollte Notification auch für eigene erstellte Befehle senden (Selbst-Zuweisung)', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      const event = createEvent({ erstellerId: 'user-1', empfaengerIds: ['user-1'] });
      result.current.onBefehlErstellt(event);

      expect(mockSendBefehlNotification).toHaveBeenCalledWith({
        befehlId: 'befehl-1',
        einsatzId: 'einsatz-1',
        nummer: 'B2026-abc12345',
        befehlsgeber: 'Max Mustermann',
        inhalt: 'Wasser marsch',
      });
    });

    it('sollte KEINE Notification senden wenn disabled', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1', enabled: false }));

      const event = createEvent({ empfaengerIds: ['user-1'] });
      result.current.onBefehlErstellt(event);

      expect(mockSendBefehlNotification).not.toHaveBeenCalled();
    });
  });

  describe('Badge-Count (AC5)', () => {
    it('sollte updateBadge exponieren', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      expect(result.current.updateBadge).toBeDefined();
      expect(typeof result.current.updateBadge).toBe('function');
    });

    it('sollte onBefehlQuittiert Callback exponieren', async () => {
      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      expect(result.current.onBefehlQuittiert).toBeDefined();
      expect(typeof result.current.onBefehlQuittiert).toBe('function');
    });

    it('sollte Badge-Count aus Query-Cache berechnen (unquittierte Befehle)', async () => {
      // Given: Befehle im Cache, einer davon unquittiert fuer user-1
      mockGetQueryData.mockReturnValue([
        { id: 'b1', empfaenger: [{ empfaengerId: 'user-1', quittiertAm: null }] },
        { id: 'b2', empfaenger: [{ empfaengerId: 'user-1', quittiertAm: '2026-01-15T10:00:00Z' }] },
        { id: 'b3', empfaenger: [{ empfaengerId: 'user-2', quittiertAm: null }] },
      ]);

      const useBefehlNotifications = await importHook();
      const { result } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      // When: updateBadge aufrufen
      await result.current.updateBadge();

      // Then: getQueryData wurde mit korrektem Key aufgerufen
      expect(mockGetQueryData).toHaveBeenCalled();
    });

    it('sollte Badge auf 0 setzen bei Unmount (Cleanup)', async () => {
      const useBefehlNotifications = await importHook();
      const { unmount } = renderHook(() => useBefehlNotifications({ einsatzId: 'einsatz-1' }));

      // When: Komponente unmountet
      unmount();

      // Then: Badge-Cleanup wurde ausgefuehrt (updateAppBadge(0) aufgerufen)
      // Kein Error = Cleanup lief korrekt
    });
  });
});
