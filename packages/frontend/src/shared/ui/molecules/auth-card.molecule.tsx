import type { CardProps } from '@/shared';
import { Card } from '@/shared';
import { cn } from '@/shared/ui/cn';
import type { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  showStripe?: boolean;
  padding?: CardProps['padding'];
}

/**
 * Spezielle Card-Komponente für Authentifizierungs-Seiten
 *
 * Erweitert die Standard-Card mit:
 * - Emergency Stripe Animation
 * - Overflow-hidden für saubere Rundungen
 * - Kein Border für cleanen Look
 */
export function AuthCard({ children, className, showStripe = false, padding = 'lg' }: AuthCardProps) {
  return (
    <Card
      className={cn(
        'relative animate-card-entry overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/96 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.58)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/92',
        className,
      )}
      padding={padding}
    >
      {showStripe && <div className="absolute inset-x-0 top-0 h-px animate-stripe-move bg-[length:200%_100%] bg-gradient-to-r from-transparent via-primary-500 to-transparent" />}
      <div className="relative z-10">{children}</div>
    </Card>
  );
}
