import * as React from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { resolveActiveThemeScope, resolveThemeScope } from '@/components/ui/theme-scope';

interface DropdownMenuContextValue {
  triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  return React.useContext(DropdownMenuContext);
}

function DropdownMenu({ ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);

  return (
    <DropdownMenuContext.Provider value={{ triggerElement, setTriggerElement }}>
      <DropdownMenuPrimitive.Root {...props} />
    </DropdownMenuContext.Provider>
  );
}

const DropdownMenuTrigger = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>>(({ ...props }, ref) => {
  const context = useDropdownMenuContext();

  return (
    <DropdownMenuPrimitive.Trigger
      ref={(node) => {
        context?.setTriggerElement(node);

        if (typeof ref === 'function') {
          ref(node);
          return;
        }

        if (ref) {
          ref.current = node;
        }
      }}
      {...props}
    />
  );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
  portalProps?: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>;
};

const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Content>, DropdownMenuContentProps>(({ className, sideOffset = 4, portalProps, ...props }, ref) => {
  const context = useDropdownMenuContext();
  const activeThemeScope = resolveActiveThemeScope();
  const triggerThemeScope = resolveThemeScope(context?.triggerElement);
  const portalContainer = portalProps?.container ?? triggerThemeScope.container ?? activeThemeScope.container;
  const themeScopeClassName = resolveThemeScope(portalContainer).className ?? triggerThemeScope.className ?? activeThemeScope.className;

  return (
    <DropdownMenuPrimitive.Portal {...portalProps} container={portalContainer}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          themeScopeClassName,
          'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[state=closed]:animate-out data-[state=open]:animate-in',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>>(
  ({ className, ...props }, ref) => <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />,
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuTrigger };
