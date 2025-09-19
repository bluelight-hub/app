import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { NavigationCommand, SubCommand } from '../types';

interface UseCommandHandlersProps {
  onOpenChange: (open: boolean) => void;
  selectCommand: (command: NavigationCommand | null) => void;
}

export const useCommandHandlers = ({ onOpenChange, selectCommand }: UseCommandHandlersProps) => {
  const navigate = useNavigate();

  const handleSelect = useCallback(
    (command: NavigationCommand | null) => {
      selectCommand(command);

      // If null, just clear selection
      if (!command) {
        return;
      }

      // If it has subcommands, they will be shown
      if (command.subCommands && command.subCommands.length > 0) {
        return;
      }

      // Execute the command
      if (command.action) {
        command.action();
      } else if (command.href) {
        navigate({ to: command.href });
      }

      onOpenChange(false);
    },
    [selectCommand, navigate, onOpenChange],
  );

  const handleSubCommand = useCallback(
    (parent: NavigationCommand, subCommand: SubCommand) => {
      if (parent.action) {
        parent.action(subCommand.value);
      }
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return {
    handleSelect,
    handleSubCommand,
  };
};
