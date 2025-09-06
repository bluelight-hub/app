import { api } from '@/api';
import { EinsatzCompletenessBar } from '@/components/molecules/einsatz/einsatz-completeness-bar.molecule';
import { EinsatzStatusBadge } from '@/components/molecules/einsatz/einsatz-status-badge.molecule';
import { useEinsaetze } from '@/hooks/useEinsaetze';
import { updateEinsatzSchema } from '@/schemas/einsatz.schema';
import { formatNatoDateTime } from '@/utils/dateFormatter';
import { Button } from '@atoms/button.atom';
import { Textarea } from '@atoms/textarea.atom';
import type { UpdateEinsatzDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { PiArchive, PiArrowLeft, PiCaretLeft, PiCaretRight, PiCheckCircle, PiClock, PiFloppyDisk, PiMapPin, PiPencilSimple, PiSpinner, PiWarningCircle, PiX } from 'react-icons/pi';
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
    queryKey: ['einsatz', einsatzId],
    queryFn: () => api.einsatz().einsatzControllerFindOneVAlpha({ id: einsatzId }),
  });

  const einsatz = einsatzResponse?.data;
  const { archiveEinsatz } = useEinsaetze();

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
    queryKey: ['einsatz', 'previous', einsatzId],
    queryFn: () => api.einsatz().einsatzControllerGetPreviousVAlpha({ id: einsatzId }),
    enabled: !!einsatzId,
  });

  // Lade ID des nächsten Einsatzes
  const { data: nextEinsatzResponse } = useQuery({
    queryKey: ['einsatz', 'next', einsatzId],
    queryFn: () => api.einsatz().einsatzControllerGetNextVAlpha({ id: einsatzId }),
    enabled: !!einsatzId,
  });

  const previousEinsatzId = previousEinsatzResponse?.data?.id || null;
  const nextEinsatzId = nextEinsatzResponse?.data?.id || null;

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEinsatzDto) => api.einsatz().einsatzControllerUpdateVAlpha({ id: einsatzId, updateEinsatzDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einsatz', einsatzId] });
      queryClient.invalidateQueries({ queryKey: ['einsaetze'] });
      // TODO: Toast notification
      setIsEditing(false);
      form.reset();
    },
    onError: () => {
      // TODO: Toast notification
      console.error('Fehler beim Aktualisieren des Einsatzes');
    },
  });

  const handleEdit = () => {
    if (einsatz) {
      form.setFieldValue('beschreibung', einsatz.beschreibung || '');
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    form.handleSubmit();
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleArchive = async () => {
    if (einsatz?.id) {
      await archiveEinsatz.mutateAsync({ id: einsatz.id });
      setShowArchiveModal(false);
      // Navigate back to list after successful archive
      navigate({ to: '/app/einsaetze' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <PiSpinner className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Lade Einsatzdetails...</p>
        </div>
      </div>
    );
  }

  if (error || !einsatz) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <PiWarningCircle className="mx-auto h-16 w-16 text-red-500" />
          <p className="mt-4 font-medium text-gray-900 text-xl">Einsatz nicht gefunden</p>
          <p className="mt-2 text-gray-600">Der angeforderte Einsatz konnte nicht geladen werden.</p>
          <Link to="/app/einsaetze" className="mt-6 inline-block">
            <Button>
              <PiArrowLeft className="mr-2 h-5 w-5" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isArchived = einsatz.status === EinsatzResponseDtoStatusEnum.Archiviert;

  return (
    <div className={`flex h-screen flex-col ${isArchived ? 'opacity-60' : ''}`}>
      {/* Header mit Navigation */}
      <div className="flex-shrink-0 border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/app/einsaetze">
                <Button variant="ghost" size="sm">
                  <PiArrowLeft className="h-5 w-5" />
                  <span className="ml-2 hidden sm:inline">Zurück zur Übersicht</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previousEinsatzId && navigate({ to: '/app/einsaetze/$einsatzId', params: { einsatzId: previousEinsatzId } })}
                  disabled={!previousEinsatzId}
                  title="Vorheriger Einsatz"
                >
                  <PiCaretLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => nextEinsatzId && navigate({ to: '/app/einsaetze/$einsatzId', params: { einsatzId: nextEinsatzId } })}
                  disabled={!nextEinsatzId}
                  title="Nächster Einsatz"
                >
                  <PiCaretRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  {einsatz.status === EinsatzResponseDtoStatusEnum.Abgeschlossen && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowArchiveModal(true)}
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      <PiArchive className="mr-2 h-5 w-5" />
                      Archivieren
                    </Button>
                  )}
                  {einsatz.status !== EinsatzResponseDtoStatusEnum.Archiviert && (
                    <Button onClick={handleEdit}>
                      <PiPencilSimple className="mr-2 h-5 w-5" />
                      Bearbeiten
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleCancel}>
                    <PiX className="mr-2 h-5 w-5" />
                    Abbrechen
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <PiSpinner className="mr-2 h-5 w-5 animate-spin" /> : <PiFloppyDisk className="mr-2 h-5 w-5" />}
                    Speichern
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Archive Banner */}
          {isArchived && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-center">
                <PiArchive className="mr-3 h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Dieser Einsatz wurde archiviert</p>
                  <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">Archivierte Einsätze können nicht mehr bearbeitet oder wiederhergestellt werden.</p>
                </div>
              </div>
            </div>
          )}

          {/* Einsatz Header Info */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                {isArchived && <PiArchive className="h-6 w-6 text-amber-500" />}
                <h1 className="font-bold text-2xl text-gray-900 dark:text-white">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h1>
              </div>
              <div className="mt-2 flex items-center space-x-4 sm:mt-0">
                <EinsatzStatusBadge status={einsatz.status || EinsatzResponseDtoStatusEnum.Angelegt} size="lg" />
                <span className="text-gray-500 text-sm dark:text-gray-400">ID: {einsatz.id}</span>
              </div>
            </div>

            {/* Einsatz Meta Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start space-x-2">
                <PiClock className="mt-1 h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700 text-sm dark:text-gray-300">Erstellt am</p>
                  <p className="text-gray-900 text-sm dark:text-white">{formatNatoDateTime(einsatz.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <PiMapPin className="mt-1 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-700 text-sm dark:text-gray-300">Einsatzort</p>
                  <p className="text-gray-900 text-sm dark:text-white">{einsatz.einsatzort || 'Nicht angegeben'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <PiCheckCircle className="mt-1 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-700 text-sm dark:text-gray-300">Status</p>
                  <p className="text-gray-900 text-sm dark:text-white">{einsatz.status}</p>
                </div>
              </div>
            </div>

            {/* Vollständigkeitsanzeige */}
            <div className="mt-6">
              <p className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Vollständigkeit</p>
              <EinsatzCompletenessBar einsatz={einsatz} showTooltip={true} showPercentage={true} size="lg" className="max-w-full" />
            </div>

            {/* Beschreibung */}
            <div className="mt-6">
              <p className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Beschreibung</p>
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
                      {field.state.meta.errors?.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{field.state.meta.errors.join(', ')}</p>}
                    </>
                  )}
                </form.Field>
              ) : (
                <p className="whitespace-pre-wrap text-gray-900 text-sm dark:text-white">{einsatz.beschreibung || 'Keine Beschreibung vorhanden'}</p>
              )}
            </div>
          </div>

          {/* Weitere Einsatz-Module (Platzhalter für zukünftige Features) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Kräfte */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Kräfte</h2>
              <p className="text-gray-500 text-sm dark:text-gray-400">Kräfteverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Fahrzeuge */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Fahrzeuge</h2>
              <p className="text-gray-500 text-sm dark:text-gray-400">Fahrzeugverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Einsatztagebuch */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Einsatztagebuch</h2>
              <p className="text-gray-500 text-sm dark:text-gray-400">Einsatztagebuch wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Dokumente */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Dokumente</h2>
              <p className="text-gray-500 text-sm dark:text-gray-400">Dokumentenverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>
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
