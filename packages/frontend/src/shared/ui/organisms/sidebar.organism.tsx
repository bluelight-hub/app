import { cn } from '@/shared/ui/cn';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';

/** Einzelner Navigations-Eintrag in der Sidebar. */
export interface SidebarItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

/** Gruppe von Navigations-Einträgen mit optionaler Überschrift. */
export interface SidebarGroup {
  /** Gruppenname — undefined bedeutet keine Gruppenüberschrift. */
  group?: string;
  entries: SidebarItem[];
}

interface SidebarProps {
  items: SidebarGroup[];
  header: ReactNode;
  footer?: ReactNode;
  /** Farbvariante der Sidebar. Standard: 'dark'. */
  variant?: 'dark' | 'light';
}

interface SidebarDrawerProps extends SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Navigations-Eintrag mit aktiver Route-Erkennung.
 * Nutzt useMatchRoute() für präzises Matching.
 */
function NavItem({ item, variant }: { item: SidebarItem; variant: 'dark' | 'light' }) {
  const matchRoute = useMatchRoute();
  const isActive = !!matchRoute({ to: item.to, fuzzy: false });
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        variant === 'dark' && [isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'],
        variant === 'light' && [isActive ? 'bg-action-primary/10 text-action-primary' : 'hover:bg-surface-secondary text-text-secondary hover:text-text-primary'],
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * Wiederverwendbare Sidebar-Komponente für Admin- und App-Navigation.
 *
 * Zeigt Navigationseinträge gruppiert mit optionalen Gruppenüberschriften an.
 * Unterstützt eine dunkle und helle Farbvariante.
 *
 * @example
 * ```tsx
 * <Sidebar
 *   items={[{ group: 'Stammdaten', entries: [{ label: 'Personen', to: '/personen', icon: PiUsers }] }]}
 *   header={<Logo />}
 *   footer={<UserMenu />}
 * />
 * ```
 */
export function Sidebar({ items, header, footer, variant = 'dark' }: SidebarProps) {
  return (
    <aside className={cn('flex h-full w-60 flex-col', variant === 'dark' && 'bg-surface-sidebar text-white', variant === 'light' && 'bg-surface-primary border-r border-border-subtle')}>
      {/* Header */}
      <div className={cn('border-b px-4 py-4', variant === 'dark' ? 'border-white/10' : 'border-border-subtle')}>{header}</div>

      {/* Scrollbarer Navigationsbereich */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.map((groupItem, groupIndex) => (
          <div key={groupItem.group ?? `ungrouped-${groupIndex}`} className={cn(groupIndex > 0 && 'mt-6')}>
            {groupItem.group && <h3 className={cn('mb-2 px-3 text-xs font-semibold tracking-wider uppercase', variant === 'dark' ? 'text-white/40' : 'text-text-muted')}>{groupItem.group}</h3>}
            <ul className="space-y-1">
              {groupItem.entries.map((entry) => (
                <li key={entry.to}>
                  <NavItem item={entry} variant={variant} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer (optional) */}
      {footer && <div className={cn('border-t px-4 py-4', variant === 'dark' ? 'border-white/10' : 'border-border-subtle')}>{footer}</div>}
    </aside>
  );
}

/**
 * Mobile Drawer-Variante der Sidebar.
 *
 * Nutzt Headless UI Dialog für eine barrierefreie Slide-in-Navigation.
 * Nur auf Bildschirmen kleiner als `lg` sichtbar.
 *
 * @example
 * ```tsx
 * <SidebarDrawer
 *   items={navItems}
 *   header={<Logo />}
 *   isOpen={menuOpen}
 *   onClose={() => setMenuOpen(false)}
 * />
 * ```
 */
export function SidebarDrawer({ isOpen, onClose, ...sidebarProps }: SidebarDrawerProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 lg:hidden">
      <DialogBackdrop transition className="fixed inset-0 bg-black/50 transition-opacity duration-300 data-[closed]:opacity-0" />
      <DialogPanel transition className="fixed inset-y-0 left-0 max-w-60 transition-transform duration-300 data-[closed]:-translate-x-full">
        <Sidebar {...sidebarProps} />
      </DialogPanel>
    </Dialog>
  );
}
