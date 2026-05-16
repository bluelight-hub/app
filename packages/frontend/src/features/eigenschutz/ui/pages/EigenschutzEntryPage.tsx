import { EigenschutzPageHeader } from '../molecules/EigenschutzPageHeader';
import { AmpelDashboard } from '../organisms/AmpelDashboard';
import { EigenschutzModulStatus } from '../organisms/EigenschutzModulStatus';

export interface EigenschutzEntryPageProps {
  /**
   * Aktuelle Einsatz-ID — wird für den `AmpelDashboard`-Mount benötigt.
   * Optional, damit bestehende Call-Sites ohne `einsatzId` weiterhin
   * kompilieren. Ohne `einsatzId` wird der Dashboard-Mount ausgeblendet.
   */
  readonly einsatzId?: string;
}

export function EigenschutzEntryPage({ einsatzId }: EigenschutzEntryPageProps = {}) {
  return (
    <div className="space-y-4">
      <EigenschutzPageHeader title="Eigenschutz" description="Arbeitsschutz und Sicherheitsmaßnahmen" />
      {einsatzId ? <EigenschutzModulStatus einsatzId={einsatzId} /> : null}
      {einsatzId ? <AmpelDashboard einsatzId={einsatzId} /> : null}
    </div>
  );
}
