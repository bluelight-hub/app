import { Button } from '@/shared/ui/atoms/button.atom';
import { CommandTrigger } from '@/shared/ui/atoms/command-trigger.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { cn } from '@/shared/ui/cn';
import { DynamicLink } from '@/shared/ui/atoms/DynamicLink';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { PiCaretDown, PiCaretDoubleLeft, PiCaretDoubleRight, PiGridFour } from 'react-icons/pi';
import { useSidebarCollapsed } from '../hooks/use-sidebar-collapsed';
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

/**
 * Prüft, ob ein Keyboard-Event-Target ein bearbeitbares Element ist.
 * Wird genutzt, um globale Hotkeys während der Texteingabe zu unterdrücken.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function hasBlockingModalOverlay(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]') !== null;
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
  /**
   * Optionaler Override für den Einklapp-Zustand der Sidebar (hauptsächlich für Tests).
   * Wenn nicht gesetzt, wird `useSidebarCollapsed` intern genutzt.
   */
  isCollapsed?: boolean;
  /**
   * Optionaler Toggle-Callback, der zusammen mit `isCollapsed` für Tests genutzt wird.
   */
  onToggleCollapsed?: () => void;
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
  isCollapsed: isCollapsedProp,
  onToggleCollapsed,
}: WorkspaceShellProps) {
  const isSmallViewport = useMediaQuery('(max-width: 1023px)');
  const collapsedState = useSidebarCollapsed();
  const isCollapsed = isCollapsedProp ?? collapsedState.isCollapsed;
  const handleToggleCollapsed = useCallback(() => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
      return;
    }
    collapsedState.toggle();
  }, [onToggleCollapsed, collapsedState]);

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
  const activeNavigationGroups = navigationGroups.filter((module) => !isDisabled(module.visibility));
  const comingSoonModules = navigationGroups.filter((module) => isDisabled(module.visibility));
  const resolvedActivePageHref = activePageHref ?? currentPage.href;
  const hasMobileHelperActions = Boolean(onCommandTriggerClick || onOpenModuleOverview || quickActionsSlot || sidebarFooter);
  const showMobileHelperArea = isSmallViewport && (statusItems.length > 0 || hasMobileHelperActions);

  // Globaler Hotkey: Ctrl+\ bzw. Meta+\ toggelt Sidebar-Collapse. Nur aktiv auf grösseren Viewports.
  useEffect(() => {
    if (isSmallViewport) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target) || hasBlockingModalOverlay()) {
        return;
      }

      const isToggleShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (event.key === '\\' || event.code === 'Backslash');

      if (!isToggleShortcut) {
        return;
      }

      event.preventDefault();
      handleToggleCollapsed();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleToggleCollapsed, isSmallViewport]);

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
            <aside
              aria-label="Workspace-Sidebar"
              data-collapsed={isCollapsed ? 'true' : 'false'}
              className={cn('hidden flex-shrink-0 py-2 transition-[width] duration-200 lg:block', isCollapsed ? 'w-14' : 'w-52 xl:w-56')}
            >
              <div className="sticky top-24 flex h-[calc(100vh-8rem)] flex-col rounded-panel border border-border-subtle bg-surface-panel p-2 shadow-panel">
                <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between', 'pb-2')}>
                  {!isCollapsed && sidebarHeader ? <div className="min-w-0 flex-1">{sidebarHeader}</div> : null}
                  <Button
                    appearance="ghost"
                    size="sm"
                    className={cn('flex-shrink-0', isCollapsed ? 'h-8 w-8 justify-center p-0' : 'ml-auto')}
                    onClick={handleToggleCollapsed}
                    aria-label={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? 'Sidebar ausklappen (Ctrl+\\)' : 'Sidebar einklappen (Ctrl+\\)'}
                  >
                    {isCollapsed ? <PiCaretDoubleRight className="h-4 w-4" /> : <PiCaretDoubleLeft className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {onCommandTriggerClick ? (
                    <div className={cn(isCollapsed ? 'flex justify-center' : 'px-0.5')}>
                      <CommandTrigger onClick={onCommandTriggerClick} aria-label={commandTriggerLabel} variant={isCollapsed ? 'compact' : 'default'} />
                    </div>
                  ) : null}

                  <nav aria-label="Modulseiten" className="-mt-1 space-y-0.5 pb-3">
                    {!isCollapsed ? <h2 className="mb-3 px-2.5 text-body-xs font-semibold tracking-[0.16em] text-text-secondary uppercase">Navigation</h2> : null}
                    {activeNavigationGroups.map((module) => (
                      <div key={module.id} className="space-y-1 pb-2 last:pb-0">
                        <DynamicLink
                          to={module.routeTarget}
                          params={routeParams}
                          aria-label={module.label}
                          aria-keyshortcuts={module.shortcut ? [...module.shortcut.modifiers, module.shortcut.key].join('+') : undefined}
                          className={cn(
                            'group flex cursor-pointer items-center gap-2 rounded-control transition-colors focus:outline-none focus-visible:shadow-focus-ring',
                            isCollapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2',
                            module.id === currentModule.id ? 'bg-action-secondary text-text-primary' : 'text-text-secondary hover:bg-action-secondary',
                          )}
                          search={(prev) => prev}
                          aria-description={getBadgeText(module)}
                          title={
                            isCollapsed
                              ? module.label
                              : module.shortcut
                                ? `Tastenkürzel: ${module.shortcut.modifiers.join('+').toLowerCase() === 'alt' ? `Alt+${module.shortcut.key}` : [...module.shortcut.modifiers, module.shortcut.key].join('+')}`
                                : undefined
                          }
                        >
                          <module.icon
                            className={cn('h-4 w-4 flex-shrink-0 transition-colors', module.id === currentModule.id ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary')}
                            aria-hidden="true"
                          />
                          {!isCollapsed ? (
                            <>
                              <h3 className="text-body-sm font-medium">{module.label}</h3>
                              {getShortcutBadge(module) ? (
                                <span
                                  aria-hidden="true"
                                  className="ml-auto rounded-pill border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-secondary shadow-sm"
                                >
                                  {getShortcutBadge(module)}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="sr-only">{module.label}</span>
                          )}
                        </DynamicLink>

                        {!isCollapsed && module.badgeHint ? (
                          <div className="ml-2.5 flex items-center gap-2 px-2.5 py-1 text-body-xs text-text-secondary">
                            <span className="font-medium">{module.badgeHint.label}</span>
                            {module.badgeHint.value !== undefined ? (
                              <span className="rounded-pill bg-action-secondary px-1.5 py-0.5 text-body-xs font-semibold text-text-primary">{module.badgeHint.value}</span>
                            ) : null}
                          </div>
                        ) : null}

                        {isCollapsed || module.id !== currentModule.id
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
                                    'group ml-2.5 flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2 transition-colors',
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
                    ))}
                  </nav>

                  {!isCollapsed && comingSoonModules.length > 0 ? (
                    <Disclosure as="section" defaultOpen aria-label="Demnächst verfügbare Module" className="border-t border-border-subtle pt-3">
                      {({ open }) => (
                        <>
                          <DisclosureButton className="group flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-left text-body-xs font-semibold tracking-[0.16em] text-text-secondary uppercase hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none">
                            <span className="flex-1">Demnächst verfügbar</span>
                            <span aria-hidden="true" className="rounded-pill bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-secondary">
                              {comingSoonModules.length}
                            </span>
                            <PiCaretDown className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', open ? 'rotate-180' : 'rotate-0')} aria-hidden="true" />
                          </DisclosureButton>
                          <DisclosurePanel className="mt-1 space-y-0.5">
                            {comingSoonModules.map((module) => (
                              <div key={module.id} aria-disabled="true" className="flex items-center gap-2 rounded-control px-2.5 py-2 text-text-muted" title={module.visibility.reason}>
                                <module.icon className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
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
                            ))}
                          </DisclosurePanel>
                        </>
                      )}
                    </Disclosure>
                  ) : null}
                </div>

                <div className="flex-shrink-0">
                  {!isCollapsed && quickActionsSlot ? (
                    <section aria-label="Schnellaktionen" className="space-y-1 border-t border-border-subtle pt-2">
                      {quickActionsSlot}
                    </section>
                  ) : null}

                  {!isCollapsed ? (
                    <>
                      <StatusRail items={statusItems} />
                      {sidebarFooter}
                    </>
                  ) : null}
                </div>
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
                      {onCommandTriggerClick ? <CommandTrigger onClick={onCommandTriggerClick} aria-label={commandTriggerLabel} /> : null}
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
