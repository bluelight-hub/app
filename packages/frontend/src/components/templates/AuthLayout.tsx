import { ColorModeButton } from '@/components/molecules/color-mode-button.molecule';
import { cn } from '@/utils/cn';
import { useTimeBasedBackground } from '@/utils/timeBasedBackground';
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
    <div className={cn('login-background relative flex min-h-screen items-center justify-center overflow-hidden', className)}>
      {/* Background with blur effect */}
      <div className="-z-20 absolute inset-0 bg-center bg-cover bg-no-repeat blur-md" style={backgroundStyle} />

      {/* Background overlay */}
      <div className="-z-10 absolute inset-0 bg-gradient-to-br from-blue-800/80 via-blue-800/40 to-red-600/30 dark:from-blue-900/40 dark:via-blue-900/20 dark:to-red-900/15" />

      {/* Dark Mode Switch */}
      <div className="absolute top-6 right-6 z-10">
        <ColorModeButton />
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
