import { useCallback, useEffect, useId, useRef } from 'react';
import { PiKeyboard, PiX } from 'react-icons/pi';
import { getEigenschutzShortcutsForContext, type EigenschutzShortcutContext } from '../../constants/shortcuts.constants';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Kbd } from '@/shared/ui/atoms/kbd.atom';

interface EigenschutzShortcutHelpPopoverProps {
  readonly context: EigenschutzShortcutContext;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function EigenschutzShortcutHelpPopover({ context, open, onOpenChange }: EigenschutzShortcutHelpPopoverProps) {
  const dialogId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousOpenRef = useRef(open);
  const shortcuts = getEigenschutzShortcutsForContext(context);
  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      previousOpenRef.current = true;
      return;
    }

    if (previousOpenRef.current) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    previousOpenRef.current = false;
  }, [open]);

  return (
    <div className="relative inline-flex">
      <Button
        ref={triggerRef}
        type="button"
        intent="secondary"
        appearance="outline"
        size="sm"
        kbd="?"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => onOpenChange(!open)}
        data-testid="eigenschutz-shortcut-help-trigger"
      >
        <PiKeyboard className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Shortcuts</span>
      </Button>

      {open ? (
        <section
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-testid="eigenschutz-shortcut-help"
          className="absolute top-full right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-panel border border-border-subtle bg-surface-overlay p-3 text-text-primary shadow-raised"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-title-sm font-semibold">
                Tastaturhilfe
              </h2>
              <p className="mt-1 text-body-xs text-text-secondary">Aktive Kürzel für diese Eigenschutz-Fläche.</p>
            </div>
            <Button
              ref={closeButtonRef}
              type="button"
              intent="secondary"
              appearance="ghost"
              size="icon"
              aria-label="Tastaturhilfe schließen"
              onClick={close}
              data-testid="eigenschutz-shortcut-help-close"
            >
              <PiX className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-3 max-h-[min(28rem,70vh)] overflow-y-auto">
            <table className="w-full table-fixed border-separate border-spacing-y-1 text-left text-body-sm">
              <thead>
                <tr className="text-body-xs text-text-muted">
                  <th scope="col" className="w-28 pr-2 font-medium">
                    Taste
                  </th>
                  <th scope="col" className="font-medium">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((shortcut) => (
                  <tr key={shortcut.id} className="align-top">
                    <td className="py-1 pr-2">
                      {shortcut.displayKeys ? (
                        <span className="flex flex-wrap gap-1" aria-label={shortcut.displayKeys.map((key) => key).join(' oder ')}>
                          {shortcut.displayKeys.map((key) => (
                            <Kbd key={key} keys={key} size="sm" />
                          ))}
                        </span>
                      ) : (
                        <Kbd keys={shortcut.keys} size="sm" />
                      )}
                    </td>
                    <td className="py-1">
                      <p className="font-medium text-text-primary">{shortcut.label}</p>
                      <p className="text-body-xs text-text-secondary">{shortcut.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
