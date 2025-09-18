import { cn } from '@/utils/cn';
import { Command } from 'cmdk';
import { PiArrowRight, PiArrowUpRight, PiCaretRight } from 'react-icons/pi';
import type { NavigationCommand } from '../types';
import { commandItemClasses, getModuleColorClass } from '../utils';

interface CommandItemProps {
  command: NavigationCommand;
  onSelect: (command: NavigationCommand) => void;
}

export function CommandItem({ command, onSelect }: CommandItemProps) {
  const Icon = command.icon || PiCaretRight;

  return (
    <Command.Item value={`${command.module} ${command.name}`} onSelect={() => onSelect(command)} className={cn(commandItemClasses.base, command.destructive && commandItemClasses.destructive)}>
      {/* Icon with background */}
      <div className={cn(commandItemClasses.iconContainer, getModuleColorClass(command.moduleColor, 'bg'))}>
        <Icon className={cn('h-4 w-4', command.destructive ? 'text-red-600 dark:text-red-400' : getModuleColorClass(command.moduleColor))} />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', command.destructive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')}>{command.name}</span>
          {command.badge && <span className={commandItemClasses.badge}>{command.badge}</span>}
          {command.subCommands && command.subCommands.length > 0 && <span className="text-gray-400 text-xs dark:text-gray-500">→</span>}
          {command.external && <PiArrowUpRight className="h-3 w-3 text-gray-400" />}
        </div>
        <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">in {command.module}</p>
      </div>

      {/* Actions/Shortcuts */}
      <div className="flex items-center gap-2">
        {command.shortcut && (
          <div className="hidden items-center gap-1 sm:flex">
            {command.shortcut.map((key, idx) => (
              <kbd key={idx} className={commandItemClasses.kbd}>
                {key}
              </kbd>
            ))}
          </div>
        )}
        <PiArrowRight className="h-3.5 w-3.5 text-gray-400 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 dark:text-gray-500" />
      </div>
    </Command.Item>
  );
}
