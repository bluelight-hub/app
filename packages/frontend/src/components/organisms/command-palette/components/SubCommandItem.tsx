import { Command } from 'cmdk';
import { PiCaretRight } from 'react-icons/pi';
import type { SubCommand } from '../types';
import { commandItemClasses } from '../utils';

interface SubCommandItemProps {
  subCommand: SubCommand;
  onSelect: (subCommand: SubCommand) => void;
  currentValue?: unknown;
}

export function SubCommandItem({ subCommand, onSelect, currentValue }: SubCommandItemProps) {
  const SubIcon = subCommand.icon || PiCaretRight;
  const isSelected = subCommand.value === currentValue;

  return (
    <Command.Item value={subCommand.name} onSelect={() => onSelect(subCommand)} className={commandItemClasses.base}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
        <SubIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">{subCommand.name}</div>
        {subCommand.description && <div className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">{subCommand.description}</div>}
      </div>
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
        </div>
      )}
    </Command.Item>
  );
}
