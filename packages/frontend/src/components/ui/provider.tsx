import type { ColorModeProviderProps } from './color-mode';
import { ColorModeProvider } from '@/provider/color-mode.provider.tsx';

/**
 * A component that provides a color mode context to its children.
 *
 * @param {ColorModeProviderProps} props The properties for the color mode provider.
 * @return {JSX.Element} The rendered ColorModeProvider component.
 */
export function Provider(props: ColorModeProviderProps) {
  return <ColorModeProvider {...props} />;
}
