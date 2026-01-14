import type { ColorMode } from '@/shared/ui/headless/color-mode';
import { useColorMode } from '@/shared/hooks/use-color-mode';
import { cn } from '@/shared/ui/cn';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
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

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2',
          'border border-gray-200 bg-white text-gray-700',
          'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
          'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
          'transition-colors duration-200',
        )}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="font-medium text-sm">{currentOption.label}</span>
        <PiCaretDown className="h-3 w-3" />
      </MenuButton>

      <MenuItems
        anchor={`${placement} ${align === 'left' ? 'start' : 'end'}` as const}
        className={cn(
          'z-50 min-w-max rounded-xl [--anchor-gap:8px]',
          'border border-gray-200 bg-white shadow-xl ring-1 ring-black/5',
          'dark:border-gray-700 dark:bg-gray-900 dark:ring-white/10',
          'focus:outline-none',
        )}
      >
        <div className="p-2">
          {colorModeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = colorMode === option.value;
            const isSystemActive = option.value === 'system' && isSelected;

            return (
              <MenuItem key={option.value}>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={() => setColorMode(option.value)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-4 rounded-lg px-3 py-2.5',
                      'transition-all duration-150',
                      focus && 'bg-gray-100 dark:bg-gray-800',
                      isSelected && 'bg-blue-50 dark:bg-blue-950/50',
                    )}
                  >
                    {/* Icon Container */}
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-1 flex-col items-start">
                      <span className={cn('font-medium text-sm', isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100')}>{option.label}</span>
                      <span className={cn('whitespace-nowrap text-xs', isSelected ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-gray-500 dark:text-gray-400')}>
                        {option.description}
                        {isSystemActive && ` (${resolvedColorMode === 'dark' ? 'Dunkel' : 'Hell'})`}
                      </span>
                    </div>

                    {/* Checkmark */}
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{isSelected && <PiCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}</div>
                  </button>
                )}
              </MenuItem>
            );
          })}
        </div>
      </MenuItems>
    </Menu>
  );
}
