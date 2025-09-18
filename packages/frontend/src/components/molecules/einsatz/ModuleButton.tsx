import { cn } from '@/utils/cn';
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
      className={cn('group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-medium text-sm transition-all', colorClasses, className)}
      title={hotkey ? `Tastenkürzel: Alt+${formatHotkey(hotkey)}` : undefined}
    >
      {children}

      {hotkey && (
        <span className={cn('absolute top-1 right-1 rounded bg-black/10 px-1 font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-40 dark:bg-white/10')}>
          ⌥{formatHotkey(hotkey)}
        </span>
      )}
    </Link>
  );
}
