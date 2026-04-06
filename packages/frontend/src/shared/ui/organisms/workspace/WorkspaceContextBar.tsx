import { Container } from '@/shared/ui/atoms/container.atom';
import { cn } from '@/shared/ui/cn';
import { DynamicLink } from '@/shared/ui/atoms/DynamicLink';
import type { ComponentType, ReactNode } from 'react';
import { PiArrowLeft } from 'react-icons/pi';

interface WorkspaceContextBarBackAction {
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface WorkspaceContextBarProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  backAction?: WorkspaceContextBarBackAction;
  endSlot?: ReactNode;
  className?: string;
  routeParams?: Record<string, string>;
}

export function WorkspaceContextBar({ title, subtitle, icon: ContextIcon, backAction, endSlot, className, routeParams }: WorkspaceContextBarProps) {
  const BackIcon = backAction?.icon ?? PiArrowLeft;

  return (
    <header className={cn('sticky top-0 z-30 border-b border-border-subtle bg-surface-panel shadow-raised', className)}>
      <Container maxWidth="full">
        <div className="py-2">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {backAction ? (
                <DynamicLink
                  to={backAction.href}
                  params={routeParams}
                  className={cn(
                    'group inline-flex items-center justify-center gap-2 rounded-control border border-transparent px-2.5 py-1 font-sans text-body-sm font-medium text-text-secondary transition-[background-color,border-color,color,box-shadow] hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none',
                  )}
                >
                  <BackIcon className="h-4 w-4" />
                  <span>{backAction.label}</span>
                </DynamicLink>
              ) : null}

              {backAction ? <div className="h-7 w-px bg-border-subtle" aria-hidden="true" /> : null}

              <div className="flex min-w-0 items-center gap-2.5">
                {ContextIcon ? <ContextIcon className="h-4.5 w-4.5 flex-shrink-0 text-status-danger-text" aria-hidden="true" /> : null}
                <div className="min-w-0">
                  <h1 className="truncate text-title-sm font-semibold text-text-primary">{title}</h1>
                  {subtitle ? <p className="truncate text-body-xs text-text-secondary">{subtitle}</p> : null}
                </div>
              </div>
            </div>

            {endSlot ? <div className="flex items-center gap-2.5">{endSlot}</div> : null}
          </div>
        </div>
      </Container>
    </header>
  );
}
