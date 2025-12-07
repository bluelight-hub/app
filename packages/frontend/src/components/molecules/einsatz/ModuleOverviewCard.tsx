import { cn } from '@/shared/utils/cn';
import { CloseButton } from '@atoms/close-button.atom';
import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { Dialog } from '../dialog.molecule';

interface Module {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  color: string;
  subPages: Array<{
    name: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
  }>;
}

interface ModuleOverviewCardProps {
  modules: Module[];
  currentModuleId?: string;
  einsatzId: string;
  open: boolean;
  onClose: () => void;
}

export function ModuleOverviewCard({ modules, currentModuleId, einsatzId, open, onClose }: ModuleOverviewCardProps) {
  const getModuleColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
      emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
      cyan: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50',
      indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50',
      sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Dialog isOpen={open} onClose={onClose} className="z-50 max-w-2xl p-0">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Module wählen</h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {modules.map((module, index) => {
            const isActive = module.id === currentModuleId;
            const hotkey = index < 9 ? index + 1 : null;

            return (
              <Link
                key={module.id}
                to={module.subPages[0].href}
                params={{ einsatzId }}
                onClick={onClose}
                className={cn('relative flex flex-col items-center gap-2 rounded-lg p-4 transition-all', getModuleColor(module.color), isActive && 'ring-2 ring-blue-500 ring-offset-2')}
              >
                {/* Hotkey Badge */}
                {hotkey && <span className="absolute top-2 right-2 font-mono text-xs opacity-50">⌥{hotkey}</span>}

                {/* Icon */}
                <module.icon className="h-8 w-8" />

                {/* Name */}
                <span className="text-center font-medium text-sm">{module.name}</span>

                {/* Description */}
                {module.description && <span className="line-clamp-2 text-center text-xs opacity-75">{module.description}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
