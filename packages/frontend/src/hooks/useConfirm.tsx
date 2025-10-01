import { Dialog } from '@/components/molecules/dialog.molecule';
import type React from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireConfirmation?: boolean;
}

interface ConfirmContextValue {
  confirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    title: 'Bestätigung erforderlich',
  });

  const promiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      promiseResolveRef.current = resolve;

      const options = typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

      setState({
        isOpen: true,
        title: 'Bestätigung erforderlich',
        confirmLabel: 'Bestätigen',
        cancelLabel: 'Abbrechen',
        variant: 'warning',
        requireConfirmation: false,
        ...options,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (promiseResolveRef.current) {
      promiseResolveRef.current(true);
      promiseResolveRef.current = null;
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    if (promiseResolveRef.current) {
      promiseResolveRef.current(false);
      promiseResolveRef.current = null;
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog.Confirm
        isOpen={state.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={state.title || 'Bestätigung erforderlich'}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        requireConfirmation={state.requireConfirmation}
      />
    </ConfirmContext.Provider>
  );
};

/**
 * Hook für einfache Bestätigungsdialoge
 *
 * @example
 * ```tsx
 * const confirm = useConfirm();
 *
 * // Einfache Verwendung (wie window.confirm)
 * if (await confirm('Möchten Sie fortfahren?')) {
 *   // User hat bestätigt
 * }
 *
 * // Erweiterte Verwendung mit Optionen
 * if (await confirm({
 *   title: 'Löschen bestätigen',
 *   message: 'Dieser Vorgang kann nicht rückgängig gemacht werden.',
 *   variant: 'danger',
 *   confirmLabel: 'Löschen',
 *   cancelLabel: 'Abbrechen'
 * })) {
 *   // User hat bestätigt
 * }
 * ```
 */
export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context.confirm;
};
