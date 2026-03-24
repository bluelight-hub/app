import { EinsatzCompletenessBar } from '@/features/einsatz/ui/molecules/einsatz-completeness-bar.molecule';
import { EinsatzStatusBadge } from '@/features/einsatz/ui/molecules/einsatz-status-badge.molecule';
import { formatNatoDateTime } from '@/shared/lib/dateFormatter';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import type { EinsatzResponseDto } from '@/shared';
import { EinsatzResponseDtoStatusEnum } from '@/shared';
import type { ReactFormApi } from '@tanstack/react-form';
import { PiArchive, PiBookOpen, PiCheckCircle, PiClock, PiMapPin as PiMapPinIcon } from 'react-icons/pi';

interface EinsatzInfoCardProps {
  einsatz: EinsatzResponseDto;
  isArchived: boolean;
  isEditing: boolean;
  form: ReactFormApi<{ beschreibung: string }, undefined>;
}

export function EinsatzInfoCard({ einsatz, isArchived, isEditing, form }: EinsatzInfoCardProps) {
  // TODO: Switch to useActiveEinsaetzeWithCounts when available
  // These fields will be available after backend implementation and API regeneration
  const etbEintraegeCount = 'etbEintraegeCount' in einsatz ? (einsatz as { etbEintraegeCount: number }).etbEintraegeCount : undefined;
  const poisCount = 'poisCount' in einsatz ? (einsatz as { poisCount: number }).poisCount : undefined;

  return (
    <div className="mb-6 rounded-panel bg-surface-panel p-6 shadow">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          {isArchived && <PiArchive className="h-6 w-6 text-status-warning-text" />}
          <span className="rounded bg-surface-raised px-2 py-0.5 font-mono font-semibold text-text-muted text-sm">{einsatz.nummer}</span>
          <h1 className="font-bold text-2xl text-text-primary">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h1>
        </div>
        <div className="mt-2 flex items-center space-x-4 sm:mt-0">
          <EinsatzStatusBadge status={einsatz.status || EinsatzResponseDtoStatusEnum.Angelegt} size="lg" />
          <span className="text-text-muted text-sm">ID: {einsatz.id}</span>
        </div>
      </div>

      {/* Einsatz Meta Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start space-x-2">
          <PiClock className="mt-1 h-5 w-5 text-text-muted" />
          <div>
            <p className="font-medium text-text-secondary text-sm">Erstellt am</p>
            <p className="text-text-primary text-sm">{formatNatoDateTime(einsatz.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <PiMapPinIcon className="mt-1 h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="font-medium text-text-secondary text-sm">Einsatzort</p>
            <p className="text-text-primary text-sm">{einsatz.einsatzort || 'Nicht angegeben'}</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <PiCheckCircle className="mt-1 h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="font-medium text-text-secondary text-sm">Status</p>
            <p className="text-text-primary text-sm">{einsatz.status}</p>
          </div>
        </div>
      </div>

      {/* ETB & POI Counts */}
      {(etbEintraegeCount !== undefined || poisCount !== undefined) && (
        <div className="mt-4 flex gap-3">
          {etbEintraegeCount !== undefined && (
            <div className="flex items-center space-x-2 rounded-lg bg-status-info-surface px-3 py-2">
              <PiBookOpen className="h-5 w-5 text-status-info-text" />
              <div>
                <p className="font-medium text-status-info-text text-xs">ETB-Einträge</p>
                <p className="font-semibold text-status-info-text text-lg">{etbEintraegeCount}</p>
              </div>
            </div>
          )}
          {poisCount !== undefined && (
            <div className="flex items-center space-x-2 rounded-panel bg-action-secondary px-3 py-2">
              <PiMapPinIcon className="h-5 w-5 text-action-primary" />
              <div>
                <p className="font-medium text-action-primary text-xs">POIs auf Karte</p>
                <p className="font-semibold text-action-primary text-lg">{poisCount}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vollständigkeitsanzeige */}
      <div className="mt-6">
        <p className="mb-2 font-medium text-text-secondary text-sm">Vollständigkeit</p>
        <EinsatzCompletenessBar einsatz={einsatz} showTooltip={true} showPercentage={true} size="lg" className="max-w-full" />
      </div>

      {/* Beschreibung */}
      <div className="mt-6">
        <p className="mb-2 font-medium text-text-secondary text-sm">Beschreibung</p>
        {isEditing ? (
          <form.Field name="beschreibung">
            {(field) => (
              <>
                <Textarea
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Beschreibung eingeben..."
                  rows={4}
                  className="w-full"
                />
                {field.state.meta.errors?.length > 0 && <p className="mt-1 text-status-danger-text text-sm">{field.state.meta.errors.join(', ')}</p>}
              </>
            )}
          </form.Field>
        ) : (
          <p className="whitespace-pre-wrap text-text-primary text-sm">{einsatz.beschreibung || 'Keine Beschreibung vorhanden'}</p>
        )}
      </div>
    </div>
  );
}
