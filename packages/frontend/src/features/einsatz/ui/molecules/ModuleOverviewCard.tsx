import { cn } from '@/shared/ui/cn';
import { getModuleActiveColor, getModuleColor } from '@/shared/ui/module-colors';
import { CloseButton } from '@/shared/ui/atoms/close-button.atom';
import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import type { ModuleColor } from '@/shared/ui/organisms/command-palette';

interface Module {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  color: ModuleColor;
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
  return (
    <Dialog isOpen={open} onClose={onClose} className="z-50 max-w-2xl p-0">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between border-border-subtle border-b p-4">
          <h2 className="font-semibold text-text-primary text-title-sm">Module wählen</h2>
          <CloseButton onClick={onClose} className="text-text-muted hover:bg-action-secondary hover:text-text-primary" />
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
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-panel border p-4 text-center transition-[background-color,border-color,color,box-shadow]',
                  isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color),
                  isActive && 'ring-2 ring-focus-ring ring-offset-2 ring-offset-focus-ring-offset',
                )}
              >
                {/* Hotkey Badge */}
                {hotkey && <span className="absolute top-2 right-2 rounded-pill bg-surface-overlay px-1.5 py-0.5 font-mono text-body-xs opacity-80">⌥{hotkey}</span>}

                {/* Icon */}
                <module.icon className="h-8 w-8" />

                {/* Name */}
                <span className="font-medium text-body-sm">{module.name}</span>

                {/* Description */}
                {module.description && <span className="line-clamp-2 text-body-xs opacity-80">{module.description}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
