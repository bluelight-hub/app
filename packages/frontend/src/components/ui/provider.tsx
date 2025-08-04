'use client';

import { ChakraProvider, createSystem, defaultConfig, defineConfig, defineTokens } from '@chakra-ui/react';
import type { ColorModeProviderProps } from './color-mode';
import { ColorModeProvider } from '@/provider/color-mode.provider.tsx';

const config = defineConfig({
  theme: {
    tokens: {
      colors: defineTokens.colors({
        primary: {
          '50': { value: 'var(--color-red-50)' },
          '100': { value: 'var(--color-red-100)' },
          '200': { value: 'var(--color-red-200)' },
          '300': { value: 'var(--color-red-300)' },
          '400': { value: 'var(--color-red-400)' },
          '500': { value: 'var(--color-red-500)' },
          '600': { value: 'var(--color-red-600)' },
          '700': { value: 'var(--color-red-700)' },
          '800': { value: 'var(--color-red-800)' },
          '900': { value: 'var(--color-red-900)' },
          '950': { value: 'var(--color-red-950)' },
        },
      }),
    },
    semanticTokens: {
      colors: {
        primary: defaultConfig.theme?.semanticTokens?.colors?.['red'] ?? {},
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

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
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
