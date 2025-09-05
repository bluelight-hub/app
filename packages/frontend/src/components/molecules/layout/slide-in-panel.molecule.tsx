import { cn } from '@/utils/cn';
import { Button } from '@atoms/button.atom';
import { Description, Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';
import { PiX } from 'react-icons/pi';

interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'left' | 'right';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
};

export function SlideInPanel({ isOpen, onClose, title, description, children, size = 'lg', position = 'right', showCloseButton = true, closeOnBackdropClick = true, className }: SlideInPanelProps) {
  const slideFrom = position === 'right' ? 'translate-x-full' : '-translate-x-full';
  const positionClasses = position === 'right' ? 'right-0' : 'left-0';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeOnBackdropClick ? onClose : () => {}}>
        {/* Backdrop */}
        <TransitionChild as={Fragment} enter="ease-in-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in-out duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={cn('pointer-events-none fixed inset-y-0 flex', positionClasses, sizeClasses[size])}>
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={slideFrom}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo={slideFrom}
              >
                <DialogPanel className={cn('pointer-events-auto relative w-screen', sizeClasses[size], className)}>
                  <div className="flex h-full flex-col bg-white shadow-2xl dark:bg-gray-900">
                    {/* Header */}
                    <div className="border-gray-200 border-b px-6 py-4 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <DialogTitle className="font-semibold text-gray-900 text-xl leading-6 dark:text-white">{title}</DialogTitle>
                          {description && <Description className="mt-1 text-gray-500 text-sm dark:text-gray-400">{description}</Description>}
                        </div>
                        {showCloseButton && (
                          <Button variant="minimal" size="icon" className="ml-4" onClick={onClose} aria-label="Schließen">
                            <PiX className="h-6 w-6" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative flex-1 overflow-y-auto px-6 py-6">{children}</div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
