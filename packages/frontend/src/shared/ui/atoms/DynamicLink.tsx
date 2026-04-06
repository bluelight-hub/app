import { Link } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';

/**
 * Wrapper für TanStack Router Link bei dynamischer Route-Navigation.
 *
 * TanStack Router erwartet exakte Route-Param-Typen basierend auf dem `to`-Literal.
 * Bei dynamischen `to`-Werten (z.B. aus Workspace-Modulen) kann TypeScript die
 * Params nicht statisch verifizieren. Dieser Wrapper zentralisiert den nötigen
 * Type-Cast an einer Stelle statt `as any` über 12+ Komponenten zu verteilen.
 */
interface DynamicLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  to: string;
  params?: Record<string, string>;
  search?: (prev: Record<string, unknown>) => Record<string, unknown>;
  children: ReactNode;
}

export const DynamicLink = forwardRef<HTMLAnchorElement, DynamicLinkProps>(function DynamicLink({ to, params, search, children, ...rest }, ref) {
  return (
    // eslint-disable-next-line typescript/no-explicit-any -- Zentralisierter Cast für dynamische Route-Navigation (Issue #622)
    <Link ref={ref} to={to} params={params as any} search={search as any} {...rest}>
      {children}
    </Link>
  );
});
