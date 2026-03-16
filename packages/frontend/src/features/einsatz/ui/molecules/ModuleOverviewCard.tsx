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
  visibility: {
    default: 'visible' | 'hidden' | 'disabled';
    reason?: string;
  };
  routeTarget: string;
  shortcut?: {
    modifiers: string[];
    key: string;
  };
  badgeHint?: {
    kind: 'status' | 'count' | 'info';
    label: string;
    value?: string | number;
  };
  subPages: Array<{
    name: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
  }>;
}

function isVisible(visibility: Module['visibility']): boolean {
  return visibility.default !== 'hidden';
}

function isDisabled(visibility: Module['visibility']): boolean {
  return visibility.default === 'disabled';
}

interface ModuleOverviewCardProps {
  modules: Module[];
  currentModuleId?: string;
  einsatzId: string;
  open: boolean;
  onClose: () => void;
}

function getShortcutBadge(shortcut?: Module['shortcut']): string | null {
  if (!shortcut) {
    return null;
  }

  if (shortcut.modifiers.join('+').toLowerCase() === 'alt') {
    return `⌥${shortcut.key}`;
  }

  return [...shortcut.modifiers, shortcut.key].join('+');
}

function getBadgeHintText(module: Module): string | null {
  if (!module.badgeHint) {
    return null;
  }

  if (module.badgeHint.value === undefined) {
    return module.badgeHint.label;
  }

  return `${module.badgeHint.label}: ${module.badgeHint.value}`;
}

export function ModuleOverviewCard({ modules, currentModuleId, einsatzId, open, onClose }: ModuleOverviewCardProps) {
  const visibleModules = modules.filter((module) => isVisible(module.visibility));

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
          {visibleModules.map((module) => {
            const isActive = module.id === currentModuleId;
            const moduleIsDisabled = isDisabled(module.visibility);
            const shortcutBadge = getShortcutBadge(module.shortcut);
            const badgeHintText = getBadgeHintText(module);
            const cardClassName = cn(
              'relative flex flex-col items-center gap-2 rounded-panel border p-4 text-center transition-[background-color,border-color,color,box-shadow]',
              moduleIsDisabled ? 'cursor-not-allowed opacity-70' : 'focus:outline-none focus-visible:shadow-focus-ring',
              moduleIsDisabled ? getModuleColor(module.color) : isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color),
              isActive && !moduleIsDisabled && 'ring-2 ring-focus-ring ring-offset-2 ring-offset-focus-ring-offset',
            );
            const cardContent = (
              <>
                {/* Hotkey Badge */}
                {shortcutBadge ? <span className="absolute top-2 right-2 rounded-pill bg-surface-overlay px-1.5 py-0.5 font-mono text-body-xs opacity-80">{shortcutBadge}</span> : null}

                {/* Icon */}
                <module.icon className="h-8 w-8" />

                {/* Name */}
                <span className="font-medium text-body-sm">{module.name}</span>

                {/* Description */}
                {module.description && <span className="line-clamp-2 text-body-xs opacity-80">{module.description}</span>}
                {badgeHintText ? <span className="rounded-pill bg-action-secondary px-2 py-1 text-body-xs text-text-secondary">{badgeHintText}</span> : null}
                {moduleIsDisabled && module.visibility.reason ? <span className="text-body-xs text-text-muted">{module.visibility.reason}</span> : null}
              </>
            );

            if (moduleIsDisabled) {
              return (
                <div key={module.id} aria-disabled="true" className={cardClassName} title={module.visibility.reason}>
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={module.id} to={module.routeTarget} params={{ einsatzId }} onClick={onClose} className={cardClassName}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
