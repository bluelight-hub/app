import { ThemeProvider } from 'next-themes';
import * as React from 'react';
import { ColorModeProviderProps } from '@/components/ui/color-mode.tsx';

export function ColorModeProvider(props: ColorModeProviderProps) {
  return <ThemeProvider attribute="class" disableTransitionOnChange {...props} />;
}
