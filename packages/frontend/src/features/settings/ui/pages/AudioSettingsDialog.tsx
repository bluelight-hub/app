import { useCallback, useState } from 'react';
import { PiArrowCounterClockwise } from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useAudioSettings } from '../../hooks';
import { ALARM_LEVELS, DEFAULT_AUDIO_SETTINGS, type AlarmLevel, type AudioLevelConfig as AudioLevelConfigType, type AudioSettings } from '../../schemas';
import { AudioLevelConfig } from '@/features/settings/ui';
import { AudioToggle } from '@/features/settings';

/**
 * Props für AudioSettingsDialog
 */
export interface AudioSettingsDialogProps {
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback zum Schließen */
  onClose: () => void;
}

/**
 * AudioSettingsDialog - Audio-Einstellungen als Dialog
 *
 * Ermöglicht die Konfiguration aller Audio-Einstellungen:
 * - Globale Stummschaltung
 * - Ton-Auswahl pro Alarm-Level
 * - Lautstärke pro Alarm-Level
 * - Zurücksetzen auf Standardwerte
 *
 * **Story 2.7 AC1:** Audio-Einstellungen UI
 * **Story 2.7 AC5:** Persistierung im Tauri Store
 */
export function AudioSettingsDialog({ isOpen, onClose }: AudioSettingsDialogProps) {
  const [settings, setSettings, , isLoading] = useAudioSettings();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handler für globalen Toggle
  const handleToggleChange = useCallback(
    async (enabled: boolean) => {
      try {
        await setSettings({ ...settings, enabled });
        toast.success(enabled ? 'Töne aktiviert' : 'Töne deaktiviert');
      } catch {
        toast.error('Einstellung konnte nicht gespeichert werden');
      }
    },
    [settings, setSettings],
  );

  // Handler für Level-Konfiguration
  const handleLevelChange = useCallback(
    async (level: AlarmLevel, config: AudioLevelConfigType) => {
      try {
        const updatedSettings: AudioSettings = {
          ...settings,
          levels: {
            ...settings.levels,
            [level]: config,
          },
        };
        await setSettings(updatedSettings);
      } catch {
        toast.error('Einstellung konnte nicht gespeichert werden');
      }
    },
    [settings, setSettings],
  );

  // Handler für Reset
  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await setSettings(DEFAULT_AUDIO_SETTINGS);
      toast.success('Einstellungen zurückgesetzt');
      setShowResetDialog(false);
    } catch {
      toast.error('Zurücksetzen fehlgeschlagen');
    } finally {
      setIsResetting(false);
    }
  }, [setSettings]);

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} size="lg">
        <div className="flex items-center justify-between">
          <Dialog.Title>Audio-Einstellungen</Dialog.Title>
          <Button type="button" appearance="ghost" size="sm" onClick={() => setShowResetDialog(true)} aria-label="Einstellungen zurücksetzen">
            <PiArrowCounterClockwise className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">Zurücksetzen</span>
          </Button>
        </div>

        <Dialog.Body>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Globaler Toggle */}
              <AudioToggle enabled={settings.enabled} onChange={handleToggleChange} />

              {/* Level-Konfigurationen */}
              <div className="space-y-4">
                <h2 className="font-medium text-text-primary text-lg">Alarm-Stufen konfigurieren</h2>

                {ALARM_LEVELS.map((level) => (
                  <AudioLevelConfig key={level} level={level} config={settings.levels[level]} onChange={(config) => handleLevelChange(level, config)} disabled={!settings.enabled} />
                ))}
              </div>

              {/* Hinweis bei deaktiviertem Audio */}
              {!settings.enabled && (
                <div className="rounded-panel border border-status-warning-border bg-status-warning-surface p-4">
                  <p className="text-sm text-status-warning-text">Alarm-Töne sind deaktiviert. Erinnerungen werden nur visuell angezeigt.</p>
                </div>
              )}
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={onClose}>
            Schließen
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Reset-Bestätigungsdialog */}
      <Dialog.Confirm
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Einstellungen zurücksetzen?"
        message="Alle Audio-Einstellungen werden auf die Standardwerte zurückgesetzt. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Zurücksetzen"
        variant="danger"
        isProcessing={isResetting}
      />
    </>
  );
}
