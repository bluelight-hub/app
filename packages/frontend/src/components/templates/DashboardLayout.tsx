import type { ReactNode } from 'react';
import { Container } from '@/components/atoms/container.atom';
import { cn } from '@/lib/utils';

/**
 * Layout-Template für Dashboard-Seiten
 *
 * Stellt eine konsistente Struktur für alle Dashboard-Bereiche bereit
 * mit einheitlichen Abständen und Container-Einstellungen.
 */
interface DashboardLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  padding?: number;
  className?: string;
}

export function DashboardLayout({ children, maxWidth = 'lg', padding = 8, className }: DashboardLayoutProps) {
  const paddingClasses = {
    4: 'py-4',
    6: 'py-6',
    8: 'py-8',
    10: 'py-10',
    12: 'py-12',
  };

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <Container maxWidth={maxWidth} className={cn(paddingClasses[padding as keyof typeof paddingClasses] || 'py-8')}>
        <div className="flex flex-col gap-8">
          <div className="flex min-h-[32px] items-center">
            <div className="flex-1" />
          </div>

          {children}
        </div>
      </Container>
    </div>
  );
}
