'use client';

import { ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Combobox as HeadlessCombobox, Label } from '@headlessui/react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { PiCaretDown, PiX } from 'react-icons/pi';

import { cn } from '@/utils/cn.ts';

export interface ComboboxItem {
  value: string;
  label: string;
}

export interface ComboboxProps {
  items?: Array<ComboboxItem>;
  value?: string;
  onChange?: (value: string) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  leadingIcon?: React.ReactNode;
  className?: string;
  error?: string;
}

export function Combobox({
  items = [],
  value: controlledValue,
  onChange,
  onInputChange,
  placeholder = 'Select an option...',
  label,
  helperText,
  disabled = false,
  allowCustomValue = false,
  leadingIcon,
  className,
  error,
}: ComboboxProps) {
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ComboboxItem | null>(null);

  // Handle controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      const item = items.find((i) => i.value === controlledValue);
      setSelectedItem(item || (allowCustomValue && controlledValue ? { value: controlledValue, label: controlledValue } : null));
    }
  }, [controlledValue, items, allowCustomValue]);

  const filteredItems =
    query === ''
      ? items
      : items.filter((item) => {
          return item.label.toLowerCase().includes(query.toLowerCase());
        });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onInputChange?.(value);
  };

  const handleSelectionChange = (item: ComboboxItem | null) => {
    setSelectedItem(item);
    if (item) {
      onChange?.(item.value);
      setQuery('');
    }
  };

  const showClearButton = query !== '' || selectedItem !== null;

  const handleClear = () => {
    setQuery('');
    setSelectedItem(null);
    onChange?.('');
    onInputChange?.('');
  };

  return (
    <div className={cn('w-full', className)}>
      <HeadlessCombobox as="div" value={selectedItem} onChange={handleSelectionChange} disabled={disabled}>
        {label && <Label className="block text-sm/6 font-medium text-gray-900 dark:text-white">{label}</Label>}
        <div className="relative mt-2">
          {leadingIcon && <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500 dark:text-gray-400">{leadingIcon}</div>}
          <ComboboxInput
            className={cn(
              'block w-full rounded-lg border-2 bg-gray-50 px-4 py-3 pr-12 text-base font-medium text-gray-900',
              'transition-all duration-200',
              'border-gray-200',
              'placeholder:text-gray-400',
              'focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20',
              'sm:text-sm/6',
              'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
              'dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:bg-gray-800 dark:focus:ring-blue-400',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leadingIcon && 'pl-12',
              showClearButton && 'pr-20',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-400 dark:focus:ring-red-400',
            )}
            autoCorrect={'off'}
            placeholder={placeholder}
            onChange={(event) => handleQueryChange(event.target.value)}
            onBlur={() => {
              if (!allowCustomValue) {
                setQuery('');
              }
            }}
            displayValue={(item: ComboboxItem | null) => item?.label || query}
            disabled={disabled}
          />

          <div className="absolute inset-y-0 right-0 flex items-center">
            {showClearButton && !disabled && (
              <button type="button" onClick={handleClear} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <PiX className="h-4 w-4" />
              </button>
            )}
            <ComboboxButton className="px-2 focus:outline-none disabled:opacity-50">
              <PiCaretDown className="size-5 text-gray-400" aria-hidden="true" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            transition
            className={cn(
              'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg',
              'border border-gray-200',
              'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
              'sm:text-sm',
              'dark:border-gray-700 dark:bg-gray-800 dark:shadow-none',
            )}
          >
            {allowCustomValue && query.length > 0 && !items.some((item) => item.label.toLowerCase() === query.toLowerCase()) && (
              <ComboboxOption
                value={{ value: query, label: query }}
                className={cn(
                  'cursor-default select-none px-3 py-2 text-gray-900',
                  'data-[focus]:bg-primary-600 data-[focus]:text-white data-[focus]:outline-none',
                  'dark:data-[focus]:bg-primary-500 dark:text-gray-300',
                )}
              >
                <span className="block truncate">"{query}" (neu erstellen)</span>
              </ComboboxOption>
            )}

            {filteredItems.length === 0 && query !== '' ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{allowCustomValue ? `Keine Übereinstimmung für "${query}"` : 'Keine Ergebnisse gefunden'}</div>
            ) : (
              filteredItems.map((item) => (
                <ComboboxOption
                  key={item.value}
                  value={item}
                  className={cn(
                    'cursor-default select-none px-3 py-2 text-gray-900',
                    'data-[focus]:bg-primary-600 data-[focus]:text-white data-[focus]:outline-none',
                    'dark:data-[focus]:bg-primary-500 dark:text-gray-300',
                  )}
                >
                  <span className="block truncate">{item.label}</span>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </HeadlessCombobox>

      {(helperText || error) && <p className={cn('mt-2 text-sm', error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}>{error || helperText}</p>}
    </div>
  );
}
