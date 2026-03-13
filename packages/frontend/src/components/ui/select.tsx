import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { PiCaretDown, PiCheck } from 'react-icons/pi';

import { cn } from '@/lib/utils';
import { resolveActiveThemeScope, resolveThemeScope } from '@/components/ui/theme-scope';

interface SelectContextValue {
  triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  return React.useContext(SelectContext);
}

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);

  return (
    <SelectContext.Provider value={{ triggerElement, setTriggerElement }}>
      <SelectPrimitive.Root data-slot="select" {...props} />
    </SelectContext.Provider>
  );
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  const context = useSelectContext();

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      ref={(node) => {
        context?.setTriggerElement(node);
      }}
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <PiCaretDown className="size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

type SelectContentProps = React.ComponentProps<typeof SelectPrimitive.Content> & {
  portalProps?: React.ComponentProps<typeof SelectPrimitive.Portal>;
};

function SelectContent({ className, children, position = 'popper', portalProps, ...props }: SelectContentProps) {
  const context = useSelectContext();
  const activeThemeScope = resolveActiveThemeScope();
  const triggerThemeScope = resolveThemeScope(context?.triggerElement);
  const portalContainer = portalProps?.container ?? triggerThemeScope.container ?? activeThemeScope.container;
  const themeScopeClassName = resolveThemeScope(portalContainer).className ?? triggerThemeScope.className ?? activeThemeScope.className;

  return (
    <SelectPrimitive.Portal {...portalProps} container={portalContainer}>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          themeScopeClassName,
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl',
          position === 'popper' && 'data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]')}>
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn('px-2 py-1.5 font-medium text-muted-foreground text-xs', className)} {...props} />;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <PiCheck className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue };
