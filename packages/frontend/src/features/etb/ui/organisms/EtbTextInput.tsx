import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { useId } from 'react';

interface EtbTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  error?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Text-Eingabe-Komponente für ETB-Einträge
 *
 * Unterstützt CMD+Enter (Mac) / CTRL+Enter (Windows/Linux) zum Absenden.
 */
export function EtbTextInput({ value, onChange, onBlur, onSubmit, error, maxLength = 2000, disabled = false }: EtbTextInputProps) {
  const id = useId();
  const textareaId = `${id}-etb-text`;
  const errorId = `${id}-etb-text-error`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={textareaId} className="block text-sm font-medium text-text-secondary">
        Text
        <span className="sr-only"> — Strg/Cmd + Enter zum Speichern</span>
      </label>

      <Textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={disabled}
        variant={error ? 'error' : 'default'}
        textareaSize="sm"
        placeholder="Beschreiben Sie das Ereignis oder die Maßnahme..."
        maxLength={maxLength}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        className="focus-visible:shadow-focus-ring"
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {error && (
            <p id={errorId} className="text-sm text-status-danger-text" aria-live="polite">
              {error}
            </p>
          )}
        </div>

        <div className="ml-2">
          <span
            className={cn('text-sm text-text-secondary', value.length >= maxLength * 0.9 && 'text-status-warning-text', value.length >= maxLength && 'text-status-danger-text')}
            title={`${value.length} von ${maxLength} Zeichen verwendet`}
          >
            {value.length} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
