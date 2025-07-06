import { createContext } from 'react';
import { useThemeInternal } from '../hooks/useTheme';

export const ThemeContext = createContext<ReturnType<typeof useThemeInternal> | undefined>(
  undefined,
);
