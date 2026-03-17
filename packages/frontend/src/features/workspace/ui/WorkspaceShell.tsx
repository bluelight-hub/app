import { Button } from '@/shared/ui/atoms/button.atom';
import { CommandTrigger } from '@/shared/ui/atoms/command-trigger.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { cn } from '@/shared/ui/cn';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PiGridFour } from 'react-icons/pi';
import { useWorkspaceModuleSelection } from '../hooks';
import type { WorkspaceBlockingOverlayState, WorkspaceContextBarModel, WorkspaceModuleDefinition, WorkspaceRouteParams, WorkspaceStatusItem } from '../types';
import { ModuleRail } from './ModuleRail';
import { StatusRail } from './StatusRail';
import { WorkspaceContextBar } from './WorkspaceContextBar';

function isVisible(state: WorkspaceModuleDefinition['visibility'] | WorkspaceModuleDefinition['subPages'][number]['visibility']): boolean {
  return state.default !== 'hidden';
}

function isDisabled(state: WorkspaceModuleDefinition['visibility'] | WorkspaceModuleDefinition['subPages'][number]['visibility']): boolean {
  return state.default === 'disabled';
}

function getShortcutBadge(module: WorkspaceModuleDefinition): string | undefined {
  if (module.shortcut.modifiers.join('+').toLowerCase() === 'alt') {
    return `⌥${module.shortcut.key}`;
  }

  return [...module.shortcut.modifiers, module.shortcut.key].join('+');
}

function getBadgeText(module: WorkspaceModuleDefinition): string | undefined {
  if (!module.badgeHint) {
    return undefined;
  }

  if (module.badgeHint.value === undefined) {
    return module.badgeHint.label;
  }

  return `${module.badgeHint.label}: ${module.badgeHint.value}`;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    const updateMatches = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateMatches);

    return () => {
      mediaQuery.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}

export interface WorkspaceShellProps {
  contextBar: WorkspaceContextBarModel;
  modules: WorkspaceModuleDefinition[];
  activeModuleId: string;
  activePageHref?: string;
  routeParams?: WorkspaceRouteParams;
  statusItems?: WorkspaceStatusItem[];
  blockingOverlay?: WorkspaceBlockingOverlayState;
  commandTriggerLabel?: string;
  moduleOverviewLabel?: string;
  onCommandTriggerClick?: () => void;
  onOpenModuleOverview?: () => void;
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  overlaySlot?: ReactNode;
  className?: string;
  children: ReactNode;
  quickActionsSlot?: ReactNode;
}

export function WorkspaceShell({
  contextBar,
  modules,
  activeModuleId,
  activePageHref,
  routeParams,
  statusItems = [],
  blockingOverlay,
  commandTriggerLabel,
  moduleOverviewLabel,
  onCommandTriggerClick,
  onOpenModuleOverview,
  quickActionsSlot,
  sidebarHeader,
  sidebarFooter,
  overlaySlot,
  className,
  children,
}: WorkspaceShellProps) {
  const isSmallViewport = useMediaQuery('(max-width: 1023px)');
  const visibleModules = modules.filter((module) => isVisible(module.visibility));
  const { currentModule, currentPage } = useWorkspaceModuleSelection({
    modules: visibleModules,
    activeModuleId,
    activePageHref,
  });
  const currentModuleSubPages = currentModule.subPages.filter((page) => isVisible(page.visibility));
  const navigationGroups = visibleModules
    .map((module) => ({
      ...module,
      visibleSubPages: module.subPages.filter((page) => isVisible(page.visibility)),
    }))
    .filter((module) => module.visibleSubPages.length > 0 || isDisabled(module.visibility));
  const resolvedActivePageHref = activePageHref ?? currentPage.href;
  const hasMobileHelperActions = Boolean(onCommandTriggerClick || onOpenModuleOverview || quickActionsSlot || sidebarFooter);
  const showMobileHelperArea = isSmallViewport && (statusItems.length > 0 || hasMobileHelperActions);

  return (
    <div className={cn('min-h-screen bg-surface-canvas text-text-primary', className)}>
      <WorkspaceContextBar {...contextBar} routeParams={routeParams} />

      <ModuleRail
        modules={visibleModules}
        activeModuleId={currentModule.id}
        routeParams={routeParams}
        blockingOverlay={blockingOverlay}
        commandTriggerLabel={commandTriggerLabel}
        moduleOverviewLabel={moduleOverviewLabel}
        onCommandTriggerClick={isSmallViewport ? undefined : onCommandTriggerClick}
        onOpenModuleOverview={isSmallViewport ? undefined : onOpenModuleOverview}
        className="lg:hidden"
      />

      <main className="flex-1">
        <Container maxWidth="full">
          <div className="flex gap-4 xl:gap-5">
            <aside className="hidden w-56 flex-shrink-0 pt-6 lg:block xl:w-60">
              <div className="sticky top-36 max-h-[calc(100vh-10rem)] space-y-3 overflow-y-auto rounded-panel border border-border-subtle bg-surface-panel p-2.5 shadow-panel">
                {sidebarHeader}
                {onCommandTriggerClick ? (
                  <div className="px-0.5">
                    <CommandTrigger onClick={onCommandTriggerClick} label={commandTriggerLabel} />
                  </div>
                ) : null}

                <nav aria-label="Modulseiten" className="-mt-1 space-y-1 pb-4">
                  <h2 className="mb-4 px-2.5 font-semibold text-body-xs text-text-secondary uppercase tracking-[0.16em]">Navigation</h2>
                  {navigationGroups.map((module) => (
                    <div key={module.id} className="space-y-1 pb-2 last:pb-0">
                      {isDisabled(module.visibility) ? (
                        <div aria-disabled="true" className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text-muted" title={module.visibility.reason}>
                          <module.icon className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
                          <h3 className="font-medium text-body-sm">{module.label}</h3>
                          {getShortcutBadge(module) ? (
                            <span
                              aria-hidden="true"
                              className="ml-auto rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-text-secondary leading-none shadow-sm"
                            >
                              {getShortcutBadge(module)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Link
                          to={module.routeTarget}
                          // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                          params={routeParams as any}
                          aria-label={module.label}
                          aria-keyshortcuts={module.shortcut ? [...module.shortcut.modifiers, module.shortcut.key].join('+') : undefined}
                          className={cn(
                            'group flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 transition-colors focus:outline-none focus-visible:shadow-focus-ring',
                            module.id === currentModule.id ? 'bg-action-secondary text-text-primary' : 'text-text-secondary hover:bg-action-secondary',
                          )}
                          search={(prev) => prev}
                          aria-description={getBadgeText(module)}
                          title={
                            module.shortcut
                              ? `Tastenkürzel: ${module.shortcut.modifiers.join('+').toLowerCase() === 'alt' ? `Alt+${module.shortcut.key}` : [...module.shortcut.modifiers, module.shortcut.key].join('+')}`
                              : undefined
                          }
                        >
                          <module.icon
                            className={cn('h-4 w-4 flex-shrink-0 transition-colors', module.id === currentModule.id ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary')}
                            aria-hidden="true"
                          />
                          <h3 className="font-medium text-body-sm">{module.label}</h3>
                          {getShortcutBadge(module) ? (
                            <span
                              aria-hidden="true"
                              className="ml-auto rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-text-secondary leading-none shadow-sm"
                            >
                              {getShortcutBadge(module)}
                            </span>
                          ) : null}
                        </Link>
                      )}

                      {module.badgeHint ? (
                        <div className="ml-2.5 flex items-center gap-2 px-2.5 py-1 text-body-xs text-text-secondary">
                          <span className="font-medium">{module.badgeHint.label}</span>
                          {module.badgeHint.value !== undefined ? (
                            <span className="rounded-pill bg-action-secondary px-1.5 py-0.5 font-semibold text-body-xs text-text-primary">{module.badgeHint.value}</span>
                          ) : null}
                        </div>
                      ) : null}

                      {module.id !== currentModule.id || isDisabled(module.visibility)
                        ? null
                        : module.visibleSubPages.map((page) => {
                            const isActive = page.href === resolvedActivePageHref;
                            const pageIsDisabled = isDisabled(page.visibility);

                            if (pageIsDisabled) {
                              return (
                                <div key={page.id} aria-disabled="true" className="ml-2.5 rounded-control px-2.5 py-2 text-text-muted" title={page.visibility.reason}>
                                  <div className="flex items-start gap-3">
                                    <page.icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-body-sm">{page.label}</span>
                                        {page.badge ? <span className="rounded-pill bg-action-secondary px-1.5 py-0.5 font-semibold text-body-xs text-text-secondary">{page.badge}</span> : null}
                                      </div>
                                      {page.description ? <p className="mt-0.5 text-body-xs">{page.description}</p> : null}
                                      {page.visibility.reason ? <p className="mt-1 text-body-xs">{page.visibility.reason}</p> : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <Link
                                key={page.id}
                                to={page.href}
                                // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                                params={routeParams as any}
                                search={(prev) => prev}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                  'group ml-2.5 flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2 transition-colors',
                                  isActive ? 'bg-action-secondary text-text-primary' : 'text-text-secondary hover:bg-action-secondary',
                                )}
                              >
                                <page.icon className={cn('mt-0.5 h-5 w-5 shrink-0 transition-colors', isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary')} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-body-sm">{page.label}</span>
                                    {page.badge ? <span className="rounded-pill bg-action-primary px-1.5 py-0.5 font-semibold text-body-xs text-text-inverse">{page.badge}</span> : null}
                                  </div>
                                  {page.description ? <p className="mt-0.5 text-body-xs text-text-secondary">{page.description}</p> : null}
                                </div>
                              </Link>
                            );
                          })}
                    </div>
                  ))}
                </nav>

                {quickActionsSlot ? (
                  <section aria-label="Schnellaktionen" className="space-y-2 border-border-subtle border-t pt-3">
                    <h2 className="px-2.5 font-semibold text-body-xs text-text-secondary uppercase tracking-[0.16em]">Schnellaktionen</h2>
                    {quickActionsSlot}
                  </section>
                ) : null}

                <StatusRail items={statusItems} />
                {sidebarFooter}
              </div>
            </aside>

            <div className="fixed right-0 bottom-0 left-0 z-20 border-border-subtle border-t bg-surface-panel p-4 shadow-raised lg:hidden">
              {quickActionsSlot ? (
                <section aria-label="Schnellaktionen" className="space-y-2 border-border-subtle border-t pt-4">
                  <h2 className="px-2.5 font-semibold text-body-xs text-text-secondary uppercase tracking-[0.16em]">Schnellaktionen</h2>
                  {quickActionsSlot}
                </section>
              ) : null}

              <nav aria-label="Modulseiten mobil" className="flex gap-2 overflow-x-auto">
                {currentModuleSubPages.map((page) => {
                  const isActive = page.href === resolvedActivePageHref;
                  const pageIsDisabled = isDisabled(page.visibility);

                  if (pageIsDisabled) {
                    return (
                      <div
                        key={page.id}
                        aria-disabled="true"
                        className="flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-body-sm text-text-muted"
                        title={page.visibility.reason}
                      >
                        <page.icon className="h-4 w-4" aria-hidden="true" />
                        {page.label}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={page.id}
                      to={page.href}
                      // biome-ignore lint/suspicious/noExplicitAny: Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
                      params={routeParams as any}
                      search={(prev) => prev}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-body-sm',
                        isActive ? 'bg-action-secondary text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      <page.icon className="h-4 w-4" />
                      {page.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="min-w-0 flex-1 py-6 pb-24 lg:pb-6">
              {showMobileHelperArea ? (
                <aside aria-label="Workspace-Hilfe" className="mb-4 space-y-3 rounded-panel border border-border-subtle bg-surface-panel p-3 shadow-panel lg:hidden">
                  {onCommandTriggerClick || onOpenModuleOverview ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {onCommandTriggerClick ? <CommandTrigger onClick={onCommandTriggerClick} label={commandTriggerLabel} /> : null}
                      {onOpenModuleOverview ? (
                        <Button appearance="ghost" size="sm" className="w-full justify-center gap-2" onClick={onOpenModuleOverview} aria-label={moduleOverviewLabel}>
                          <PiGridFour className="h-4 w-4" />
                          <span>{moduleOverviewLabel}</span>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <StatusRail items={statusItems} />
                  {sidebarFooter}
                </aside>
              ) : null}

              {children}
            </div>
          </div>
        </Container>
      </main>

      {overlaySlot}
    </div>
  );
}
