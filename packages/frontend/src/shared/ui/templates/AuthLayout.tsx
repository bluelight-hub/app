import { BrowserSecurityBanner } from '@/features/server/ui/molecules/BrowserSecurityBanner';
import { cn, useTimeBasedBackground } from '@/shared/ui';
import { ColorModeButton } from '@/shared/ui/molecules/color-mode-button.molecule';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout-Template für Authentifizierungs-Seiten
 *
 * Bietet:
 * - Zeitbasiertes Hintergrundbild mit Blur-Effekt
 * - Gradient Overlay
 * - Color Mode Button in der oberen rechten Ecke
 * - Zentriertes Layout für Auth-Cards
 * - Browser Security Banner (nur im Browser sichtbar, nicht in Tauri)
 */
export function AuthLayout({ children, className }: AuthLayoutProps) {
  const backgroundImage = useTimeBasedBackground();

  // Add class to HTML element for login pages
  useEffect(() => {
    document.documentElement.classList.add('has-background-image');
    return () => {
      document.documentElement.classList.remove('has-background-image');
    };
  }, []);

  const backgroundStyle = backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined;

  return (
    <div className={cn('auth-theme login-background relative min-h-screen overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50', className)}>
      <div className="absolute inset-0 -z-30 bg-slate-100 dark:bg-slate-950" />
      <div className="absolute inset-0 -z-20 bg-center bg-cover bg-no-repeat opacity-8 blur-[1px] dark:opacity-12" style={backgroundStyle} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.98))] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.98))]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-sky-400/40 dark:bg-sky-300/20" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 pt-4 sm:px-6 lg:px-8">
          <ColorModeButton />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
          <BrowserSecurityBanner className="mx-auto max-w-5xl" />
        </div>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
