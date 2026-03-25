import { Button } from '@/shared/ui/atoms/button.atom';
import { PiCheckCircle, PiWarningCircle, PiX } from 'react-icons/pi';

interface EtbTextbausteinPreviewProps {
  text: string;
  onApply: () => void;
  onCancel: () => void;
}

/**
 * Preview banner for pending Textbaustein changes
 */
export function EtbTextbausteinPreview({ text, onApply, onCancel }: EtbTextbausteinPreviewProps) {
  return (
    <div className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3">
      <div className="flex items-start gap-2">
        <PiWarningCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning-text" />
        <div className="flex-grow">
          <p className="text-sm font-medium text-status-warning-text">Textbaustein-Vorschau</p>
          <p className="mt-1 text-sm text-text-secondary">Der vorhandene Text wird ersetzt mit:</p>
          <div className="mt-2 rounded border border-border-subtle bg-surface-panel p-2">
            <p className="line-clamp-2 text-sm text-text-primary">{text}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" intent="primary" onClick={onApply}>
              <PiCheckCircle className="mr-1 h-4 w-4" />
              Text übernehmen
            </Button>
            <Button type="button" size="sm" intent="secondary" onClick={onCancel}>
              <PiX className="mr-1 h-4 w-4" />
              Abbrechen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
