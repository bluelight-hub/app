'use client';

import { ColorModeProvider } from '@/provider/color-mode.provider.tsx';
import type { ColorModeProviderProps } from './color-mode';

/**
 * A functional component that provides color mode context to its children.
 *
 * @param {ColorModeProviderProps} props - Properties passed to configure the ColorModeProvider.
 * @return {JSX.Element} A rendered component with color mode context.
 */
export function Provider(props: ColorModeProviderProps) {
  return <ColorModeProvider {...props} />;
}
