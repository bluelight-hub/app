import { cn } from '@/shared/ui/cn';
import { forwardRef, type ComponentRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PiCalendar } from 'react-icons/pi';

export interface DateInputProps {
  value?: string | Date | null;
  onChange?: (date: Date | null) => void;
  onBlur?: () => void;
  showIcon?: boolean;
  includeTime?: boolean;
  showNatoFormat?: boolean;
  min?: Date;
  max?: Date;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * DateInput Atom Component
 *
 * Advanced date/time picker with NATO DateTime format support
 * Uses react-datepicker with custom styling
 */
export const DateInput = forwardRef<ComponentRef<typeof DatePicker>, DateInputProps>(
  ({ value, onChange, onBlur, showIcon = true, includeTime = false, showNatoFormat = false, min, max, placeholder, className, id, disabled = false, ...props }, ref) => {
    // Convert string value to Date object if needed
    const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;

    return (
      <div className="relative">
        <DatePicker
          ref={ref}
          id={id}
          selected={dateValue}
          onChange={onChange}
          onBlur={onBlur}
          // customInput={<CustomInput />}
          className={cn(
            'block w-full rounded-control border bg-surface-panel font-medium text-text-primary',
            'transition-all duration-200 placeholder:text-text-muted',
            'focus:border-action-primary focus-visible:shadow-focus-ring focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'border-border-subtle hover:border-border-strong',
            'px-3 py-1.5 text-sm',
            showIcon && 'pr-12',
            className,
          )}
          dateFormat={showNatoFormat ? 'dd HHmm MMM yy' : includeTime ? 'dd.MM.yyyy, HH:mm' : 'dd.MM.yyyy'}
          showTimeSelect={includeTime}
          timeFormat="HHmm"
          timeIntervals={15}
          minDate={min}
          maxDate={max}
          disabled={disabled}
          locale="de"
          placeholderText={placeholder}
          wrapperClassName="w-full"
          timeCaption="Zeit"
          timeInputLabel="Zeit:"
          showTimeInput
          showDateSelect
          showMonthDropdown
          showYearDropdown
          showWeekNumbers
          autoComplete="off"
          popperClassName="z-50"
          popperPlacement="bottom-start"
          {...props}
        />
        {showIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <PiCalendar className="h-5 w-5 text-text-muted" />
          </div>
        )}
      </div>
    );
  },
);

DateInput.displayName = 'DateInput';
