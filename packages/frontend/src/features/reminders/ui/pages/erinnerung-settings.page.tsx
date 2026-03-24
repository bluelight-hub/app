import { FuehrungsrhythmusTemplateList, VorlageList } from '@/features/templates';
import { ErinnerungKonfigurationSettingsCard } from '../settings/erinnerung-konfiguration-settings-card';

export const ErinnerungSettingsPage = () => {
  return (
    <div className="space-y-4">
      <div className="border-border-subtle border-b pb-4">
        <h1 className="font-bold text-2xl text-text-primary">Erinnerungs-Einstellungen</h1>
        <p className="mt-1 text-text-muted text-sm">Verwalten Sie globale Konfigurationen für das Erinnerungssystem.</p>
      </div>

      <VorlageList />

      <hr className="border-border-subtle" />

      <FuehrungsrhythmusTemplateList />

      <hr className="border-border-subtle" />

      <ErinnerungKonfigurationSettingsCard />
    </div>
  );
};
