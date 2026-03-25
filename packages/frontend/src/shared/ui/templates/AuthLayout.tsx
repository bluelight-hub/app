import { ColorModeButton } from '@/shared/ui/molecules/color-mode-button.molecule';
import { BrowserSecurityBanner } from '@/features/server/ui/molecules/BrowserSecurityBanner';
import { cn } from '@/shared/ui';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout-Template für Authentifizierungs-Seiten
 *
 * Bietet:
 * - ruhige Ring-1-Einstiegsfläche mit klarer Produktidentität
 * - Color Mode Button in der oberen rechten Ecke
 * - Browser Security Banner (nur im Browser sichtbar, nicht in Tauri)
 */
export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-surface-canvas text-text-primary', className)} data-testid="auth-layout-shell">
      <div className="ring-1-auth-ambient absolute inset-0 -z-20" data-testid="auth-layout-ambient" />
      <div className="ring-1-auth-top-glow absolute inset-x-0 top-0 -z-10 h-64" data-testid="auth-layout-top-glow" />

      <BrowserSecurityBanner />

      <div className="relative flex min-h-screen flex-col">
        <header className="px-4 pt-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl justify-end">
            <ColorModeButton />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-center">{children}</div>
        </main>
      </div>
    </div>
  );
}
