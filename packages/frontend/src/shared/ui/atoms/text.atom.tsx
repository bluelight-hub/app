import { clsx } from 'clsx';
import { type ReactNode, memo } from 'react';

export interface TextProps {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'muted' | 'success' | 'error' | 'warning';
  className?: string;
  as?: 'p' | 'span' | 'div';
}

const SIZE_CLASSES = {
  xs: 'text-body-xs',
  sm: 'text-body-sm',
  md: 'text-body-md',
  lg: 'text-title-sm',
  xl: 'text-title-md',
};

const COLOR_CLASSES = {
  default: 'text-text-primary',
  muted: 'text-text-muted',
  success: 'text-status-success',
  error: 'text-status-danger',
  warning: 'text-status-warning',
};

/**
 * Text-Komponente für typografische Inhalte
 *
 * Bietet konsistente Text-Stile und Farben.
 */
export const Text = memo(({ children, size = 'md', color = 'default', className, as: Component = 'p' }: TextProps) => {
  return <Component className={clsx('font-sans', SIZE_CLASSES[size], COLOR_CLASSES[color], className)}>{children}</Component>;
});

Text.displayName = 'Text';
