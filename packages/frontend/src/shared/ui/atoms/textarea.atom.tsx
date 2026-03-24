import { forwardRef, memo, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error';
  textareaSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const BASE_STYLES =
  'block w-full rounded-control border bg-surface-panel font-medium text-text-primary transition-colors duration-200 placeholder:text-text-muted focus:border-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none';

const VARIANTS = {
  default: 'border-border-subtle hover:border-border-strong',
  error: 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm min-h-[80px]',
  md: 'px-3 py-1.5 text-sm min-h-[100px]',
  lg: 'px-3 py-2 text-sm min-h-[120px]',
};

/**
 * Textarea Atom Component
 *
 * Optimized with static config and React.memo to prevent unnecessary re-renders.
 */
export const Textarea = memo(
  forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, variant = 'default', textareaSize = 'md', fullWidth = false, ...props }, ref) => {
    const textareaClasses = cn(BASE_STYLES, VARIANTS[variant], SIZES[textareaSize], fullWidth && 'w-full', className);

    return <textarea ref={ref} className={textareaClasses} {...props} />;
  }),
);

Textarea.displayName = 'Textarea';
