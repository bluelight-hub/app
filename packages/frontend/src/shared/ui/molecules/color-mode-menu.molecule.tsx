import type { ColorMode } from '@/shared/ui/headless/color-mode';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useColorMode } from '@/shared/hooks/use-color-mode';
import { cn } from '@/shared/ui/cn';
import { useEffect, useState } from 'react';
import { PiCaretDown, PiCheck, PiDesktop, PiMoon, PiSun } from 'react-icons/pi';

interface ColorModeOption {
  value: ColorMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface ColorModeMenuProps {
  /**
   * Vertikale Platzierung des Dropdown-Menüs
   * @default 'bottom'
   */
  placement?: 'top' | 'bottom';
  /**
   * Horizontale Ausrichtung des Dropdown-Menüs
   * @default 'right'
   */
  align?: 'left' | 'right';
}

const colorModeOptions: ColorModeOption[] = [
  {
    value: 'light',
    label: 'Hell',
    icon: PiSun,
    description: 'Helles Theme',
  },
  {
    value: 'dark',
    label: 'Dunkel',
    icon: PiMoon,
    description: 'Dunkles Theme',
  },
  {
    value: 'system',
    label: 'System',
    icon: PiDesktop,
    description: 'Systemeinstellung verwenden',
  },
];

/**
 * Color Mode Menu - Dropdown-Menü zur Auswahl des Farbmodus
 *
 * Bietet eine erweiterte UI zur Auswahl zwischen Hell-, Dunkel- und System-Modus
 * mit visueller Rückmeldung und Beschreibungen.
 *
 * @param placement - Bestimmt ob sich das Menü nach oben oder unten öffnet
 * @param align - Bestimmt die horizontale Ausrichtung des Menüs
 */
export function ColorModeMenu({ placement = 'bottom', align = 'right' }: ColorModeMenuProps) {
  const { colorMode, setColorMode, resolvedColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-32 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />;
  }

  const currentOption = colorModeOptions.find((opt) => opt.value === colorMode) || colorModeOptions[2];
  const CurrentIcon = currentOption.icon;
  const resolvedModeLabel = resolvedColorMode === 'dark' ? 'Dunkel' : 'Hell';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="lg" className="min-w-[9.5rem] justify-between gap-2 bg-white/72 backdrop-blur-sm dark:bg-slate-950/50">
          <span className="inline-flex items-center gap-2">
            <CurrentIcon className="size-4" />
            <span className="font-medium text-sm">{currentOption.label}</span>
          </span>
          <PiCaretDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={placement}
        className="w-64 rounded-2xl border-white/70 bg-white/96 p-2 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/92"
      >
        {colorModeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = colorMode === option.value;
          const description = option.value === 'system' && isSelected ? `${option.description} (${resolvedModeLabel})` : option.description;

          return (
            <DropdownMenuItem key={option.value} onSelect={() => setColorMode(option.value)} className={cn('rounded-xl px-3 py-3', isSelected && 'bg-accent/80 text-accent-foreground')}>
              <div className="flex w-full items-center gap-3">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl border bg-muted/70',
                    isSelected && 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200',
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="truncate text-muted-foreground text-xs">{description}</div>
                </div>

                <div className="flex size-4 items-center justify-center text-sky-600 dark:text-sky-300">{isSelected ? <PiCheck className="size-4" /> : null}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
