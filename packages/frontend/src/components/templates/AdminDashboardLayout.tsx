import { Container } from '@/components/atoms/container.atom';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

/**
 * Layout-Template für Dashboard-Seiten
 *
 * Erweitertes Layout mit Sidebar, Navigation und aktivem Einsatz-Kontext.
 * Zeigt ETB-Navigation nur bei aktivem Einsatz.
 */
interface DashboardLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  className?: string;
}

export function AdminDashboardLayout({ children, maxWidth = '7xl', className }: DashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <Container maxWidth={maxWidth} className={cn('py-8')}>
        <div className="flex gap-8">
          <main className="min-w-0 flex-1">
            <div className="flex flex-col gap-8">{children}</div>
          </main>
        </div>
      </Container>
    </div>
  );
}
