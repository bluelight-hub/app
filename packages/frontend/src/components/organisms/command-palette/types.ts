import type { ColorMode } from '@/shared/ui/headless/color-mode';
import type { FileRoutesByFullPath } from '@/routeTree.gen';
import type { ComponentType } from 'react';

export interface SubCommand {
  id: string;
  name: string;
  value?: unknown;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
  shortcut?: string[];
}

export type CommandAction = (value?: unknown) => void | Promise<void>;

export interface NavigationCommand {
  id: string;
  name: string;
  href?: keyof FileRoutesByFullPath | string;
  action?: CommandAction;
  module: string;
  moduleColor: ModuleColor;
  icon?: ComponentType<{ className?: string }>;
  shortcut?: string[];
  badge?: string;
  external?: boolean;
  destructive?: boolean;
  subCommands?: SubCommand[];
}

export interface ModuleSubPage {
  id?: string; // Optional stable identifier for the page
  slug?: string; // Optional URL slug for the page
  name: string;
  href?: string;
  action?: CommandAction;
  icon?: ComponentType<{ className?: string }>;
  shortcut?: string[];
  badge?: string;
  external?: boolean;
  destructive?: boolean;
  subCommands?: SubCommand[];
}

export interface ModuleConfig {
  id: string;
  name: string;
  color: ModuleColor;
  icon: ComponentType<{ className?: string }>;
  subPages: ModuleSubPage[];
}

export interface CommandPaletteProps {
  modules?: ModuleConfig[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ModuleColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'emerald' | 'cyan' | 'violet' | 'primary' | 'secondary';

export interface CommandPaletteState {
  search: string;
  selectedIndex: number;
  selectedCommand: NavigationCommand | null;
  commandStack: NavigationCommand[];
}

export type CommandPaletteAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_SELECTED_INDEX'; payload: number }
  | { type: 'SELECT_COMMAND'; payload: NavigationCommand }
  | { type: 'PUSH_COMMAND'; payload: NavigationCommand }
  | { type: 'POP_COMMAND' }
  | { type: 'NAVIGATE_TO'; payload: number }
  | { type: 'RESET' };

export interface ThemeOption extends SubCommand {
  value: ColorMode;
}
