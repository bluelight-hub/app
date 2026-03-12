'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { usePublicUsers } from '@/features/auth';
import type { AuthRequestDto } from '@/shared';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { cn } from '@/shared/ui/cn';
import { useForm } from '@tanstack/react-form';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PiCaretDown, PiUser } from 'react-icons/pi';
import { z } from 'zod';

const authSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Mindestens 3 Zeichen erforderlich')
    .max(30, 'Maximal 30 Zeichen erlaubt')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nur Buchstaben, Zahlen, Unterstriche und Bindestriche erlaubt'),
});

interface UsernameOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface UsernameComboboxProps {
  id: string;
  value: string;
  items: UsernameOption[];
  onChange: (value: string) => void;
  onValueChange?: () => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  error?: string;
  leadingIcon?: React.ReactNode;
}

function UsernameCombobox({ id, value, items, onChange, onValueChange, placeholder, label, disabled = false, error, leadingIcon }: UsernameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [anchorWidth, setAnchorWidth] = useState<number>();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;
  const errorId = `${id}-error`;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setPortalContainer(anchorRef.current?.closest('.auth-theme'));
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  const hasExactMatch = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return false;
    return items.some((item) => item.label.toLowerCase() === normalizedQuery || item.value.toLowerCase() === normalizedQuery);
  }, [items, query]);

  const selectableItems = useMemo<UsernameOption[]>(() => {
    const result = [...filteredItems];
    const trimmedQuery = query.trim();

    if (trimmedQuery.length > 0 && !hasExactMatch) {
      result.push({
        value: trimmedQuery,
        label: `"${trimmedQuery}" verwenden`,
        isCustom: true,
      });
    }

    return result;
  }, [filteredItems, hasExactMatch, query]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    if (selectableItems.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const matchingIndex = selectableItems.findIndex((item) => item.value.toLowerCase() === normalizedQuery || item.label.toLowerCase() === normalizedQuery);
    setHighlightedIndex(matchingIndex >= 0 ? matchingIndex : 0);
  }, [open, query, selectableItems]);

  const updateAnchorWidth = () => {
    if (!anchorRef.current) return;
    setAnchorWidth(anchorRef.current.offsetWidth);
  };

  const handleSelect = (nextValue: string) => {
    if (nextValue !== value) {
      onValueChange?.();
    }
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(false);
  };

  const getOptionId = (index: number): string => `${id}-option-${index}`;
  const activeOptionId = open && highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined;

  const moveHighlight = (direction: 'up' | 'down') => {
    if (selectableItems.length === 0) return;

    setHighlightedIndex((previous) => {
      if (previous < 0) {
        return direction === 'down' ? 0 : selectableItems.length - 1;
      }

      if (direction === 'down') {
        return previous === selectableItems.length - 1 ? 0 : previous + 1;
      }

      return previous === 0 ? selectableItems.length - 1 : previous - 1;
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium text-gray-700 text-sm dark:text-gray-300">
        {label}
      </label>

      <Popover
        open={open && !disabled}
        onOpenChange={(nextOpen) => {
          if (disabled) return;
          if (nextOpen) {
            updateAnchorWidth();
          }
          setOpen(nextOpen);
        }}
      >
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative">
            {leadingIcon && <div className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500">{leadingIcon}</div>}

            <Input
              id={id}
              type="text"
              value={query}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={disabled}
              role="combobox"
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-activedescendant={activeOptionId}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onFocus={() => {
                updateAnchorWidth();
                setOpen(true);
              }}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue !== value) {
                  onValueChange?.();
                }
                setQuery(nextValue);
                onChange(nextValue);
                if (!open) {
                  updateAnchorWidth();
                  setOpen(true);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (!open) {
                    updateAnchorWidth();
                    setOpen(true);
                    return;
                  }
                  moveHighlight('down');
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (!open) {
                    updateAnchorWidth();
                    setOpen(true);
                    return;
                  }
                  moveHighlight('up');
                }
                if (event.key === 'Enter' && open && highlightedIndex >= 0) {
                  event.preventDefault();
                  const highlightedItem = selectableItems[highlightedIndex];
                  if (highlightedItem) {
                    handleSelect(highlightedItem.value);
                  }
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
              className={cn(
                'h-11 rounded-lg border-slate-300 bg-white/95 text-slate-900 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-sky-500/35 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100',
                leadingIcon && 'pl-10',
                error && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30',
              )}
            />

            <button
              type="button"
              tabIndex={-1}
              aria-label="Benutzerliste öffnen"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                updateAnchorWidth();
                setOpen((current) => !current);
              }}
            >
              <PiCaretDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </button>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="z-[70] overflow-hidden border-border bg-popover p-0 shadow-lg"
          portalProps={portalContainer ? { container: portalContainer } : undefined}
          style={{ width: anchorWidth ? `${anchorWidth}px` : undefined }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target;
            if (target instanceof Node && anchorRef.current?.contains(target)) {
              event.preventDefault();
            }
          }}
        >
          <div id={listboxId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
            {selectableItems.length === 0 ? (
              <p className="px-2 py-2 text-muted-foreground text-sm">Keine Treffer</p>
            ) : (
              <div className="space-y-0.5">
                {selectableItems.map((item, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const isSelected = item.value === value;
                  return (
                    <button
                      type="button"
                      id={getOptionId(index)}
                      key={item.value}
                      role="option"
                      aria-selected={isSelected}
                      className={cn('w-full rounded-sm px-2 py-1.5 text-left text-sm', isHighlighted ? 'bg-accent text-accent-foreground' : 'text-popover-foreground')}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(item.value)}
                    >
                      {item.isCustom ? item.label : item.value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <p id={errorId} className="text-red-600 text-sm dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export interface UnifiedAuthFormProps {
  onSubmit: (values: AuthRequestDto) => Promise<void> | void;
  isLoading?: boolean;
  error?: Error | null;
  errorMessage?: string | null;
  onValueChange?: () => void;
  className?: string;
}

/**
 * Vereinheitlichtes Auth-Formular mit Combobox für Benutzerauswahl
 *
 * Ermöglicht sowohl die Auswahl bestehender Benutzer als auch
 * die Eingabe neuer Benutzernamen für automatische Registrierung.
 */
export function UnifiedAuthForm({ onSubmit, isLoading = false, error, errorMessage, onValueChange, className }: UnifiedAuthFormProps) {
  const { data: usersData } = usePublicUsers();
  const usernameInputId = useId();
  const hasSubmissionError = Boolean(errorMessage || error);
  const submissionErrorMessage = errorMessage?.trim() || error?.message?.trim() || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';

  const comboboxItems = useMemo(
    () =>
      usersData?.map((user) => ({
        value: user.username,
        label: user.username,
      })) || [],
    [usersData],
  );

  const form = useForm({
    defaultValues: {
      username: '',
    },
    validators: {
      onChange: authSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ username: value.username });
    },
  });

  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50 dark:shadow-none', className)}>
      <div className="space-y-2">
        <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">
          Zugang
        </Text>
        <Heading size="lg" as="h2">
          Mit Benutzerprofil anmelden
        </Heading>
        <Text size="sm" color="muted">
          Bestehende Namen erscheinen in der Liste. Neue Namen werden beim ersten erfolgreichen Einstieg automatisch angelegt.
        </Text>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          await form.handleSubmit();
        }}
        className="mt-6 space-y-6"
      >
        <div className="space-y-4">
          <form.Field name="username">
            {(field) => {
              const fieldError = field.state.meta.errors[0];
              const validationMessage = typeof fieldError === 'string' ? fieldError : fieldError?.message;

              return (
                <UsernameCombobox
                  id={usernameInputId}
                  items={comboboxItems}
                  value={field.state.value}
                  onChange={(nextValue) => field.handleChange(nextValue)}
                  onValueChange={onValueChange}
                  placeholder="Benutzername eingeben oder auswählen..."
                  label="Benutzername"
                  disabled={isLoading || form.state.isSubmitting}
                  leadingIcon={<PiUser className="h-4 w-4" />}
                  error={validationMessage || (hasSubmissionError ? submissionErrorMessage : undefined)}
                />
              );
            }}
          </form.Field>
        </div>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="space-y-3">
              <Button type="submit" size="lg" className="h-10 w-full rounded-md text-sm" disabled={!canSubmit || isLoading || isSubmitting}>
                {(isLoading || isSubmitting) && <InlineSpinner size="sm" className="mr-1.5 text-current" label="Anmeldung wird vorbereitet" />}
                {isLoading || isSubmitting ? 'Anmeldung wird vorbereitet...' : 'Anmeldung starten'}
              </Button>
            </div>
          )}
        </form.Subscribe>

        {hasSubmissionError && <Alert status="error" title="Anmeldung fehlgeschlagen" description={submissionErrorMessage} />}
      </form>
    </div>
  );
}
