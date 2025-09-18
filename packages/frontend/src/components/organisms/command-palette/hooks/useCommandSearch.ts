import { useMemo } from 'react';
import type { NavigationCommand, ModuleConfig } from '../types';

interface UseCommandSearchProps {
  modules: ModuleConfig[];
  search: string;
}

interface UseCommandSearchResult {
  allCommands: NavigationCommand[];
  filteredCommands: NavigationCommand[];
  commandGroups: Array<ModuleConfig & { commands: NavigationCommand[] }>;
}

export function useCommandSearch({ modules, search }: UseCommandSearchProps): UseCommandSearchResult {
  // Flatten all navigation items
  const allCommands = useMemo(
    () =>
      modules.flatMap((module) =>
        module.subPages.map((page) => ({
          id: `${module.id}-${page.name}`,
          name: page.name,
          href: page.href,
          action: page.action,
          module: module.name,
          moduleColor: module.color,
          icon: page.icon || module.icon,
          shortcut: page.shortcut,
          badge: page.badge,
          external: page.external,
          destructive: page.destructive,
          subCommands: page.subCommands,
        })),
      ),
    [modules],
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return allCommands;

    const searchLower = search.toLowerCase();
    return allCommands.filter((cmd) => cmd.name.toLowerCase().includes(searchLower) || cmd.module.toLowerCase().includes(searchLower));
  }, [allCommands, search]);

  // Group commands by module for display
  const commandGroups = useMemo(
    () =>
      modules
        .map((module) => ({
          ...module,
          commands: filteredCommands.filter((cmd) => cmd.module === module.name),
        }))
        .filter((group) => group.commands.length > 0),
    [modules, filteredCommands],
  );

  return {
    allCommands,
    filteredCommands,
    commandGroups,
  };
}
