import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks für Tauri-Event-API und Logger — vi.hoisted, damit die Referenzen
// im hoisted vi.mock-Factory bereits definiert sind (sonst TDZ-Bug).
const { emitMock, listenMock } = vi.hoisted(() => ({
  emitMock: vi.fn(),
  listenMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emit: emitMock,
  listen: listenMock,
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

/**
 * Hilfsfunktion zum Importieren des Moduls mit frischem Zustand
 * (z. B. um den gecachten `browserSender` zurückzusetzen).
 */
async function importFresh() {
  vi.resetModules();
  return await import('../cross-window-sync');
}

/**
 * Setzt das `__TAURI_INTERNALS__`-Flag auf dem window-Objekt,
 * damit `isTauriRuntime()` `true` zurückgibt.
 */
function enableTauriRuntime() {
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    value: {},
    configurable: true,
    writable: true,
  });
}

/**
 * Entfernt das `__TAURI_INTERNALS__`-Flag wieder.
 */
function disableTauriRuntime() {
  if ('__TAURI_INTERNALS__' in window) {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  }
}

/**
 * Wartet, bis alle ausstehenden Microtasks (insbesondere dynamische Imports
 * und Promise-Ketten) verarbeitet sind.
 */
async function flushMicrotasks(iterations = 30): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

describe('cross-window-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disableTauriRuntime();
  });

  afterEach(() => {
    disableTauriRuntime();
    vi.unstubAllGlobals();
  });

  describe('broadcastInvalidation — Browser-Pfad', () => {
    it('postet die Nachricht auf dem BroadcastChannel "bluelight-hub.sync"', async () => {
      // Given: Empfänger-Channel auf gleichem Namen mit Handler
      const { broadcastInvalidation } = await importFresh();
      const receiver = new BroadcastChannel('bluelight-hub.sync');
      const received: unknown[] = [];
      receiver.addEventListener('message', (event: MessageEvent) => {
        received.push(event.data);
      });

      // When
      broadcastInvalidation('admin.users');

      // Dann: Nachricht erreicht den Empfänger (asynchron via Event Loop)
      await vi.waitFor(() => {
        expect(received).toEqual([{ scope: 'admin.users' }]);
      });

      receiver.close();
    });

    it('cached den Sender-Channel über mehrere Aufrufe hinweg', async () => {
      // Given: Spy auf den BroadcastChannel-Konstruktor
      const NativeBroadcastChannel = window.BroadcastChannel;
      const constructorSpy = vi.fn((name: string) => new NativeBroadcastChannel(name));
      vi.stubGlobal(
        'BroadcastChannel',
        new Proxy(NativeBroadcastChannel, {
          construct(_target, args: [string]) {
            constructorSpy(args[0]);
            return new NativeBroadcastChannel(...args);
          },
        }),
      );

      const { broadcastInvalidation } = await importFresh();

      // When: zweimal broadcasten
      broadcastInvalidation('admin.users');
      broadcastInvalidation('admin.users');

      // Dann: BroadcastChannel wird nur einmal konstruiert (Sender gecached)
      expect(constructorSpy).toHaveBeenCalledTimes(1);
      expect(constructorSpy).toHaveBeenCalledWith('bluelight-hub.sync');
    });

    it('verschluckt postMessage-Fehler und loggt eine Warnung', async () => {
      // Given: BroadcastChannel, dessen postMessage wirft
      class ThrowingChannel {
        constructor(public name: string) {}
        postMessage() {
          throw new Error('postMessage fehlgeschlagen');
        }
        close() {}
        addEventListener() {}
        removeEventListener() {}
      }
      vi.stubGlobal('BroadcastChannel', ThrowingChannel);

      const { broadcastInvalidation } = await importFresh();
      const { logger } = await import('@/shared/lib/logger');

      // When / Then: kein Re-throw
      expect(() => broadcastInvalidation('admin.users')).not.toThrow();
      expect(logger.warn).toHaveBeenCalledWith('BroadcastChannel-Cross-Window-Broadcast fehlgeschlagen', expect.objectContaining({ scope: 'admin.users' }));
    });

    it('ist ein No-Op, wenn BroadcastChannel nicht unterstützt wird', async () => {
      // Given: BroadcastChannel nicht vorhanden
      vi.stubGlobal('BroadcastChannel', undefined);

      const { broadcastInvalidation } = await importFresh();
      const { logger } = await import('@/shared/lib/logger');

      // When / Then: kein Fehler, kein Warn-Log (weil wir nicht mal versuchen zu posten)
      expect(() => broadcastInvalidation('admin.users')).not.toThrow();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('broadcastInvalidation — Tauri-Pfad', () => {
    beforeEach(() => {
      enableTauriRuntime();
    });

    it('ruft emit("bluelight:sync", {scope}) auf und konstruiert keinen BroadcastChannel', async () => {
      // Given: emit resolved erfolgreich, BroadcastChannel-Konstruktor wird beobachtet
      const bcConstructorSpy = vi.fn();
      const NativeBroadcastChannel = window.BroadcastChannel;
      vi.stubGlobal(
        'BroadcastChannel',
        new Proxy(NativeBroadcastChannel, {
          construct(_target, args: [string]) {
            bcConstructorSpy(args[0]);
            return new NativeBroadcastChannel(...args);
          },
        }),
      );
      emitMock.mockResolvedValue(undefined);

      const { broadcastInvalidation } = await importFresh();

      // When
      broadcastInvalidation('admin.users');
      await flushMicrotasks();

      // Then
      expect(emitMock).toHaveBeenCalledTimes(1);
      expect(emitMock).toHaveBeenCalledWith('bluelight:sync', { scope: 'admin.users' });
      expect(bcConstructorSpy).not.toHaveBeenCalled();
    });

    it('loggt eine Warnung und re-throwt nicht, wenn emit rejected', async () => {
      // Given
      emitMock.mockRejectedValue(new Error('Tauri offline'));

      const { broadcastInvalidation } = await importFresh();
      const { logger } = await import('@/shared/lib/logger');

      // When
      expect(() => broadcastInvalidation('admin.users')).not.toThrow();
      await flushMicrotasks();

      // Then
      expect(logger.warn).toHaveBeenCalledWith('Tauri-Cross-Window-Broadcast fehlgeschlagen', expect.objectContaining({ scope: 'admin.users' }));
    });
  });

  describe('useCrossWindowSync — Browser-Pfad', () => {
    it('invalidiert bei gültiger Message sowohl ["admin","users"] als auch ["auth"]', async () => {
      // Given
      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useCrossWindowSync(queryClient));

      // When: eine andere Quelle postet eine Nachricht
      const sender = new BroadcastChannel('bluelight-hub.sync');
      sender.postMessage({ scope: 'admin.users' });
      sender.close();

      // Then
      await vi.waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'users'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth'] });
    });

    it('deregistriert den Listener beim Unmount', async () => {
      // Given
      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      const { unmount } = renderHook(() => useCrossWindowSync(queryClient));

      // When: unmount zuerst
      unmount();

      const sender = new BroadcastChannel('bluelight-hub.sync');
      sender.postMessage({ scope: 'admin.users' });
      sender.close();

      // Then: nach kurzer Wartezeit wurde invalidateQueries nicht aufgerufen
      await flushMicrotasks(10);
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('ignoriert ungültige Payloads', async () => {
      // Given
      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useCrossWindowSync(queryClient));

      // When: Nachricht ohne korrekte Struktur
      const sender = new BroadcastChannel('bluelight-hub.sync');
      sender.postMessage('kein objekt');
      sender.postMessage({ foo: 'bar' });
      sender.postMessage(null);
      sender.close();

      // Then
      await flushMicrotasks(10);
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('ignoriert unbekannte Scopes ohne Invalidate-Aufrufe', async () => {
      // Given
      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useCrossWindowSync(queryClient));

      // When: Nachricht mit formal gültiger Struktur, aber unbekanntem Scope
      const sender = new BroadcastChannel('bluelight-hub.sync');
      sender.postMessage({ scope: 'some.other.scope' });
      sender.close();

      // Then: `isSyncMessage` akzeptiert (scope ist string), `invalidateScope` matcht nichts
      await flushMicrotasks(10);
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('registriert keinen Listener, wenn BroadcastChannel nicht unterstützt wird', async () => {
      // Given
      vi.stubGlobal('BroadcastChannel', undefined);
      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();

      // When / Then: kein Wurf beim Mount
      expect(() => renderHook(() => useCrossWindowSync(queryClient))).not.toThrow();
    });
  });

  describe('useCrossWindowSync — Tauri-Pfad', () => {
    beforeEach(() => {
      enableTauriRuntime();
    });

    it('registriert listen("bluelight:sync", handler) und invalidiert bei Event', async () => {
      // Given
      const unlistenFn = vi.fn();
      listenMock.mockResolvedValue(unlistenFn);

      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useCrossWindowSync(queryClient));
      await flushMicrotasks();

      // Then: listen wurde mit dem richtigen Event-Namen aufgerufen
      expect(listenMock).toHaveBeenCalledWith('bluelight:sync', expect.any(Function));

      // When: simuliere ein Event
      const handler = listenMock.mock.calls[0][1] as (event: { payload: unknown }) => void;
      handler({ payload: { scope: 'admin.users' } });

      // Then: beide Invalidierungen erfolgen
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'users'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth'] });
    });

    it('ignoriert Events mit ungültiger Payload', async () => {
      // Given
      listenMock.mockResolvedValue(vi.fn());

      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useCrossWindowSync(queryClient));
      await flushMicrotasks();

      const handler = listenMock.mock.calls[0][1] as (event: { payload: unknown }) => void;
      handler({ payload: 'kein objekt' });
      handler({ payload: null });

      // Then
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('ruft beim Unmount die Unlisten-Funktion auf', async () => {
      // Given
      const unlistenFn = vi.fn();
      listenMock.mockResolvedValue(unlistenFn);

      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();

      const { unmount } = renderHook(() => useCrossWindowSync(queryClient));
      await flushMicrotasks();

      // When
      unmount();

      // Then
      expect(unlistenFn).toHaveBeenCalledTimes(1);
    });

    it('ruft Unlisten trotzdem auf, wenn unmount vor Listen-Resolve passiert', async () => {
      // Given: listen resolved erst manuell
      const unlistenFn = vi.fn();
      let resolveListen: (v: () => void) => void = () => {};
      listenMock.mockReturnValue(
        new Promise<() => void>((resolve) => {
          resolveListen = resolve;
        }),
      );

      const { useCrossWindowSync } = await importFresh();
      const queryClient = new QueryClient();

      const { unmount } = renderHook(() => useCrossWindowSync(queryClient));

      // When: unmount bevor listen resolved → setzt cancelled = true
      unmount();
      // Jetzt erst resolved listen mit der Dispose-Funktion
      resolveListen(unlistenFn);
      await flushMicrotasks();

      // Then: dispose() wurde direkt aus der Then-Kette aufgerufen, obwohl unmount schon passiert ist
      expect(unlistenFn).toHaveBeenCalledTimes(1);
    });

    it('loggt eine Warnung, wenn listen rejected', async () => {
      // Given
      listenMock.mockRejectedValue(new Error('Listen fehlgeschlagen'));

      const { useCrossWindowSync } = await importFresh();
      const { logger } = await import('@/shared/lib/logger');
      const queryClient = new QueryClient();

      // When
      renderHook(() => useCrossWindowSync(queryClient));
      await flushMicrotasks();

      // Then
      expect(logger.warn).toHaveBeenCalledWith('Tauri-Cross-Window-Listener Registrierung fehlgeschlagen', expect.objectContaining({ error: expect.any(Error) }));
    });
  });
});
