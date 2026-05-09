import { cn } from '@/shared/ui/cn';
import type { NavigationCommand } from '@/shared/ui/organisms/command-palette';
import { commandItemClasses, getModuleColorClass } from '@/shared/ui/organisms/command-palette/utils';
import { Command } from 'cmdk';
import { useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiArrowRight, PiArrowUpRight, PiCaretRight } from 'react-icons/pi';

interface CommandItemProps {
  command: NavigationCommand;
  onSelect: (command: NavigationCommand) => void;
  isActive?: boolean; // Track if command palette is open
}

export function CommandItem({ command, onSelect, isActive = true }: CommandItemProps) {
  const Icon = command.icon || PiCaretRight;
  const isDisabled = Boolean(command.disabled);

  // Convert shortcut array to hotkey string (e.g., ['⌘', 'K'] -> 'mod+k')
  const hotkeyString = useMemo(
    () =>
      command.shortcut
        ?.map((key) => {
          switch (key) {
            case '⌘':
            case 'Ctrl':
              return 'mod';
            case '⇧':
            case 'Shift':
              return 'shift';
            case '⌥':
            case 'Alt':
              return 'alt';
            case '↵':
            case 'Enter':
              return 'enter';
            default:
              return key.toLowerCase();
          }
        })
        .join('+'),
    [command.shortcut],
  );
  const shortcutKeys = useMemo(() => {
    const shortcutCounts = new Map<string, number>();

    return (command.shortcut ?? []).map((key) => {
      const occurrence = (shortcutCounts.get(key) ?? 0) + 1;
      shortcutCounts.set(key, occurrence);

      return {
        label: key,
        reactKey: `${command.id}-${key}-${occurrence}`,
      };
    });
  }, [command.id, command.shortcut]);

  // Register hotkey when command has a shortcut
  useHotkeys(
    hotkeyString || '',
    () => {
      onSelect(command);
    },
    {
      enabled: isActive && !!hotkeyString && !isDisabled,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
    [command, onSelect, isActive, isDisabled],
  );

  return (
    <Command.Item
      value={`${command.module} ${command.name}`}
      keywords={command.keywords}
      onSelect={isDisabled ? undefined : () => onSelect(command)}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(commandItemClasses.base, command.destructive && commandItemClasses.destructive, isDisabled && 'cursor-not-allowed opacity-60')}
    >
      {/* Icon with background */}
      <div className={cn(commandItemClasses.iconContainer, getModuleColorClass(command.moduleColor, 'bg'))}>
        <Icon className={cn('h-4 w-4', command.destructive ? 'text-status-danger-text' : getModuleColorClass(command.moduleColor))} />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', command.destructive ? 'text-status-danger-text' : 'text-text-primary')}>{command.name}</span>
          {command.badge && <span className={commandItemClasses.badge}>{command.badge}</span>}
          {isDisabled && <span className={commandItemClasses.badge}>Gesperrt</span>}
          {command.subCommands && command.subCommands.length > 0 && <span className="text-xs text-text-muted">→</span>}
          {command.external && <PiArrowUpRight className="h-3 w-3 text-text-muted" />}
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">{command.disabledReason ?? command.description ?? `in ${command.module}`}</p>
      </div>

      {/* Actions/Shortcuts */}
      <div className="flex items-center gap-2">
        {command.shortcut && (
          <div className="hidden items-center gap-1 sm:flex">
            {shortcutKeys.map((shortcut) => (
              <kbd key={shortcut.reactKey} className={commandItemClasses.kbd}>
                {shortcut.label}
              </kbd>
            ))}
          </div>
        )}
        <PiArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
      </div>
    </Command.Item>
  );
}
