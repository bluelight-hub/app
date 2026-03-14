import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { PiX } from 'react-icons/pi';

import { cn } from '@/lib/utils';
import { resolveActiveThemeScope, resolveThemeScope } from '@/components/ui/theme-scope';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=closed]:animate-out data-[state=open]:animate-in',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 border border-border bg-background p-6 text-foreground shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

type SheetContentProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    showCloseButton?: boolean;
    overlayClassName?: string;
    portalProps?: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>;
  };

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = 'right', className, children, showCloseButton = true, overlayClassName, portalProps, ...props }, ref) => {
    const activeThemeScope = resolveActiveThemeScope();
    const portalContainer = portalProps?.container ?? activeThemeScope.container;
    const themeScopeClassName = resolveThemeScope(portalContainer).className ?? activeThemeScope.className;

    return (
      <SheetPortal {...portalProps} container={portalContainer}>
        <SheetOverlay className={cn(themeScopeClassName, overlayClassName)} />
        <SheetPrimitive.Content ref={ref} data-slot="sheet-content" className={cn(themeScopeClassName, sheetVariants({ side }), className)} {...props}>
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <PiX className="size-4" />
              <span className="sr-only">Schließen</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

const SheetTitle = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Title>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} data-slot="sheet-title" className={cn('font-semibold text-foreground', className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Description>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} data-slot="sheet-description" className={cn('text-muted-foreground text-sm', className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };
