import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import useMediaQuery from './useMediaQuery';

describe('useMediaQuery', () => {
    // Mock für matchMedia
    const mockMatchMedia = vi.fn();
    let originalMatchMedia: typeof window.matchMedia;
    let mockMediaQueryList: {
        matches: boolean;
        addEventListener: Mock;
        removeEventListener: Mock;
    };

    beforeEach(() => {
        // Speichere das Original matchMedia
        originalMatchMedia = window.matchMedia;

        // Mock für MediaQueryList
        mockMediaQueryList = {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Erstelle den matchMedia Mock
        mockMatchMedia.mockReturnValue(mockMediaQueryList);
        window.matchMedia = mockMatchMedia;
    });

    afterEach(() => {
        // Stelle das Original matchMedia wieder her
        window.matchMedia = originalMatchMedia;
        vi.clearAllMocks();
    });

    it('should initialize with the current media query state', () => {
        // Setze den initial match value
        mockMediaQueryList.matches = true;

        const { result } = renderHook(() => useMediaQuery('(max-width: 480px)'));

        // Der Hook sollte mit dem aktuellen Zustand initialisiert werden
        expect(result.current).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 480px)');
    });

    it('should update when the media query changes', () => {
        // Initialer Zustand: matches = false
        mockMediaQueryList.matches = false;

        const { result } = renderHook(() => useMediaQuery('(max-width: 480px)'));
        expect(result.current).toBe(false);

        // Simuliere eine Änderung der Medienabfrage
        act(() => {
            // Rufe den registrierten Event-Listener auf
            const callback = mockMediaQueryList.addEventListener.mock.calls[0][1];
            callback({ matches: true } as MediaQueryListEvent);
        });

        // Der Wert sollte aktualisiert sein
        expect(result.current).toBe(true);
    });

    it('should remove event listener on unmount', () => {
        const { unmount } = renderHook(() => useMediaQuery('(max-width: 480px)'));

        // Führe den Unmount durch
        unmount();

        // Der Event-Listener sollte entfernt worden sein
        expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
        expect(mockMediaQueryList.removeEventListener.mock.calls[0][0]).toBe('change');
    });

    it('should update when query prop changes', () => {
        mockMediaQueryList.matches = false;
        const initialQuery = '(max-width: 480px)';
        const newQuery = '(max-width: 768px)';

        // Rendere den Hook mit dem initialen Query
        const { rerender } = renderHook(
            (query) => useMediaQuery(query),
            { initialProps: initialQuery }
        );

        // Überprüfe, dass der initiale Query verwendet wurde
        expect(mockMatchMedia).toHaveBeenLastCalledWith(initialQuery);

        // Setze einen anderen Match-Wert für den neuen Query
        mockMatchMedia.mockReturnValue({
            ...mockMediaQueryList,
            matches: true
        });

        // Re-rendere mit dem neuen Query
        rerender(newQuery);

        // Überprüfe, dass der neue Query verwendet wurde
        expect(mockMatchMedia).toHaveBeenLastCalledWith(newQuery);
    });
}); 