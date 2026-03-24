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
    return <div className="h-9 w-32 animate-pulse rounded-control bg-surface-raised" />;
  }

  const currentOption = colorModeOptions.find((opt) => opt.value === colorMode) || colorModeOptions[2];
  const CurrentIcon = currentOption.icon;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-text-secondary',
          'hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none',
          'transition-colors duration-200',
        )}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="font-medium text-sm">{currentOption.label}</span>
        <PiCaretDown className="h-3 w-3" />
      </MenuButton>

      <MenuItems
        anchor={`${placement} ${align === 'left' ? 'start' : 'end'}` as const}
        className={cn('z-50 min-w-max rounded-panel border border-border-subtle bg-surface-panel shadow-panel [--anchor-gap:8px]', 'focus:outline-none')}
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
                      'flex w-full cursor-pointer items-center gap-4 rounded-control px-3 py-2.5',
                      'transition-all duration-150',
                      focus && 'bg-action-secondary',
                      isSelected && 'bg-action-secondary',
                    )}
                  >
                    {/* Icon Container */}
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control',
                        isSelected ? 'bg-action-secondary text-action-primary' : 'bg-surface-raised text-text-muted',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-1 flex-col items-start">
                      <span className={cn('font-medium text-sm text-text-primary')}>{option.label}</span>
                      <span className={cn('whitespace-nowrap text-xs', isSelected ? 'text-text-secondary' : 'text-text-muted')}>
                        {option.description}
                        {isSystemActive && ` (${resolvedColorMode === 'dark' ? 'Dunkel' : 'Hell'})`}
                      </span>
                    </div>

                    {/* Checkmark */}
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{isSelected && <PiCheck className="h-5 w-5 text-action-primary" />}</div>
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
