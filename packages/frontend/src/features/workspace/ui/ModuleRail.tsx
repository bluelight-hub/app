import { cn, getModuleActiveColor, getModuleColor } from '@/shared/ui';
import { Button } from '@/shared/ui/atoms/button.atom';
import { CommandTrigger } from '@/shared/ui/atoms/command-trigger.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PiGridFour, PiQuestion } from 'react-icons/pi';
import type { WorkspaceBlockingOverlayState, WorkspaceModuleDefinition, WorkspaceRouteParams } from '../types';

export interface ModuleRailProps {
  modules: WorkspaceModuleDefinition[];
  activeModuleId: string;
  routeParams?: WorkspaceRouteParams;
  blockingOverlay?: WorkspaceBlockingOverlayState;
  commandTriggerLabel?: string;
  moduleOverviewLabel?: string;
  onCommandTriggerClick?: () => void;
  onOpenModuleOverview?: () => void;
  className?: string;
}

function isVisible(state: WorkspaceModuleDefinition['visibility']): boolean {
  return state.default !== 'hidden';
}

function isDisabled(state: WorkspaceModuleDefinition['visibility']): boolean {
  return state.default === 'disabled';
}

function getShortcutLabel(module: WorkspaceModuleDefinition): string | undefined {
  if (module.shortcut.modifiers.join('+').toLowerCase() === 'alt') {
    return `Alt+${module.shortcut.key}`;
  }

  return [...module.shortcut.modifiers, module.shortcut.key].join('+');
}

function getShortcutBadge(module: WorkspaceModuleDefinition): string | undefined {
  if (module.shortcut.modifiers.join('+').toLowerCase() === 'alt') {
    return `⌥${module.shortcut.key}`;
  }

  return [...module.shortcut.modifiers, module.shortcut.key].join('+');
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function matchesShortcut(event: KeyboardEvent, module: WorkspaceModuleDefinition): boolean {
  const { modifiers, key } = module.shortcut;
  const normalizedModifiers = modifiers.map((modifier) => modifier.toLowerCase()).sort();
  const pressedModifiers = [event.altKey ? 'alt' : null, event.ctrlKey ? 'ctrl' : null, event.metaKey ? 'meta' : null, event.shiftKey ? 'shift' : null].filter(Boolean).sort();
  const normalizedKey = key.toLowerCase();
  const normalizedEventKey = event.key.toLowerCase();
  const normalizedEventCode = event.code.toLowerCase();
  const matchesKey =
    normalizedEventKey === normalizedKey || normalizedEventCode === `digit${normalizedKey}` || normalizedEventCode === `numpad${normalizedKey}` || normalizedEventCode === `key${normalizedKey}`;

  return normalizedModifiers.length === pressedModifiers.length && normalizedModifiers.every((modifier, index) => modifier === pressedModifiers[index]) && matchesKey;
}

function hasBlockingModalOverlay(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]') !== null;
}

function ShortcutHint({ module, className }: { module: WorkspaceModuleDefinition; className?: string }) {
  const shortcutBadge = getShortcutBadge(module);
  if (!shortcutBadge) {
    return null;
  }

  return (
    <span aria-hidden="true" className={cn('rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-text-secondary leading-none shadow-sm', className)}>
      {shortcutBadge}
    </span>
  );
}

export function ModuleRail({
  modules,
  activeModuleId,
  routeParams,
  blockingOverlay,
  commandTriggerLabel = 'Befehle und Navigation',
  moduleOverviewLabel = 'Modulübersicht öffnen',
  onCommandTriggerClick,
  onOpenModuleOverview,
  className,
}: ModuleRailProps) {
  const railModules = modules.filter((module) => isVisible(module.visibility));
  const currentModule = railModules.find((module) => module.id === activeModuleId) ?? railModules[0];
  const navigate = useNavigate();

  useEffect(() => {
    if (railModules.length === 0 || blockingOverlay?.isBlocking) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target) || hasBlockingModalOverlay()) {
        return;
      }

      const matchedModule = railModules.find((module) => !isDisabled(module.visibility) && matchesShortcut(event, module));
      if (!matchedModule) {
        return;
      }

      event.preventDefault();
      void navigate({
        to: matchedModule.routeTarget,
        // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
        params: routeParams as any,
        search: (prev) => prev,
      });
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [blockingOverlay?.isBlocking, navigate, railModules, routeParams]);

  if (!currentModule) {
    return null;
  }

  return (
    <nav aria-label="Workspace-Module" className={cn('sticky top-12 z-20 border-border-subtle border-b bg-surface-panel shadow-raised', className)}>
      <Container maxWidth="full">
        <div className="py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="hidden gap-2.5 overflow-x-auto 2xl:flex">
              {railModules.map((module) => {
                const isActive = module.id === currentModule.id;
                const moduleIsDisabled = isDisabled(module.visibility);

                if (moduleIsDisabled) {
                  return (
                    <div
                      key={module.id}
                      aria-disabled="true"
                      className={cn('flex items-center gap-2 whitespace-nowrap rounded-control border px-3 py-1.5 font-medium text-body-sm text-text-muted', getModuleColor(module.color))}
                      title={module.visibility.reason}
                    >
                      <module.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{module.label}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={module.id}
                    to={module.routeTarget}
                    // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                    params={routeParams as any}
                    search={(prev) => prev}
                    aria-label={module.label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-keyshortcuts={getShortcutLabel(module)}
                    className={cn(
                      'group relative flex items-center gap-2 whitespace-nowrap rounded-control border px-3 py-1.5 font-medium text-body-sm transition-[background-color,border-color,color,box-shadow] focus:outline-none focus-visible:shadow-focus-ring',
                      isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color),
                    )}
                    title={getShortcutLabel(module) ? `Tastenkürzel: ${getShortcutLabel(module)}` : undefined}
                  >
                    <module.icon className="h-4 w-4" />
                    <span>{module.label}</span>
                    <ShortcutHint module={module} />
                  </Link>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 lg:flex 2xl:hidden">
              {railModules.slice(0, 5).map((module) => {
                const isActive = module.id === currentModule.id;
                const moduleIsDisabled = isDisabled(module.visibility);

                if (moduleIsDisabled) {
                  return (
                    <div
                      key={module.id}
                      aria-disabled="true"
                      className={cn('flex items-center gap-2 rounded-control border px-2.5 py-1.5 font-medium text-body-sm text-text-muted', getModuleColor(module.color))}
                      title={module.visibility.reason}
                    >
                      <module.icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:inline">{module.label}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={module.id}
                    to={module.routeTarget}
                    // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                    params={routeParams as any}
                    search={(prev) => prev}
                    aria-label={module.label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-keyshortcuts={getShortcutLabel(module)}
                    title={getShortcutLabel(module) ? `Tastenkürzel: ${getShortcutLabel(module)}` : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-control border px-2.5 py-1.5 font-medium text-body-sm transition-[background-color,border-color,color,box-shadow] focus:outline-none focus-visible:shadow-focus-ring',
                      isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color),
                    )}
                  >
                    <module.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{module.label}</span>
                    <ShortcutHint module={module} className="shrink-0" />
                  </Link>
                );
              })}

              {railModules.length > 5 && onOpenModuleOverview ? (
                <Button appearance="ghost" size="sm" onClick={onOpenModuleOverview} aria-label={moduleOverviewLabel} title={moduleOverviewLabel} className="px-2.5">
                  <PiGridFour className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Mehr</span>
                </Button>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 sm:flex lg:hidden">
              {railModules.slice(0, 3).map((module) => {
                const isActive = module.id === currentModule.id;
                const moduleIsDisabled = isDisabled(module.visibility);

                if (moduleIsDisabled) {
                  return (
                    <div
                      key={module.id}
                      aria-disabled="true"
                      className={cn('flex items-center gap-2 rounded-control border px-3 py-2 font-medium text-body-sm text-text-muted', getModuleColor(module.color))}
                      title={module.visibility.reason}
                    >
                      <module.icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:inline">{module.label}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={module.id}
                    to={module.routeTarget}
                    // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                    params={routeParams as any}
                    search={(prev) => prev}
                    aria-label={module.label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-keyshortcuts={getShortcutLabel(module)}
                    title={getShortcutLabel(module) ? `Tastenkürzel: ${getShortcutLabel(module)}` : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-control border px-3 py-2 font-medium text-body-sm transition-[background-color,border-color,color,box-shadow] focus:outline-none focus-visible:shadow-focus-ring',
                      isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color),
                    )}
                  >
                    <module.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{module.label}</span>
                    <ShortcutHint module={module} className="shrink-0" />
                  </Link>
                );
              })}

              {railModules.length > 3 && onOpenModuleOverview ? (
                <Button appearance="ghost" size="sm" onClick={onOpenModuleOverview} aria-label={moduleOverviewLabel} title={moduleOverviewLabel} className="px-3">
                  <PiGridFour className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Mehr</span>
                </Button>
              ) : null}
            </div>

            <div className="flex flex-1 items-center gap-2 sm:hidden">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 font-medium text-body-sm text-text-primary',
                  getModuleActiveColor(currentModule.color),
                )}
              >
                <currentModule.icon className="h-4 w-4" />
                <span>{currentModule.label}</span>
              </div>

              {onOpenModuleOverview ? (
                <Button appearance="ghost" size="sm" onClick={onOpenModuleOverview} className="ml-auto" aria-label={moduleOverviewLabel} title={moduleOverviewLabel}>
                  <PiGridFour className="h-5 w-5" />
                </Button>
              ) : null}
            </div>

            {onCommandTriggerClick ? (
              <div className="ml-44">
                <CommandTrigger onClick={onCommandTriggerClick} aria-label={commandTriggerLabel} />
              </div>
            ) : null}
          </div>

          <div className="mt-2 hidden items-center justify-between lg:flex">
            <p className="text-body-xs text-text-secondary">{currentModule.description}</p>
            {onOpenModuleOverview ? (
              <Button appearance="ghost" size="sm" className="h-6 w-6 p-0" title="Modulübersicht anzeigen" aria-label="Modulübersicht anzeigen" onClick={onOpenModuleOverview}>
                <PiQuestion className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </nav>
  );
}
