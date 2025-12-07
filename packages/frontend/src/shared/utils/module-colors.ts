import type { ModuleColor } from '@/components/organisms/command-palette';

export const getModuleColor = (color: ModuleColor): string => {
  const colors: Record<ModuleColor, string> = {
    blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
    purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 dark:hover:bg-purple-900/50',
    green: 'text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50',
    orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 dark:hover:bg-orange-900/50',
    red: 'text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50',
    emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50',
    cyan: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50',
    violet: 'text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30 dark:hover:bg-violet-900/50',
    primary: 'text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/30 dark:hover:bg-primary-900/50',
    secondary: 'text-gray-600 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 dark:hover:bg-gray-900/50',
  };
  return colors[color] || colors.blue;
};

export const getModuleActiveColor = (color: ModuleColor): string => {
  const colors: Record<ModuleColor, string> = {
    blue: 'text-white bg-blue-600 dark:bg-blue-600',
    purple: 'text-white bg-purple-600 dark:bg-purple-600',
    green: 'text-white bg-green-600 dark:bg-green-600',
    orange: 'text-white bg-orange-600 dark:bg-orange-600',
    red: 'text-white bg-red-600 dark:bg-red-600',
    emerald: 'text-white bg-emerald-600 dark:bg-emerald-600',
    cyan: 'text-white bg-cyan-600 dark:bg-cyan-600',
    violet: 'text-white bg-violet-600 dark:bg-violet-600',
    primary: 'text-white bg-primary-600 dark:bg-primary-600',
    secondary: 'text-white bg-gray-600 dark:bg-gray-600',
  };
  return colors[color] || colors.blue;
};
