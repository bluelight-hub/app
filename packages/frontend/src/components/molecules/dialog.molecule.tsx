import * as React from 'react';
import { DialogPanel, DialogTitle, Dialog as HeadlessDialog, Transition, TransitionChild } from '@headlessui/react';
import { PiX } from 'react-icons/pi';

import { cn } from '@/utils/cn.ts';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Dialog Molecule Component
 *
 * Wiederverwendbare Dialog-Komponente basierend auf Headless UI
 */
export const Dialog = ({ isOpen, onClose, children, className }: DialogProps) => {
  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className={cn('w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all dark:bg-gray-800', className)}>{children}</DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

Dialog.Title = ({ children, className }: DialogTitleProps) => {
  return (
    <DialogTitle as="h3" className={cn('text-lg font-semibold leading-6 text-gray-900 dark:text-white', className)}>
      {children}
    </DialogTitle>
  );
};

Dialog.Body = ({ children, className }: DialogBodyProps) => {
  return <div className={cn('mt-4', className)}>{children}</div>;
};

Dialog.Footer = ({ children, className }: DialogFooterProps) => {
  return <div className={cn('mt-6 flex items-center justify-end gap-3', className)}>{children}</div>;
};

Dialog.CloseButton = ({ onClose }: { onClose: () => void }) => {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
    >
      <PiX className="h-5 w-5" />
    </button>
  );
};
