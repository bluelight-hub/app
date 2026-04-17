import { Button } from '@/shared/ui/atoms/button.atom';
import { CommandTrigger } from '@/shared/ui/atoms/command-trigger.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { ModuleOverviewButton } from '@/shared/ui/atoms/module-overview-button.atom';
import { cn } from '@/shared/ui/cn';
import { DynamicLink } from '@/shared/ui/atoms/DynamicLink';
import { getModuleAccentBorder, getModuleAccentSurface, getModuleAccentText } from '@/shared/ui/module-colors';
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
          <div className="flex gap-3 xl:gap-4">
            <aside className="hidden w-52 flex-shrink-0 py-2 lg:block xl:w-56">
              <div className="sticky top-24 flex h-[calc(100vh-8rem)] flex-col rounded-panel border border-border-subtle bg-surface-panel p-2 shadow-panel">
                <section aria-label="Workspace-Navigation" className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {sidebarHeader}

                  <nav aria-label="Modulseiten" className="-mt-1 space-y-0.5 pb-3">
                    <h2 className="mb-3 px-2.5 text-body-xs font-semibold tracking-[0.16em] text-text-secondary uppercase">Navigation</h2>
                    {navigationGroups.map((module) => (
                      <div key={module.id} className="space-y-1 pb-2 last:pb-0">
                        {isDisabled(module.visibility) ? (
                          <div
                            aria-disabled="true"
                            className="flex items-center gap-2 rounded-control border-l-4 border-transparent px-2.5 py-2 text-text-muted touch:my-0.5 touch:py-2.5"
                            title={module.visibility.reason}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control">
                              <module.icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                            </span>
                            <h3 className="text-body-sm font-medium">{module.label}</h3>
                            {getShortcutBadge(module) ? (
                              <span
                                aria-hidden="true"
                                className="ml-auto rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-secondary shadow-sm"
                              >
                                {getShortcutBadge(module)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <DynamicLink
                            to={module.routeTarget}
                            params={routeParams}
                            aria-label={module.label}
                            aria-keyshortcuts={module.shortcut ? [...module.shortcut.modifiers, module.shortcut.key].join('+') : undefined}
                            className={cn(
                              'group flex cursor-pointer items-center gap-2 rounded-control border-l-4 px-2.5 py-2 transition-colors focus:outline-none focus-visible:shadow-focus-ring touch:my-0.5 touch:py-2.5',
                              module.id === currentModule.id
                                ? cn('bg-action-secondary text-text-primary', getModuleAccentBorder(module.color))
                                : 'border-transparent text-text-secondary hover:bg-action-secondary',
                            )}
                            search={(prev) => prev}
                            title={
                              module.shortcut
                                ? `Tastenkürzel: ${module.shortcut.modifiers.join('+').toLowerCase() === 'alt' ? `Alt+${module.shortcut.key}` : [...module.shortcut.modifiers, module.shortcut.key].join('+')}`
                                : undefined
                            }
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-control transition-colors',
                                module.id === currentModule.id ? getModuleAccentSurface(module.color) : '',
                              )}
                            >
                              <module.icon
                                className={cn('h-4 w-4 transition-colors', module.id === currentModule.id ? getModuleAccentText(module.color) : 'text-text-muted group-hover:text-text-secondary')}
                                aria-hidden="true"
                              />
                            </span>
                            <h3 className="text-body-sm font-medium">{module.label}</h3>
                            {getShortcutBadge(module) ? (
                              <span
                                aria-hidden="true"
                                className="ml-auto rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-secondary shadow-sm"
                              >
                                {getShortcutBadge(module)}
                              </span>
                            ) : null}
                          </DynamicLink>
                        )}

                        {module.id !== currentModule.id || isDisabled(module.visibility) ? null : (
                          <div className={cn('ml-3.5 space-y-0.5 border-l-2 pl-1', getModuleAccentBorder(module.color))} data-testid={`sub-list-${module.id}`}>
                            {module.visibleSubPages.map((page) => {
                              const isActive = page.href === resolvedActivePageHref;
                              const pageIsDisabled = isDisabled(page.visibility);

                              if (pageIsDisabled) {
                                return (
                                  <div key={page.id} aria-disabled="true" className="rounded-control px-2.5 py-2 text-text-muted touch:my-0.5 touch:py-2.5" title={page.visibility.reason}>
                                    <div className="flex items-start gap-3">
                                      <page.icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-body-sm font-medium">{page.label}</span>
                                          {page.badge ? <span className="rounded-pill bg-action-secondary px-1.5 py-0.5 text-body-xs font-semibold text-text-secondary">{page.badge}</span> : null}
                                        </div>
                                        {page.description ? <p className="mt-0.5 text-body-xs">{page.description}</p> : null}
                                        {page.visibility.reason ? <p className="mt-1 text-body-xs">{page.visibility.reason}</p> : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <DynamicLink
                                  key={page.id}
                                  to={page.href}
                                  params={routeParams}
                                  search={(prev) => prev}
                                  aria-current={isActive ? 'page' : undefined}
                                  className={cn(
                                    'group flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2 transition-colors touch:my-0.5 touch:py-2.5',
                                    isActive ? 'bg-action-secondary text-text-primary' : 'text-text-secondary hover:bg-action-secondary',
                                  )}
                                >
                                  <page.icon className={cn('mt-0.5 h-5 w-5 shrink-0 transition-colors', isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary')} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-body-sm font-medium">{page.label}</span>
                                      {page.badge ? <span className="rounded-pill bg-action-primary px-1.5 py-0.5 text-body-xs font-semibold text-text-inverse">{page.badge}</span> : null}
                                    </div>
                                    {page.description ? <p className="mt-0.5 text-body-xs text-text-secondary">{page.description}</p> : null}
                                  </div>
                                </DynamicLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </section>

                {onCommandTriggerClick || onOpenModuleOverview || quickActionsSlot || statusItems.length > 0 || sidebarFooter ? (
                  <section aria-label="Workspace-Aktionen" className="flex-shrink-0 space-y-2 border-t border-border-subtle pt-2">
                    {onCommandTriggerClick ? (
                      <div className="px-0.5">
                        <CommandTrigger onClick={onCommandTriggerClick} variant="compact" aria-label={commandTriggerLabel} className="w-full justify-center" />
                      </div>
                    ) : null}

                    {onOpenModuleOverview ? (
                      <div className="flex justify-end px-0.5">
                        <ModuleOverviewButton onClick={onOpenModuleOverview} aria-label={moduleOverviewLabel} />
                      </div>
                    ) : null}

                    {quickActionsSlot ? (
                      <section aria-label="Schnellaktionen" className="space-y-1">
                        <h2 className="px-2.5 text-body-xs font-semibold tracking-[0.16em] text-text-secondary uppercase">Schnellaktionen</h2>
                        {quickActionsSlot}
                      </section>
                    ) : null}

                    <StatusRail items={statusItems} />
                    {sidebarFooter}
                  </section>
                ) : null}
              </div>
            </aside>

            <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-border-subtle bg-surface-panel p-3 shadow-raised lg:hidden">
              {quickActionsSlot ? (
                <section aria-label="Schnellaktionen" className="space-y-2 border-t border-border-subtle pt-4">
                  <h2 className="px-2.5 text-body-xs font-semibold tracking-[0.16em] text-text-secondary uppercase">Schnellaktionen</h2>
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
                        className="flex items-center gap-2 rounded-control px-3 py-2 text-body-sm whitespace-nowrap text-text-muted"
                        title={page.visibility.reason}
                      >
                        <page.icon className="h-4 w-4" aria-hidden="true" />
                        {page.label}
                      </div>
                    );
                  }

                  return (
                    <DynamicLink
                      key={page.id}
                      to={page.href}
                      params={routeParams}
                      search={(prev) => prev}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-body-sm whitespace-nowrap',
                        isActive ? 'bg-action-secondary text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      <page.icon className="h-4 w-4" />
                      {page.label}
                    </DynamicLink>
                  );
                })}
              </nav>
            </div>

            <div className="min-w-0 flex-1 py-4 pb-20 lg:pb-4">
              {showMobileHelperArea ? (
                <aside aria-label="Workspace-Hilfe" className="mb-3 space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-2.5 shadow-panel lg:hidden">
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
