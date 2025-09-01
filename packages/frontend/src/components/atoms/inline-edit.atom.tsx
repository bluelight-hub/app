import { cn } from '@/utils/cn.ts';
import { Button } from '@atoms/button.atom';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  validate?: (value: string) => string | null;
  placeholder?: string;
  className?: string;
  editClassName?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
}

/**
 * InlineEdit-Komponente für inline-editierbare Texte
 *
 * Ermöglicht das direkte Bearbeiten von Text mit Escape/Enter-Handling und Validierung.
 */
export function InlineEdit({
  value,
  onSave,
  validate,
  placeholder = 'Zum Editieren hier klicken oder Eingabe starten',
  className,
  editClassName,
  disabled = false,
  multiline = false,
  maxLength,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (disabled && !isEditing) {
    return <span className={cn('text-gray-700 dark:text-gray-300', className)}>{value || placeholder}</span>;
  }

  if (!isEditing) {
    return (
      <Button
        onClick={() => setIsEditing(true)}
        className={cn(
          'text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800',
          '-mx-2 -my-1 rounded px-2 py-1',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
          !value && 'text-gray-400 italic dark:text-gray-500',
          className,
        )}
        disabled={disabled}
      >
        {value || placeholder}
      </Button>
    );
  }

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError(null);
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        disabled={isSaving}
        className={cn(
          'w-full rounded border px-2 py-1',
          'focus:outline-none focus:ring-2',
          error ? 'border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:ring-red-400' : 'border-gray-300 focus:ring-primary-500 dark:border-gray-600 dark:focus:ring-primary-400',
          'bg-white dark:bg-gray-900',
          'text-gray-900 dark:text-gray-100',
          'disabled:cursor-not-allowed disabled:opacity-50',
          multiline && 'resize-none',
          editClassName,
        )}
        rows={multiline ? 3 : undefined}
        placeholder={placeholder}
      />
      {error && <div className="absolute top-full left-0 mt-1 text-red-600 text-sm dark:text-red-400">{error}</div>}
      {multiline && <div className="mt-1 text-gray-500 text-xs dark:text-gray-400">Strg+Enter zum Speichern, Esc zum Abbrechen</div>}
    </div>
  );
}
