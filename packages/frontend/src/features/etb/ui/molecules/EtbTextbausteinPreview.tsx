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
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
      <div className="flex items-start gap-2">
        <PiWarningCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div className="flex-grow">
          <p className="font-medium text-sm text-yellow-800">Textbaustein-Vorschau</p>
          <p className="mt-1 text-sm text-yellow-700">Der vorhandene Text wird ersetzt mit:</p>
          <div className="mt-2 rounded border border-yellow-200 bg-white p-2">
            <p className="line-clamp-2 text-gray-700 text-sm">{text}</p>
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
