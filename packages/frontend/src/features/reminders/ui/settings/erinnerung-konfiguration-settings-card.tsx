import { useState, useEffect } from 'react';
import { useErinnerungKonfiguration } from '../../hooks/use-erinnerung-konfiguration';
import { LuLoader } from 'react-icons/lu';
import { Input } from '@/shared/ui/atoms/input.atom';

export const ErinnerungKonfigurationSettingsCard = () => {
  const { config, isLoading, updateTimeout, isUpdating } = useErinnerungKonfiguration();
  const [minutes, setMinutes] = useState<number | string>(5);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config && config.eskalationsTimeoutMinutes !== undefined) {
      setMinutes(config.eskalationsTimeoutMinutes);
    }
  }, [config]);

  const handleSave = () => {
    const min = typeof minutes === 'string' ? (minutes === '' ? 5 : parseInt(minutes, 10)) : minutes;
    updateTimeout(
      { timeoutMinutes: min },
      {
        onSuccess: () => setIsDirty(false),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <LuLoader className="animate-spin" />
      </div>
    );
  }

  const parsedMinutes = typeof minutes === 'string' ? (minutes === '' ? 0 : parseInt(minutes, 10)) : minutes;
  const isValid = !Number.isNaN(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 60;

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-panel p-6 shadow-panel">
      <h3 className="mb-4 text-lg font-medium text-text-primary">Erinnerungs-Konfiguration (Global)</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="timeout" className="mb-1 block text-sm font-medium text-text-secondary">
            Eskalations-Timeout (Minuten)
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              id="timeout"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => {
                const val = e.target.value;
                setMinutes(val === '' ? '' : parseInt(val, 10));
                setIsDirty(true);
              }}
              className="w-24"
            />
            <span className="text-sm text-text-muted">(1-60 Minuten)</span>
          </div>
          {!isValid && <p className="mt-1 text-sm text-status-danger-text">Bitte einen Wert zwischen 1 und 60 Minuten eingeben.</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || !isValid || isUpdating}
            className={`inline-flex justify-center rounded-control border border-transparent px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus-visible:shadow-focus-ring ${!isDirty || !isValid || isUpdating ? 'cursor-not-allowed bg-surface-raised text-text-muted' : 'bg-action-primary text-text-inverse hover:bg-action-primary-hover'} `}
          >
            {isUpdating && <LuLoader className="mr-2 -ml-1 h-4 w-4 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-panel bg-status-info-surface p-3 text-sm text-status-info-text">
        <p>Diese Einstellung gilt global für alle Einsätze. Wenn Erinnerungen überfällig sind, werden sie nach dieser Zeit eskaliert (Status: ESKALIERT).</p>
      </div>
    </div>
  );
};
