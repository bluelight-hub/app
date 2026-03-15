import { cn } from '@/shared/ui/cn';
import { Link } from '@tanstack/react-router';
import { useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

interface ModuleButtonProps {
  to: string;
  params?: unknown;
  hotkey?: string;
  isActive: boolean;
  colorClasses: string;
  children: React.ReactNode;
  className?: string;
}

export function ModuleButton({ to, params, hotkey, colorClasses, children, className }: ModuleButtonProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Hotkey handler
  useHotkeys(
    hotkey || '',
    () => {
      if (linkRef.current) {
        linkRef.current.click();
      }
    },
    {
      enabled: !!hotkey,
      enableOnFormTags: false,
    },
  );

  const formatHotkey = (key: string) => {
    const match = key.match(/alt\+(\d)/i);
    if (match) {
      return match[1];
    }
    return key;
  };

  return (
    <Link
      ref={linkRef}
      to={to}
      // biome-ignore lint/suspicious/noExplicitAny: params should be correctly typed
      params={params as any}
      className={cn(
        'group relative flex items-center gap-2 whitespace-nowrap rounded-control border px-4 py-2 font-medium text-body-sm transition-[background-color,border-color,color,box-shadow] focus:outline-none focus-visible:shadow-focus-ring',
        colorClasses,
        className,
      )}
      title={hotkey ? `Tastenkürzel: Alt+${formatHotkey(hotkey)}` : undefined}
    >
      {children}

      {hotkey && (
        <span
          className={cn(
            'absolute top-1 right-1 rounded-pill border border-border-subtle bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-secondary opacity-0 transition-opacity group-hover:opacity-90',
          )}
        >
          ⌥{formatHotkey(hotkey)}
        </span>
      )}
    </Link>
  );
}
