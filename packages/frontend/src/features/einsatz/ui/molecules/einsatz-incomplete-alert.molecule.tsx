import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { PiWarning, PiX } from 'react-icons/pi';

interface EinsatzIncompleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: string[];
  onComplete?: () => void;
  onIgnore?: () => void;
  title?: string;
  message?: string;
  completeButtonText?: string;
  ignoreButtonText?: string;
  className?: string;
}

/**
 * EinsatzIncompleteAlert-Komponente für unvollständige Einsätze
 *
 * Zeigt einen Dialog mit Headless UI für unvollständige Einsätze mit Aktions-Buttons.
 */
export function EinsatzIncompleteAlert({
  isOpen,
  onClose,
  missingFields,
  onComplete,
  onIgnore,
  title = 'Unvollständiger Einsatz',
  message = 'Dieser Einsatz ist noch nicht vollständig ausgefüllt.',
  completeButtonText = 'Jetzt vervollständigen',
  ignoreButtonText = 'Trotzdem fortfahren',
  className,
}: EinsatzIncompleteAlertProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleComplete = () => {
    handleClose();
    onComplete?.();
  };

  const handleIgnore = () => {
    handleClose();
    onIgnore?.();
  };

  return (
    <Dialog open={isOpen && !isClosing} as="div" className="relative z-50" onClose={handleClose}>
      <DialogBackdrop transition className="fixed inset-0 bg-surface-inverse/50 backdrop-blur-sm duration-300 ease-out data-[closed]:opacity-0" />

      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className={cn(
              'relative transform overflow-hidden rounded-lg bg-surface-panel',
              'px-4 pt-5 pb-4 text-left shadow-xl',
              'sm:my-8 sm:w-full sm:max-w-lg sm:p-6',
              'duration-300 ease-out',
              'data-[closed]:translate-y-4 data-[closed]:opacity-0 sm:data-[closed]:translate-y-0 sm:data-[closed]:scale-95',
              className,
            )}
          >
            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
              <Button
                appearance="minimal"
                size="icon"
                className="rounded-md bg-surface-panel text-text-muted hover:text-text-secondary focus-visible:shadow-focus-ring focus-visible:outline-none"
                onClick={handleClose}
              >
                <span className="sr-only">Schließen</span>
                <PiX className="h-6 w-6" aria-hidden="true" />
              </Button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-status-warning-surface sm:mx-0 sm:h-10 sm:w-10">
                <PiWarning className="h-6 w-6 text-status-warning-text" aria-hidden="true" />
              </div>

              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <DialogTitle as="h3" className="text-base leading-6 font-semibold text-text-primary">
                  {title}
                </DialogTitle>

                <div className="mt-2">
                  <Description className="text-body-sm text-text-secondary">{message}</Description>

                  {missingFields.length > 0 && (
                    <div className="mt-3">
                      <p className="text-body-sm font-medium text-text-primary">Fehlende Felder:</p>
                      <ul className="mt-1 list-inside list-disc text-body-sm text-text-secondary">
                        {missingFields.map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              {onComplete && (
                <Button type="button" onClick={handleComplete} className="w-full sm:ml-3 sm:w-auto">
                  {completeButtonText}
                </Button>
              )}

              {onIgnore && (
                <Button type="button" intent="secondary" onClick={handleIgnore} className="mt-3 w-full sm:mt-0 sm:w-auto">
                  {ignoreButtonText}
                </Button>
              )}

              {!onComplete && !onIgnore && (
                <Button type="button" intent="secondary" onClick={handleClose} className="w-full sm:w-auto">
                  Schließen
                </Button>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
