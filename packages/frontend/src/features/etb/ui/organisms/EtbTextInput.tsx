import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';

interface EtbTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Text-Eingabe-Komponente für ETB-Einträge
 */
export function EtbTextInput({ value, onChange, onBlur, error, maxLength = 2000, disabled = false }: EtbTextInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1">
      <label htmlFor="etb-text" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
        Text
      </label>

      <Textarea
        id="etb-text"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        rows={3}
        disabled={disabled}
        variant={error ? 'error' : 'default'}
        textareaSize="sm"
        placeholder="Beschreiben Sie das Ereignis oder die Maßnahme..."
        maxLength={maxLength}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {error && (
            <p className="text-red-600 text-sm dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="ml-2">
          <span
            className={cn(
              'text-gray-500 text-sm dark:text-gray-400',
              value.length >= maxLength * 0.9 && 'text-amber-600 dark:text-amber-400',
              value.length >= maxLength && 'text-red-600 dark:text-red-400',
            )}
            title={`${value.length} von ${maxLength} Zeichen verwendet`}
          >
            {value.length} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
