import { EinsatzCompletenessBar } from '@/features/einsatz/ui/molecules/einsatz-completeness-bar.molecule';
import { EinsatzStatusBadge } from '@/features/einsatz/ui/molecules/einsatz-status-badge.molecule';
import { formatAddress } from '@/shared/lib/addressFormatter';
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
          <span className="rounded bg-surface-raised px-2 py-0.5 font-mono text-sm font-semibold text-text-muted">{einsatz.nummer}</span>
          <h1 className="text-2xl font-bold text-text-primary">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h1>
        </div>
        <div className="mt-2 flex items-center space-x-4 sm:mt-0">
          <EinsatzStatusBadge status={einsatz.status || EinsatzResponseDtoStatusEnum.Angelegt} size="lg" />
          <span className="text-sm text-text-muted">ID: {einsatz.id}</span>
        </div>
      </div>

      {/* Einsatz Meta Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start space-x-2">
          <PiClock className="mt-1 h-5 w-5 text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text-secondary">Erstellt am</p>
            <p className="text-sm text-text-primary">{formatNatoDateTime(einsatz.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <PiMapPinIcon className="mt-1 h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary">Einsatzort</p>
            <p className="text-sm text-text-primary">{einsatz.einsatzort ? formatAddress(einsatz.einsatzort) : 'Nicht angegeben'}</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <PiCheckCircle className="mt-1 h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary">Status</p>
            <p className="text-sm text-text-primary">{einsatz.status}</p>
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
                <p className="text-xs font-medium text-status-info-text">ETB-Einträge</p>
                <p className="text-lg font-semibold text-status-info-text">{etbEintraegeCount}</p>
              </div>
            </div>
          )}
          {poisCount !== undefined && (
            <div className="flex items-center space-x-2 rounded-panel bg-action-secondary px-3 py-2">
              <PiMapPinIcon className="h-5 w-5 text-action-primary" />
              <div>
                <p className="text-xs font-medium text-action-primary">POIs auf Karte</p>
                <p className="text-lg font-semibold text-action-primary">{poisCount}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vollständigkeitsanzeige */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-text-secondary">Vollständigkeit</p>
        <EinsatzCompletenessBar einsatz={einsatz} showTooltip={true} showPercentage={true} size="lg" className="max-w-full" />
      </div>

      {/* Beschreibung */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-text-secondary">Beschreibung</p>
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
                {field.state.meta.errors?.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{field.state.meta.errors.join(', ')}</p>}
              </>
            )}
          </form.Field>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-text-primary">{einsatz.beschreibung || 'Keine Beschreibung vorhanden'}</p>
        )}
      </div>
    </div>
  );
}
