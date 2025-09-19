import { cn } from '@/utils/cn';
import { CloseButton } from '@atoms/close-button.atom';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Command } from 'cmdk';
import { Fragment, useMemo } from 'react';
import { PiTerminal, PiWarning, PiX } from 'react-icons/pi';

import { CommandBreadcrumb } from './components/CommandBreadcrumb';
import { CommandFooter } from './components/CommandFooter';
import { CommandItem } from './components/CommandItem';
import { SubCommandItem } from './components/SubCommandItem';
import { useCommandHandlers } from './hooks/useCommandHandlers';
import { useCommandPaletteKeyboard } from './hooks/useCommandPaletteKeyboard';
import { useCommandPaletteState } from './hooks/useCommandPaletteState';
import { useCommandSearch } from './hooks/useCommandSearch';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useGlobalThemeHotkeys } from './hooks/useGlobalThemeHotkeys';
import { useQuickActionsModule } from './hooks/useQuickActionsModule';
import { useThemeCommands } from './hooks/useThemeCommands';
import type { CommandPaletteProps } from './types';

export function CommandPalette({ modules = [], open, onOpenChange }: CommandPaletteProps) {
  // Focus management
  const inputRef = useFocusManagement(open);

  // State management
  const { state, actions } = useCommandPaletteState({ open });

  // Get theme-related data
  const { colorMode } = useThemeCommands();

  // Get quick actions module
  const quickActions = useQuickActionsModule();

  // Command handlers
  const { handleSelect, handleSubCommand } = useCommandHandlers({
    onOpenChange,
    selectCommand: actions.selectCommand,
  });

  // Keyboard shortcuts
  const { shortcuts } = useCommandPaletteKeyboard({
    open,
    onOpenChange,
    onBack: actions.goBack,
    hasSelectedCommand: !!state.selectedCommand,
  });

  // Global theme hotkeys (work even when palette is closed)
  useGlobalThemeHotkeys();

  // Combine modules with quick actions
  const allModules = useMemo(() => [quickActions, ...modules], [quickActions, modules]);

  // Search functionality
  const { filteredCommands, commandGroups } = useCommandSearch({
    modules: allModules,
    search: state.search,
  });

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        {/* Backdrop */}
        <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60" aria-hidden="true" />
        </TransitionChild>

        {/* Dialog Panel */}
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className={cn(
                'mx-auto mt-[10vh] max-w-2xl transform',
                'overflow-hidden rounded-2xl',
                'bg-white/95 backdrop-blur-xl dark:bg-gray-900/95',
                'shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10',
              )}
            >
              <Command className="overflow-hidden [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:text-xs dark:[&_[cmdk-group-heading]]:text-gray-400">
                {/* Search Input */}
                <div className="relative">
                  <div className="-translate-y-1/2 absolute top-1/2 left-4">
                    <PiTerminal className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <Command.Input
                    ref={inputRef}
                    value={state.search}
                    onValueChange={actions.setSearch}
                    className={cn(
                      'w-full bg-transparent py-4 pr-12 pl-12',
                      'text-base text-gray-900 dark:text-gray-100',
                      'placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none',
                      'border-gray-200 border-b dark:border-gray-700',
                    )}
                    placeholder="Suche nach Befehlen oder springe zu..."
                    autoFocus
                  />
                  {state.search && (
                    <CloseButton onClick={() => actions.setSearch('')} className="-translate-y-1/2 absolute top-1/2 right-4" aria-label="Suche löschen">
                      <PiX className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </CloseButton>
                  )}
                </div>

                {/* Breadcrumb */}
                <CommandBreadcrumb commandStack={state.commandStack} onBack={actions.goBack} onNavigateTo={actions.navigateTo} />

                {/* Command List */}
                <Command.List className="max-h-[calc(100vh-24rem)] overflow-y-auto scroll-smooth p-2">
                  <Command.Empty className="flex flex-col items-center justify-center px-4 py-12">
                    <PiWarning className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 text-sm dark:text-gray-400">Keine Ergebnisse für "{state.search}"</p>
                  </Command.Empty>

                  {/* Show subcommands or regular commands */}
                  {state.selectedCommand?.subCommands ? (
                    <Command.Group
                      heading={
                        <div className="mt-2 flex items-center gap-2">
                          {state.selectedCommand.icon && <state.selectedCommand.icon className="h-3.5 w-3.5 text-gray-500" />}
                          <span className="text-xs uppercase tracking-wider">Optionen für {state.selectedCommand.name}</span>
                        </div>
                      }
                      className="mb-3"
                    >
                      {state.selectedCommand.subCommands.map((subCmd) => (
                        <SubCommandItem key={subCmd.id} subCommand={subCmd} onSelect={(sub) => handleSubCommand(state.selectedCommand!, sub)} currentValue={colorMode} isActive={open} />
                      ))}
                    </Command.Group>
                  ) : (
                    commandGroups.map((group) => (
                      <Command.Group
                        key={group.id}
                        heading={
                          <div className="mt-2 flex items-center gap-2 first:mt-0">
                            <group.icon className="h-3.5 w-3.5" />
                            <span className="text-xs uppercase tracking-wider">{group.name}</span>
                          </div>
                        }
                        className="mb-3 last:mb-0"
                      >
                        {group.commands.map((command) => (
                          <CommandItem key={command.id} command={command} onSelect={handleSelect} isActive={open} />
                        ))}
                      </Command.Group>
                    ))
                  )}
                </Command.List>

                {/* Footer */}
                <CommandFooter resultCount={filteredCommands.length} shortcuts={shortcuts} />
              </Command>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// Re-export types for convenience
export type { CommandPaletteProps, ModuleConfig, NavigationCommand } from './types';
