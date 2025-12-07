'use client';

import { ThemeProvider } from 'next-themes';
import type { ColorModeProviderProps } from '@/shared/ui/headless/color-mode';

/**
 * Provider-Komponente für den Color-Mode (Hell/Dunkel/System-Modus).
 *
 * Wrapper um den ThemeProvider von next-themes, der das Theming
 * für die gesamte Anwendung verwaltet. Speichert die Benutzereinstellung
 * persistent und verhindert Flackern beim Seitenwechsel.
 *
 * Standardmäßig wird 'system' als Theme verwendet, wodurch sich die App
 * automatisch an die Systemeinstellungen anpasst.
 *
 * @param props - Die Props für den ColorModeProvider
 * @param props.children - Die React-Komponenten, die vom Provider umschlossen werden
 * @param props.defaultTheme - Das Standard-Theme (default: 'system')
 * @param props.forcedTheme - Erzwingt ein bestimmtes Theme
 * @param props.enableSystem - Aktiviert die Verwendung des System-Themes (default: true)
 * @param props.storageKey - Der Schlüssel für localStorage (default: 'theme')
 * @returns Die gewrappten Komponenten mit Theme-Kontext
 */
export function ColorModeProvider(props: ColorModeProviderProps) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange {...props} />;
}
