import { FuehrungsrhythmusTemplateList, VorlageList } from '@/features/templates';
import { ErinnerungKonfigurationSettingsCard } from '../settings/erinnerung-konfiguration-settings-card';

export const ErinnerungSettingsPage = () => {
  return (
    <div className="space-y-4">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="text-2xl font-bold text-text-primary">Erinnerungs-Einstellungen</h1>
        <p className="mt-1 text-sm text-text-muted">Verwalten Sie globale Konfigurationen für das Erinnerungssystem.</p>
      </div>

      <VorlageList />

      <hr className="border-border-subtle" />

      <FuehrungsrhythmusTemplateList />

      <hr className="border-border-subtle" />

      <ErinnerungKonfigurationSettingsCard />
    </div>
  );
};
