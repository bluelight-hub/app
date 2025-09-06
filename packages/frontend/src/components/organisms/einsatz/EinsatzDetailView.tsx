import { api } from '@/api';
import { EinsatzCompletenessBar } from '@/components/molecules/einsatz/einsatz-completeness-bar.molecule';
import { EinsatzStatusBadge } from '@/components/molecules/einsatz/einsatz-status-badge.molecule';
import { formatNatoDateTime } from '@/utils/dateFormatter';
import { Button } from '@atoms/button.atom';
import { Input } from '@atoms/input.atom';
import { Select } from '@atoms/select.atom';
import { Textarea } from '@atoms/textarea.atom';
import type { UpdateEinsatzDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { PiArrowLeft, PiCaretLeft, PiCaretRight, PiCheckCircle, PiClock, PiFloppyDisk, PiMapPin, PiPencilSimple, PiSpinner, PiWarningCircle, PiX } from 'react-icons/pi';

export function EinsatzDetailView() {
  const { einsatzId } = useParams({ from: '/app/einsaetze/$einsatzId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UpdateEinsatzDto>>({});

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
      setEditData({});
    },
    onError: () => {
      // TODO: Toast notification
      console.error('Fehler beim Aktualisieren des Einsatzes');
    },
  });

  const handleEdit = () => {
    if (einsatz) {
      setEditData({
        alarmstichwort: einsatz.alarmstichwort || '',
        // einsatzort: einsatz.einsatzort || '',
        status: einsatz.status,
        // beschreibung: einsatz.beschreibung || '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(editData as UpdateEinsatzDto);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
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
          <p className="mt-4 text-xl font-medium text-gray-900">Einsatz nicht gefunden</p>
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header mit Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
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
                <Button onClick={handleEdit}>
                  <PiPencilSimple className="mr-2 h-5 w-5" />
                  Bearbeiten
                </Button>
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
          {/* Einsatz Header Info */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? (
                  <Input
                    value={editData.alarmstichwort || ''}
                    onChange={(e) => setEditData({ ...editData, alarmstichwort: e.target.value })}
                    placeholder="Alarmstichwort"
                    className="text-2xl font-bold"
                  />
                ) : (
                  einsatz.alarmstichwort || 'Kein Alarmstichwort'
                )}
              </h1>
              <div className="mt-2 flex items-center space-x-4 sm:mt-0">
                <EinsatzStatusBadge status={einsatz.status || EinsatzResponseDtoStatusEnum.Angelegt} size="lg" />
                <span className="text-sm text-gray-500 dark:text-gray-400">ID: {einsatz.id}</span>
              </div>
            </div>

            {/* Einsatz Meta Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start space-x-2">
                <PiClock className="mt-1 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Erstellt am</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatNatoDateTime(einsatz.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <PiMapPin className="mt-1 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Einsatzort</p>
                  {isEditing ? (
                    <Input value={editData.einsatzort || ''} onChange={(e) => setEditData({ ...editData, einsatzort: e.target.value })} placeholder="Einsatzort eingeben" className="mt-1" />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">{einsatz.einsatzort || 'Nicht angegeben'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <PiCheckCircle className="mt-1 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                  {isEditing ? (
                    <Select
                      value={editData.status || einsatz.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as EinsatzResponseDtoStatusEnum })}
                      selectSize="sm"
                      className="mt-1"
                      options={[
                        { value: EinsatzResponseDtoStatusEnum.Angelegt, label: 'Angelegt' },
                        { value: EinsatzResponseDtoStatusEnum.InBearbeitung, label: 'In Bearbeitung' },
                        { value: EinsatzResponseDtoStatusEnum.Abgeschlossen, label: 'Abgeschlossen' },
                        { value: EinsatzResponseDtoStatusEnum.Archiviert, label: 'Archiviert' },
                      ]}
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">{einsatz.status}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Vollständigkeitsanzeige */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Vollständigkeit</p>
              <EinsatzCompletenessBar einsatz={einsatz} showTooltip={true} showPercentage={true} size="lg" className="max-w-full" />
            </div>

            {/* Beschreibung */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung</p>
              {isEditing ? (
                <Textarea
                  value={editData.beschreibung || ''}
                  onChange={(e) => setEditData({ ...editData, beschreibung: e.target.value })}
                  placeholder="Beschreibung eingeben..."
                  rows={4}
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{einsatz.beschreibung || 'Keine Beschreibung vorhanden'}</p>
              )}
            </div>
          </div>

          {/* Weitere Einsatz-Module (Platzhalter für zukünftige Features) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Kräfte */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Kräfte</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kräfteverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Fahrzeuge */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Fahrzeuge</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fahrzeugverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Einsatztagebuch */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Einsatztagebuch</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Einsatztagebuch wird in einem zukünftigen Update implementiert.</p>
            </div>

            {/* Dokumente */}
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Dokumente</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dokumentenverwaltung wird in einem zukünftigen Update implementiert.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
