import { Link } from '@tanstack/react-router';
import { PiCaretRight } from 'react-icons/pi';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumbs-Navigationskomponente
 *
 * Zeigt den aktuellen Navigationspfad als klickbare Brotkrümel-Navigation an.
 * Das letzte Item wird als aktuelle Seite markiert (aria-current="page").
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && <PiCaretRight className="h-3 w-3 flex-shrink-0" />}
              {isLast || !item.to ? (
                <span className="font-medium text-text-primary" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="transition-colors hover:text-text-primary">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
