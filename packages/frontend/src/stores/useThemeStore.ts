import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeState {
    dark: boolean;
    auto: boolean;
    // Für manuelle Änderungen durch den Benutzer
    setManualDark: (dark: boolean) => void;
    // Für automatische Änderungen durch das System
    setSystemDark: (dark: boolean) => void;
    setAuto: (auto: boolean) => void;
}

// Get initial system dark mode preference
const getInitialDarkMode = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeState>()(
    devtools(
        persist(
            (set) => {
                // Initialize with system preference
                const systemDark = getInitialDarkMode();

                return {
                    dark: systemDark,
                    auto: true,
                    // Manuelle Änderung durch den Benutzer
                    setManualDark: (dark) =>
                        set(() => ({
                            dark,
                            auto: false, // Automatik wird ausgeschaltet
                        })),
                    // Automatische Änderung durch das System
                    setSystemDark: (dark) =>
                        set((state) => ({
                            dark: state.auto ? dark : state.dark, // Nur ändern wenn auto aktiv
                            auto: state.auto, // Auto-Status bleibt unverändert
                        })),
                    setAuto: (auto) =>
                        set((state) => ({
                            auto,
                            dark: auto ? getInitialDarkMode() : state.dark,
                        })),
                };
            },
            {
                name: 'theme-storage',
            }
        )
    )
); 