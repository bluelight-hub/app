import type { ModuleColor } from '@/shared/ui/organisms/command-palette';

export const getModuleColor = (color: ModuleColor): string => {
  const colors: Record<ModuleColor, string> = {
    blue: 'border-status-info-border bg-status-info-surface text-status-info-text hover:border-status-info-text hover:bg-status-info-surface/80',
    purple: 'border-action-primary/35 bg-primary-50 text-action-primary hover:border-action-primary hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60',
    green: 'border-status-success-border bg-status-success-surface text-status-success-text hover:border-status-success-text hover:bg-status-success-surface/80',
    orange: 'border-status-warning-border bg-status-warning-surface text-status-warning-text hover:border-status-warning-text hover:bg-status-warning-surface/80',
    red: 'border-status-danger-border bg-status-danger-surface text-status-danger-text hover:border-status-danger-text hover:bg-status-danger-surface/80',
    emerald: 'border-status-success-border bg-status-success-surface text-status-success-text hover:border-status-success-text hover:bg-status-success-surface/80',
    cyan: 'border-status-info-border bg-status-info-surface text-status-info-text hover:border-status-info-text hover:bg-status-info-surface/80',
    violet: 'border-action-primary/35 bg-primary-50 text-action-primary hover:border-action-primary hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60',
    primary: 'border-action-primary/35 bg-primary-50 text-action-primary hover:border-action-primary hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60',
    secondary: 'border-border-subtle bg-surface-panel text-text-secondary hover:border-border-strong hover:bg-action-secondary hover:text-text-primary',
  };
  return colors[color] || colors.blue;
};

export const getModuleActiveColor = (color: ModuleColor): string => {
  const colors: Record<ModuleColor, string> = {
    blue: 'border-status-info-text bg-status-info-text text-text-inverse shadow-raised hover:opacity-90',
    purple: 'border-action-primary bg-action-primary text-text-inverse shadow-raised hover:opacity-90',
    green: 'border-status-success-text bg-status-success-text text-text-inverse shadow-raised hover:opacity-90',
    orange: 'border-status-warning-text bg-status-warning-text text-text-inverse shadow-raised hover:opacity-90',
    red: 'border-status-danger-text bg-status-danger-text text-text-inverse shadow-raised hover:opacity-90',
    emerald: 'border-status-success-text bg-status-success-text text-text-inverse shadow-raised hover:opacity-90',
    cyan: 'border-status-info-text bg-status-info-text text-text-inverse shadow-raised hover:opacity-90',
    violet: 'border-action-primary bg-action-primary text-text-inverse shadow-raised hover:opacity-90',
    primary: 'border-action-primary bg-action-primary text-text-inverse shadow-raised hover:opacity-90',
    secondary: 'border-border-inverse bg-surface-inverse text-text-inverse shadow-raised hover:opacity-90',
  };
  return colors[color] || colors.blue;
};
