import { useMemo } from 'react';
import type { ModuleConfig, NavigationCommand } from '../types';

interface UseCommandSearchProps {
  modules: ModuleConfig[];
  search: string;
}

interface UseCommandSearchResult {
  allCommands: NavigationCommand[];
  filteredCommands: NavigationCommand[];
  commandGroups: Array<ModuleConfig & { commands: NavigationCommand[] }>;
}

/**
 * Generates a stable, deterministic slug from a string.
 * Converts to lowercase, replaces spaces with hyphens, and removes unsafe characters.
 */
function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove unsafe characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

/**
 * Generates a stable ID for a page command.
 * Priority: page.id > page.slug > generated slug from href > generated slug from name
 */
function generatePageId(page: { id?: string; slug?: string; href?: string; name: string }): string {
  if (page.id) return page.id;
  if (page.slug) return page.slug;
  if (page.href) {
    // Generate slug from href by taking the last path segment
    const pathSegments = page.href.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    if (lastSegment) return generateSlug(lastSegment);
  }
  // Fallback to generating slug from name
  return generateSlug(page.name);
}

/**
 * Hook für die Command-Suche in der Command Palette.
 *
 * Verarbeitet Module und Suchbegriff, um gefilterte Befehle
 * und gruppierte Darstellung zu erzeugen.
 *
 * @param props - Die Suchparameter
 * @param props.modules - Array von Modul-Konfigurationen
 * @param props.search - Aktueller Suchbegriff
 * @returns Alle Befehle, gefilterte Befehle und gruppierte Befehle
 *
 * @example
 * ```tsx
 * const { filteredCommands, commandGroups } = useCommandSearch({
 *   modules: moduleConfigs,
 *   search: searchTerm
 * });
 * ```
 */
export function useCommandSearch({ modules, search }: UseCommandSearchProps): UseCommandSearchResult {
  // Flatten all navigation items
  const allCommands = useMemo(
    () =>
      modules.flatMap((module) =>
        module.subPages.map((page) => {
          const pageId = generatePageId(page);
          return {
            id: `${module.id}-${pageId}`,
            name: page.name,
            href: page.href,
            action: page.action,
            module: module.name,
            moduleColor: module.color,
            icon: page.icon || module.icon,
            shortcut: page.shortcut,
            badge: page.badge,
            description: page.description,
            disabled: page.disabled,
            disabledReason: page.disabledReason,
            external: page.external,
            destructive: page.destructive,
            subCommands: page.subCommands,
          };
        }),
      ),
    [modules],
  );

  // Pre-compute lowercase versions for better performance with large lists
  const commandsWithLowerCase = useMemo(
    () =>
      allCommands.map((cmd) => ({
        ...cmd,
        nameLower: cmd.name.toLowerCase(),
        moduleLower: cmd.module.toLowerCase(),
      })),
    [allCommands],
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return allCommands;

    const searchLower = search.toLowerCase();
    // Use pre-computed lowercase values to avoid repeated toLowerCase() calls
    return commandsWithLowerCase
      .filter((cmd) => cmd.nameLower.includes(searchLower) || cmd.moduleLower.includes(searchLower))
      .map(({ nameLower: _nameLower, moduleLower: _moduleLower, ...originalCmd }) => originalCmd);
  }, [allCommands, commandsWithLowerCase, search]);

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
