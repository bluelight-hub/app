import { clsx } from 'clsx';
import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Label Atom Component
 *
 * Basis-Label-Komponente für Formular-Felder mit Tailwind CSS Styling
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, required, children, ...props }, ref) => {
  return (
    <label htmlFor={props.htmlFor} ref={ref} className={clsx('block font-sans text-body-sm font-medium text-text-secondary', className)} {...props}>
      {children}
      {required && <span className="ml-1 text-status-danger">*</span>}
    </label>
  );
});

Label.displayName = 'Label';
