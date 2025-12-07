import { api } from '@/api';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ArchivedBanner } from '@/components/molecules/einsatz/ArchivedBanner';
import { EinsatzHeader } from '@/components/molecules/einsatz/EinsatzHeader';
import { EinsatzInfoCard } from '@/components/molecules/einsatz/EinsatzInfoCard';
import { PlaceholderModule } from '@/components/molecules/einsatz/PlaceholderModule';
import { useArchiveEinsatz, EINSATZ_QUERY_KEYS } from '@/features/einsatz';
import { updateEinsatzSchema } from '@/schemas/einsatz.schema';
import { getApiErrorMessage } from '@/shared/utils/apiErrorHandler';
import { logger } from '@/shared/utils/logger';
import type { ResponseError, UpdateEinsatzDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ArchiveConfirmationModal } from './ArchiveConfirmationModal';

export function EinsatzDetailView() {
  const { einsatzId } = useParams({ from: '/app/einsaetze/$einsatzId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Lade Einsatzdaten
  const {
    data: einsatzResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: EINSATZ_QUERY_KEYS.detail(einsatzId),
    queryFn: () => api.einsatz().einsatzControllerFindOneVAlpha({ id: einsatzId }),
  });

  const einsatz = einsatzResponse?.data;
  const archiveEinsatz = useArchiveEinsatz();

  // TanStack Form Setup
  const form = useForm({
    defaultValues: {
      beschreibung: einsatz?.beschreibung || '',
    },
    onSubmit: async ({ value }) => {
      // Konvertiere für API: leere Strings werden zu undefined
      const dto: UpdateEinsatzDto = {
        beschreibung: value.beschreibung || undefined,
      };
      await updateMutation.mutateAsync(dto);
    },
    validators: {
      onChange: updateEinsatzSchema,
    },
  });

  // Lade ID des vorherigen Einsatzes
  const { data: previousEinsatzResponse } = useQuery({
    queryKey: EINSATZ_QUERY_KEYS.previous(einsatzId),
    queryFn: () => api.einsatz().einsatzControllerGetPreviousVAlpha({ id: einsatzId }),
    enabled: !!einsatzId,
  });

  // Lade ID des nächsten Einsatzes
  const { data: nextEinsatzResponse } = useQuery({
    queryKey: EINSATZ_QUERY_KEYS.next(einsatzId),
    queryFn: () => api.einsatz().einsatzControllerGetNextVAlpha({ id: einsatzId }),
    enabled: !!einsatzId,
  });

  const previousEinsatzId = previousEinsatzResponse?.data?.id || null;
  const nextEinsatzId = nextEinsatzResponse?.data?.id || null;

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEinsatzDto) => api.einsatz().einsatzControllerUpdateVAlpha({ id: einsatzId, updateEinsatzDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.detail(einsatzId) });
      queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.all });
      toast.success('Einsatz aktualisiert', {
        description: 'Die Änderungen wurden erfolgreich gespeichert.',
      });
      setIsEditing(false);
      form.reset();
    },
    onError: async (err) => {
      const message = await getApiErrorMessage(err as ResponseError, 'Der Einsatz konnte nicht aktualisiert werden.', 'updateEinsatz');
      logger.error('Failed to update einsatz', err);
      toast.error('Fehler', { description: message });
    },
  });

  const handleEdit = () => {
    if (einsatz) {
      // Reset form with current values from einsatz
      // This sets both the value AND the defaultValue for dirty tracking
      form.reset({
        defaultValues: {
          beschreibung: einsatz.beschreibung || '',
        },
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    form.handleSubmit();
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (einsatz) {
      form.setFieldValue('beschreibung', einsatz.beschreibung || '');
    }
  };

  const handleArchive = async () => {
    if (einsatz?.id) {
      await archiveEinsatz.mutateAsync({ id: einsatz.id });
      setShowArchiveModal(false);
      // Navigate back to list after successful archive
      await navigate({ to: '/app/einsaetze' });
    }
  };

  if (isLoading) {
    return <LoadingState message="Lade Einsatzdetails..." />;
  }

  if (error || !einsatz) {
    return <ErrorState title="Einsatz nicht gefunden" description="Der angeforderte Einsatz konnte nicht geladen werden." backLink="/app/einsaetze" backLinkText="Zurück zur Übersicht" />;
  }

  const isArchived = einsatz.status === EinsatzResponseDtoStatusEnum.Archiviert;

  return (
    <div key={einsatzId} className={`flex h-screen flex-col ${isArchived ? 'opacity-60' : ''}`}>
      {/* Header mit Navigation */}
      <EinsatzHeader
        einsatz={einsatz}
        isArchived={isArchived}
        isEditing={isEditing}
        previousEinsatzId={previousEinsatzId}
        nextEinsatzId={nextEinsatzId}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onArchive={() => setShowArchiveModal(true)}
        isSaving={updateMutation.isPending}
        isFormDirty={isEditing && !form.state.isFieldsValid}
      />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Archive Banner */}
          {isArchived && <ArchivedBanner />}

          {/* Einsatz Header Info */}
          <EinsatzInfoCard einsatz={einsatz} isArchived={isArchived} isEditing={isEditing} form={form} />

          {/* Weitere Einsatz-Module (Platzhalter für zukünftige Features) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PlaceholderModule title="Kräfte" description="Kräfteverwaltung wird in einem zukünftigen Update implementiert." />
            <PlaceholderModule title="Fahrzeuge" description="Fahrzeugverwaltung wird in einem zukünftigen Update implementiert." />
            <PlaceholderModule title="Einsatztagebuch" description="Einsatztagebuch wird in einem zukünftigen Update implementiert." />
            <PlaceholderModule title="Dokumente" description="Dokumentenverwaltung wird in einem zukünftigen Update implementiert." />
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmationModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        einsatzName={einsatz.alarmstichwort || 'Einsatz'}
        isArchiving={archiveEinsatz.isPending}
      />
    </div>
  );
}
