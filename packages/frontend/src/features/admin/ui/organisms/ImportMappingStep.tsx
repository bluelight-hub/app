import type { HiOrgQualifikationPreviewItemDto, QualifikationDto } from '@/shared';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
interface ImportMappingStepProps {
  /** Unmapped Qualifikationen die zugeordnet werden sollen */ unmappedQualifikationen: HiOrgQualifikationPreviewItemDto[] /** Lokale Qualifikationen für Dropdown */;
  localQualifikationen?: QualifikationDto[] /** Aktuelle Mapping-Werte (externalName -> qualifikationId | null) */;
  mappingValues: Record<string, string | null> /** Callback wenn ein Mapping-Wert geändert wird */;
  onMappingChange: (externalName: string, qualifikationId: string | null) => void /** Loading State für lokale Qualifikationen */;
  isLoading?: boolean;
} /** * Step-Komponente für Qualifikations-Mapping im Import-Dialog. * * Zeigt alle unmapped Qualifikationen mit Combobox für lokale Zuordnung * und Checkbox zum expliziten Ignorieren. */
export function ImportMappingStep({ unmappedQualifikationen, localQualifikationen, mappingValues, onMappingChange, isLoading = false }: ImportMappingStepProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {' '}
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}{' '}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {' '}
      <Text>
        {' '}
        {unmappedQualifikationen.length} Qualifikation{unmappedQualifikationen.length !== 1 ? 'en' : ''} aus HiOrg-Server {unmappedQualifikationen.length !== 1 ? ' sind' : ' ist'} noch nicht
        zugeordnet.{' '}
      </Text>{' '}
      <div className="rounded-lg border border-status-info-border bg-status-info-surface p-3">
        {' '}
        <Text className="text-status-info-text text-sm">Die Zuordnungen werden gespeichert und automatisch für zukünftige Importe verwendet.</Text>{' '}
      </div>{' '}
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {' '}
        {unmappedQualifikationen.map((q) => (
          <div key={q.name} className="flex items-center gap-4 rounded-lg border p-3">
            {' '}
            <div className="min-w-0 flex-1">
              {' '}
              <Text className="font-medium">{q.name}</Text> {q.nameKurz && <Text className="text-text-muted text-sm">({q.nameKurz})</Text>}{' '}
              {q.autoMatchSuggestionName && (
                <Text className="text-text-muted text-xs">
                  {' '}
                  Vorschlag: {q.autoMatchSuggestionName} ({Math.round(q.autoMatchConfidence ?? 0)}%){' '}
                </Text>
              )}{' '}
            </div>{' '}
            <div className="w-64">
              {' '}
              <Combobox
                items={localQualifikationen?.map((lq) => ({ value: lq.id, label: `${lq.name}${lq.kuerzel ? ` (${lq.kuerzel})` : ''}` })) ?? []}
                value={mappingValues[q.name] ?? undefined}
                onChange={(value) => onMappingChange(q.name, value || null)}
                placeholder="Qualifikation wählen..."
              />{' '}
            </div>{' '}
            <div className="flex items-center gap-2">
              {' '}
              <Checkbox
                checked={mappingValues[q.name] === null}
                onChange={(checked) => {
                  if (checked) {
                    onMappingChange(q.name, null);
                  } else if (q.autoMatchSuggestionId) {
                    onMappingChange(q.name, q.autoMatchSuggestionId);
                  }
                }}
              />{' '}
              <Text className="text-text-muted text-sm">Ignorieren</Text>{' '}
            </div>{' '}
          </div>
        ))}{' '}
      </div>{' '}
    </div>
  );
}
