'use client';

import { cn } from '@/shared/ui/cn';
import { Combobox as HeadlessCombobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Label } from '@headlessui/react';
import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiCaretDown, PiX } from 'react-icons/pi';

export interface ComboboxItem {
  value: string;
  label: string;
  meta?: Record<string, unknown>;
}

export interface ComboboxGroup {
  label: string;
  items: ComboboxItem[];
}

export interface ComboboxProps {
  items?: Array<ComboboxItem>;
  groups?: Array<ComboboxGroup>;
  value?: string;
  onChange?: (value: string, item?: ComboboxItem) => void;
  onInputChange?: (value: string) => void;
  /** Callback bei Blur Event (fuer Form-Integration) */
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  leadingIcon?: React.ReactNode;
  className?: string;
  error?: string;
  openOnFocus?: boolean;
}

export function Combobox({
  items = [],
  groups,
  value: controlledValue,
  onChange,
  onInputChange,
  onBlur,
  placeholder = 'Wählen Sie eine Option',
  label,
  helperText,
  disabled = false,
  allowCustomValue = false,
  leadingIcon,
  className,
  error,
  openOnFocus = false,
}: ComboboxProps) {
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ComboboxItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldShowOptions = openOnFocus || query.length > 0;

  /** Alle Items (flach oder aus Gruppen zusammengefuehrt) */
  const allItems = useMemo(() => {
    if (groups) return groups.flatMap((g) => g.items);
    return items;
  }, [items, groups]);

  // Handle controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      if (query.length > 0) return;
      const item = allItems.find((i) => i.value === controlledValue);
      const nextSelected = item || (allowCustomValue && controlledValue ? { value: controlledValue, label: controlledValue } : null);
      setSelectedItem((prev) => {
        if (prev?.value === nextSelected?.value && prev?.label === nextSelected?.label) {
          return prev;
        }
        return nextSelected;
      });
    }
  }, [controlledValue, allItems, allowCustomValue, query]);

  const filteredItems = useMemo(() => {
    if (!shouldShowOptions) return [];
    return query === ''
      ? allItems
      : allItems.filter((item) => {
          return item.label.toLowerCase().includes(query.toLowerCase());
        });
  }, [query, allItems, shouldShowOptions]);

  /** Gruppen gefiltert (nur nicht-leere Gruppen) */
  const filteredGroups = useMemo(() => {
    if (!shouldShowOptions) return undefined;
    if (!groups) return undefined;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: q === '' ? g.items : g.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, shouldShowOptions]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.length > 0) {
        setSelectedItem(null);
      }
      onInputChange?.(value);
    },
    [onInputChange],
  );

  const handleSelectionChange = (item: ComboboxItem | null) => {
    setSelectedItem(item);
    if (item) {
      onChange?.(item.value, item);
      setQuery('');
      onInputChange?.('');
    } else {
      onChange?.('');
    }
  };

  const showClearButton = query !== '' || selectedItem !== null;

  const handleClear = () => {
    setQuery('');
    setSelectedItem(null);
    onChange?.('');
    onInputChange?.('');

    if (inputRef.current) {
      inputRef.current.value = '';
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <HeadlessCombobox as="div" value={selectedItem} onChange={handleSelectionChange} disabled={disabled} immediate={openOnFocus}>
        {label && <Label className="block font-medium text-gray-900 text-sm/6 dark:text-white">{label}</Label>}
        <div className="relative mt-2">
          {leadingIcon && <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">{leadingIcon}</div>}
          <ComboboxInput
            ref={inputRef}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-11 text-foreground text-sm shadow-sm transition-colors',
              'placeholder:text-muted-foreground',
              'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leadingIcon && 'pl-10',
              showClearButton && 'pr-[4.5rem]',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            )}
            autoCorrect={'off'}
            autoComplete={'off'}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={placeholder}
            onChange={(event) => handleQueryChange(event.target.value)}
            onBlur={() => {
              const queryValue = query.trim();

              if (allowCustomValue && queryValue.length > 0) {
                const match = allItems.find((item) => item.label.toLowerCase() === queryValue.toLowerCase() || item.value.toLowerCase() === queryValue.toLowerCase());
                const nextItem = match ?? { value: queryValue, label: queryValue };
                setSelectedItem(nextItem);
                onChange?.(nextItem.value, nextItem);
                setQuery('');
                onInputChange?.('');
              } else if (!allowCustomValue) {
                setQuery('');
                onInputChange?.('');
              }
              onBlur?.();
            }}
            displayValue={(item: ComboboxItem | null) => {
              if (query.length > 0) return query;
              if (item) return item.label;
              return '';
            }}
            disabled={disabled}
          />

          <div className="absolute inset-y-0 right-0 flex items-center">
            {showClearButton && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                aria-label="Clear selection"
                tabIndex={0}
              >
                <PiX className="h-4 w-4" />
              </button>
            )}
            <ComboboxButton className="px-2 text-muted-foreground focus:outline-none disabled:opacity-50">
              <PiCaretDown className="size-4" aria-hidden="true" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            transition
            className={cn(
              'absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground text-sm shadow-md',
              'data-[closed]:pointer-events-none data-[closed]:hidden',
              'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
            )}
          >
            {filteredItems.length === 0 && query !== '' ? (
              <div className="px-2 py-1.5 text-muted-foreground text-sm">{allowCustomValue ? `Keine Übereinstimmung für "${query}"` : 'Keine Ergebnisse gefunden'}</div>
            ) : filteredGroups ? (
              filteredGroups.map((group) => (
                <div key={group.label}>
                  <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">{group.label}</div>
                  {group.items.map((item) => (
                    <ComboboxOption
                      key={item.value}
                      value={item}
                      className={cn('cursor-default select-none rounded-sm px-2 py-1.5 text-foreground', 'data-[focus]:bg-accent data-[focus]:text-accent-foreground data-[focus]:outline-none')}
                    >
                      <span className="block truncate">{item.label}</span>
                    </ComboboxOption>
                  ))}
                </div>
              ))
            ) : (
              filteredItems.map((item) => (
                <ComboboxOption
                  key={item.value}
                  value={item}
                  className={cn('cursor-default select-none rounded-sm px-2 py-1.5 text-foreground', 'data-[focus]:bg-accent data-[focus]:text-accent-foreground data-[focus]:outline-none')}
                >
                  <span className="block truncate">{item.label}</span>
                </ComboboxOption>
              ))
            )}
            {allowCustomValue && query.length > 0 && !allItems.some((item) => item.label.toLowerCase() === query.toLowerCase()) && (
              <ComboboxOption
                value={{ value: query, label: query }}
                className={cn('cursor-default select-none rounded-sm px-2 py-1.5 text-foreground', 'data-[focus]:bg-accent data-[focus]:text-accent-foreground data-[focus]:outline-none')}
              >
                <span className="block truncate">"{query}" (neu erstellen)</span>
              </ComboboxOption>
            )}
          </ComboboxOptions>
        </div>
      </HeadlessCombobox>

      {(helperText || error) && <p className={cn('mt-2 text-sm', error ? 'text-destructive' : 'text-muted-foreground')}>{error || helperText}</p>}
    </div>
  );
}
