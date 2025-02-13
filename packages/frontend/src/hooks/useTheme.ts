import { useCallback, useContext, useEffect, useMemo } from 'react';
import { ThemeContext } from '../providers/ThemeContext';
import { useThemeStore } from '../stores/useThemeStore';

export type Theme = 'light' | 'dark';

/**
 * Hook zum Zugriff auf den Theme-Context
 * @throws {Error} Wenn der Hook außerhalb eines ThemeProviders verwendet wird
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme muss innerhalb eines ThemeProviders verwendet werden');
    }
    return context;
}

/**
 * Interner Hook für die Theme-Logik
 * Verwaltet den Theme-Zustand und die System-Theme-Synchronisation
 */
export function useThemeInternal() {
    const { dark, auto, setManualDark, setSystemDark, setAuto } = useThemeStore();

    // Callback für Änderungen des System-Themes
    const handleColorSchemeChange = useCallback(
        (e: MediaQueryListEvent | MediaQueryList) => {
            setSystemDark(e.matches);
        },
        [setSystemDark]
    );

    // Initialisierung und Cleanup des System-Theme-Listeners
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Initial-Check
        handleColorSchemeChange(mediaQuery);

        // Event-Listener für Änderungen
        mediaQuery.addEventListener('change', handleColorSchemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleColorSchemeChange);
        };
    }, [handleColorSchemeChange]);

    // Synchronisiere das Theme mit dem HTML-Element
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);

        // Optional: Setze auch das Meta-Theme für mobile Geräte
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', dark ? '#0f0f17' : '#ffffff');
        }
    }, [dark]);

    // Theme-Toggle Funktion
    const toggleTheme = useCallback(() => {
        setManualDark(!dark);
    }, [dark, setManualDark]);

    // Memoisierte Rückgabewerte
    return useMemo(
        () => ({
            theme: dark ? 'dark' : ('light' as Theme),
            isDark: dark,
            isAuto: auto,
            setIsDark: setManualDark, // Benutze die manuelle Methode für UI-Interaktionen
            setAutoTheme: setAuto,
            toggleTheme,
        }),
        [dark, auto, setManualDark, setAuto, toggleTheme]
    );
} 