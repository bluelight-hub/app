'use client';

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { type ColorModeProviderProps } from './color-mode';
import { ColorModeProvider } from '@/provider/color-mode.provider.tsx';

/**
 * Haupt-Provider-Komponente für die Anwendung.
 *
 * Kombiniert den ChakraProvider für UI-Komponenten mit dem ColorModeProvider
 * für Theme-Management. Diese Komponente sollte die gesamte Anwendung umschließen,
 * um Zugriff auf das Chakra UI Design-System und Theme-Funktionalität zu gewährleisten.
 *
 * @param props - Die Props für den Provider
 * @param props.children - Die React-Komponenten, die vom Provider umschlossen werden
 * @param props.defaultTheme - Das Standard-Theme (default: 'system')
 * @param props.forcedTheme - Erzwingt ein bestimmtes Theme
 * @param props.enableSystem - Aktiviert die Verwendung des System-Themes
 * @param props.storageKey - Der Schlüssel für localStorage (default: 'theme')
 * @returns Die gewrappten Komponenten mit Chakra UI und Theme-Kontext
 */
export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
