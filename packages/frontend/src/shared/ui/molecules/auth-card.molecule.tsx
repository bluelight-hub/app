import { Card } from '../atoms/card.atom';
import { cn } from '@/shared/ui/cn';
import type { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  showStripe?: boolean;
}

/**
 * Spezielle Card-Komponente für Authentifizierungs-Seiten
 *
 * Erweitert die Standard-Card mit:
 * - Emergency Stripe Animation
 * - Overflow-hidden für saubere Rundungen
 * - Kein Border für cleanen Look
 */
export function AuthCard({ children, className, showStripe = true }: AuthCardProps) {
  return (
    <Card className={cn('animate-card-entry relative overflow-hidden border-0', className)} padding="lg">
      {showStripe && <div className="animate-stripe-move absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-status-danger-text via-action-primary to-status-danger-text bg-[length:200%_100%]" />}
      {children}
    </Card>
  );
}
