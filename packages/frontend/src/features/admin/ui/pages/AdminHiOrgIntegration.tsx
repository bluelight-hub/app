import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, useSearch, useNavigate } from '@tanstack/react-router';
import { PiPlugsConnected, PiCheckCircle, PiWarningCircle, PiSpinner, PiUsers, PiDownload, PiCopy, PiGear, PiArrowsClockwise, PiLinkBreak, PiKey, PiClock } from 'react-icons/pi';
import { toast } from 'sonner';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminHiOrgIntegration, useAdminQualifikationenManagement, type BatchMappingItem } from '@/features/admin/api';
import type { HiOrgQualifikationPreviewItemDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { InlineConfirmation } from '@/shared/ui/atoms/InlineConfirmation.atom';
import { useInlineConfirmation } from '@/shared/ui/hooks/use-inline-confirmation';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { QualifikationMappingDialog } from '../organisms/QualifikationMappingDialog';
import { ImportMappingStep } from '../organisms/ImportMappingStep';

/**
 * Admin HiOrg Integration Settings Page.
 *
 * Ermöglicht:
 * - OAuth2 Verbindung mit HiOrg-Server herstellen
 * - Verbindung testen
 * - Personen-Vorschau anzeigen
 *
 * Der OAuth Flow wird über den Backend-Endpunkt initiiert und
 * redirected nach erfolgreicher Authentifizierung zurück mit
 * ?oauth=success oder ?oauth=error&message=...
 */
export function AdminHiOrgIntegration() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  // Mapping Step State (dialogStep wird fuer mehrstufigen Import-Wizard verwendet)
  const [dialogStep, setDialogStep] = useState<'confirm' | 'mapping'>('confirm');
  const [mappingValues, setMappingValues] = useState<Record<string, string | null>>({});
  // Standalone Mapping Dialog State
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  // Disconnect Confirmation State
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const authConfirmation = useInlineConfirmation(5000);
  // Search Params für OAuth Callback (oauth=success/error, message=...)
  const search = useSearch({ from: '/admin/integrations/hiorg' });
  const navigate = useNavigate();

  // Lokale Qualifikationen fuer Inline-Mapping im Import-Dialog
  const { qualifikationen: localQualifikationen, isLoading: isLoadingQualifikationen } = useAdminQualifikationenManagement({ istAktiv: true });

  const {
    credentials,
    isLoadingCredentials,
    preview,
    isLoadingPreview,
    testConnection,
    isTestingConnection,
    connectionInfo,
    initiateOAuth,
    isInitiatingOAuth,
    refetchCredentials,
    importPersons,
    isImporting,
    importResult,
    clearImportResult,
    batchSaveMappingsAsync,
    isSavingBatchMappings,
    // Qualifikation-Mappings (fuer standalone Dialog)
    mappings,
    isLoadingMappings,
    saveQualifikationMapping,
    isSavingMapping,
    autoMatchQualifikationen,
    isAutoMatching,
    // Auth-Management
    refreshToken,
    isRefreshingToken,
    disconnect,
    isDisconnecting,
  } = useAdminHiOrgIntegration({
    activeOnly: true,
    enablePreview: showPreview, // Nur laden wenn User auf "Vorschau laden" klickt
    enableMappings: showMappingDialog, // Nur laden wenn Dialog offen ist
  });

  // Berechne Anzahl Duplikate in Auswahl
  const duplicatesInSelection = useMemo(() => {
    if (!preview?.persons) return 0;
    return preview.persons.filter((p) => selectedUsernames.has(p.username) && p.isDuplicate).length;
  }, [preview?.persons, selectedUsernames]);

  // Berechne Anzahl Personen ohne Personalnummer in Auswahl
  const missingPersonalnummerInSelection = useMemo(() => {
    if (!preview?.persons) return 0;
    return preview.persons.filter((p) => selectedUsernames.has(p.username) && !p.mitgliednr?.trim()).length;
  }, [preview?.persons, selectedUsernames]);

  // Toggle einzelne Person
  const togglePerson = useCallback((username: string) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  }, []);

  // Toggle alle Personen
  const toggleAll = useCallback(() => {
    if (!preview?.persons) return;
    const allUsernames = preview.persons.map((p) => p.username);
    const allSelected = allUsernames.every((u) => selectedUsernames.has(u));
    if (allSelected) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(allUsernames));
    }
  }, [preview?.persons, selectedUsernames]);

  // Schließe Dialog und resette State
  const closeImportDialog = useCallback(() => {
    setShowImportDialog(false);
    setDialogStep('confirm');
    setMappingValues({});
  }, []);

  // Import ausführen
  const handleImport = useCallback(() => {
    const usernames = Array.from(selectedUsernames);
    importPersons(
      { usernames, duplicateStrategy },
      {
        onSuccess: () => {
          closeImportDialog();
          setSelectedUsernames(new Set());
        },
      },
    );
  }, [selectedUsernames, duplicateStrategy, importPersons, closeImportDialog]);

  // Alle / Keine Duplikate ausgewählt?
  const allSelected = useMemo(() => {
    if (!preview?.persons || preview.persons.length === 0) return false;
    return preview.persons.every((p) => selectedUsernames.has(p.username));
  }, [preview?.persons, selectedUsernames]);

  // Sammle alle einzigartigen unmapped Qualifikationen aus ausgewählten Personen
  const unmappedQualifikationen = useMemo(() => {
    if (!preview?.persons) return [];

    const qualifikationMap = new Map<string, HiOrgQualifikationPreviewItemDto>();

    preview.persons
      .filter((p) => selectedUsernames.has(p.username))
      .flatMap((p) => p.qualifikationen ?? [])
      .filter((q) => !q.isMapped) // Nur unmapped
      .forEach((q) => {
        // Deduplizieren nach externalName
        if (!qualifikationMap.has(q.name)) {
          qualifikationMap.set(q.name, q);
        }
      });

    return Array.from(qualifikationMap.values());
  }, [preview?.persons, selectedUsernames]);

  // Initialisiere Mapping-Werte mit Auto-Match Vorschlägen
  const initializeMappingValues = useCallback(() => {
    const initial: Record<string, string | null> = {};
    for (const q of unmappedQualifikationen) {
      // Verwende Auto-Match Vorschlag wenn Confidence >= 70%
      if (q.autoMatchSuggestionId && (q.autoMatchConfidence ?? 0) >= 70) {
        initial[q.name] = q.autoMatchSuggestionId;
      } else {
        initial[q.name] = null;
      }
    }
    setMappingValues(initial);
  }, [unmappedQualifikationen]);

  // Öffne Dialog und setze Step basierend auf unmapped Qualifikationen
  const openImportDialog = useCallback(() => {
    if (unmappedQualifikationen.length > 0) {
      initializeMappingValues();
      setDialogStep('mapping');
    } else {
      setDialogStep('confirm');
    }
    setShowImportDialog(true);
  }, [unmappedQualifikationen.length, initializeMappingValues]);

  // Mapping speichern und dann zum Confirm-Step
  const handleSaveMappingsAndContinue = useCallback(async () => {
    // Nur Mappings speichern die einen Wert haben (nicht undefined)
    const mappingsToSave: BatchMappingItem[] = Object.entries(mappingValues).map(([externalName, qualifikationId]) => ({
      externalName,
      qualifikationId,
    }));

    if (mappingsToSave.length > 0) {
      try {
        await batchSaveMappingsAsync(mappingsToSave);
      } catch {
        // Error wird bereits im Hook getoastet
        return;
      }
    }

    setDialogStep('confirm');
  }, [mappingValues, batchSaveMappingsAsync]);

  // OAuth Callback Handling - Toast anzeigen und URL Parameter entfernen
  useEffect(() => {
    if (search.oauth === 'success') {
      toast.success('Erfolgreich verbunden', {
        description: 'HiOrg-Server wurde erfolgreich verbunden.',
      });
      refetchCredentials();
      // URL Parameter entfernen via TanStack Router
      navigate({ to: '/admin/integrations/hiorg', replace: true });
    } else if (search.oauth === 'error') {
      const safeMessage = typeof search.message === 'string' ? search.message.slice(0, 200) : undefined;
      toast.error('Verbindung fehlgeschlagen', {
        description: safeMessage || 'Ein unbekannter Fehler ist aufgetreten.',
      });
      // URL Parameter entfernen via TanStack Router
      navigate({ to: '/admin/integrations/hiorg', replace: true });
    }
  }, [search.oauth, search.message, refetchCredentials, navigate]);

  // Auth Guard
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Loading State
  if (isAuthLoading || isLoadingCredentials) {
    return (
      <Container className="py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  return (
    <Container className="space-y-4 py-8">
      {/* Header */}
      <div>
        <Heading level={1}>HiOrg-Server Integration</Heading>
        <Text className="text-gray-600 dark:text-gray-400">Verbinde Bluelight Hub mit deinem HiOrg-Server Account um Personen zu importieren.</Text>
      </div>

      {/* Authentifizierung & Verbindungsstatus */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <Heading level={3}>Authentifizierung</Heading>
          {credentials?.hasOAuthTokens && (
            <div className="flex items-center gap-2">
              {!credentials.isAccessTokenExpired ? (
                <Badge variant="success" size="sm" aria-label="Token gültig">
                  <PiCheckCircle className="mr-1 h-3 w-3" />
                  Token gültig
                </Badge>
              ) : credentials.hasRefreshToken ? (
                <Badge variant="warning" size="sm" aria-label="Token abgelaufen, erneuerbar">
                  <PiClock className="mr-1 h-3 w-3" />
                  Token abgelaufen
                </Badge>
              ) : (
                <Badge variant="danger" size="sm" aria-label="Erneute Anmeldung erforderlich">
                  <PiKey className="mr-1 h-3 w-3" />
                  Erneute Anmeldung erforderlich
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Inline Confirmation */}
        {authConfirmation.confirmation && (
          <div className="mb-4">
            <InlineConfirmation message={authConfirmation.confirmation.message} variant={authConfirmation.confirmation.variant} onDismiss={authConfirmation.dismiss} />
          </div>
        )}

        {credentials?.hasOAuthTokens ? (
          <div className="space-y-4">
            {/* Verbindungsinfo */}
            <div className="flex items-center gap-4">
              <PiCheckCircle className="h-8 w-8 shrink-0 text-green-500" />
              <div>
                <Text className="font-medium">OAuth2 verbunden</Text>
                {credentials.lastTestedAt && <Text className="text-xs text-gray-400">Letzter Test: {new Date(credentials.lastTestedAt).toLocaleString('de-DE')}</Text>}
                {credentials.accessTokenExpiresAt && <Text className="text-xs text-gray-400">Token gültig bis: {new Date(credentials.accessTokenExpiresAt).toLocaleString('de-DE')}</Text>}
              </div>
            </div>

            {/* Connection Info - nur bei erfolgreichem Test */}
            {connectionInfo && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Text className="font-medium text-green-800 dark:text-green-200">Erfolgreich verbunden mit: {connectionInfo.organisationName}</Text>
              </div>
            )}

            {/* Token abgelaufen - Hinweis mit nächster Aktion */}
            {credentials.isAccessTokenExpired && (
              <div
                className={`rounded-lg border p-4 ${credentials.hasRefreshToken ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2">
                  <PiWarningCircle className={`h-5 w-5 ${credentials.hasRefreshToken ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                  <Text className={`font-medium ${credentials.hasRefreshToken ? 'text-amber-800 dark:text-amber-200' : 'text-red-800 dark:text-red-200'}`}>
                    {credentials.hasRefreshToken ? 'Access Token abgelaufen' : 'Erneute Anmeldung erforderlich'}
                  </Text>
                </div>
                <Text className={`mt-1 text-sm ${credentials.hasRefreshToken ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
                  {credentials.hasRefreshToken
                    ? 'Das Token kann automatisch erneuert werden. Klicke auf "Token erneuern".'
                    : 'Das Refresh Token ist nicht verfügbar. Bitte verbinde dich erneut mit HiOrg-Server.'}
                </Text>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => testConnection()} disabled={isTestingConnection}>
                {isTestingConnection ? (
                  <>
                    <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                    Teste...
                  </>
                ) : (
                  <>
                    <PiPlugsConnected className="mr-2 h-4 w-4" />
                    Verbindung prüfen
                  </>
                )}
              </Button>

              {credentials.hasRefreshToken && (
                <Button variant="outline" onClick={() => refreshToken()} disabled={isRefreshingToken}>
                  {isRefreshingToken ? (
                    <>
                      <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                      Erneuere...
                    </>
                  ) : (
                    <>
                      <PiArrowsClockwise className="mr-2 h-4 w-4" />
                      Token erneuern
                    </>
                  )}
                </Button>
              )}

              {/* Erneut verbinden wenn kein Refresh Token */}
              {credentials.isAccessTokenExpired && !credentials.hasRefreshToken && (
                <Button onClick={() => initiateOAuth()} disabled={isInitiatingOAuth || !credentials.isOAuthConfigured}>
                  {isInitiatingOAuth ? (
                    <>
                      <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                      Verbinde...
                    </>
                  ) : (
                    <>
                      <PiPlugsConnected className="mr-2 h-4 w-4" />
                      Neu verbinden
                    </>
                  )}
                </Button>
              )}

              <Button variant="outline" intent="danger" onClick={() => setShowDisconnectDialog(true)} disabled={isDisconnecting}>
                <PiLinkBreak className="mr-2 h-4 w-4" />
                Verbindung trennen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Text className="text-gray-600 dark:text-gray-400">Klicke auf den Button um dich mit deinem HiOrg-Server Account zu verbinden. Du wirst zur HiOrg-Server Anmeldeseite weitergeleitet.</Text>

            {/* Warnung wenn OAuth nicht serverseitig konfiguriert */}
            {credentials && !credentials.isOAuthConfigured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <Text className="font-medium text-amber-800 dark:text-amber-200">OAuth nicht verfügbar</Text>
                <Text className="text-sm text-amber-700 dark:text-amber-300">
                  Die HiOrg-Server OAuth-Integration ist nicht konfiguriert. Bitte wende dich an den HiOrg-Server Support um OAuth Zugangsdaten zu erhalten.
                </Text>
              </div>
            )}

            <Button onClick={() => initiateOAuth()} disabled={isInitiatingOAuth || !credentials?.isOAuthConfigured}>
              {isInitiatingOAuth ? (
                <>
                  <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                  Verbinde...
                </>
              ) : (
                <>
                  <PiPlugsConnected className="mr-2 h-4 w-4" />
                  Mit HiOrg-Server verbinden
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Preview Section - Zeige wenn Token oder OAuth vorhanden */}
      {(credentials?.hasToken || credentials?.hasOAuthTokens) && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Heading level={3}>Personen-Vorschau & Import</Heading>
              {selectedUsernames.size > 0 && (
                <Text className="mt-1 text-sm text-gray-500">
                  {selectedUsernames.size} Person{selectedUsernames.size !== 1 ? 'en' : ''} ausgewählt
                  {duplicatesInSelection > 0 && ` (${duplicatesInSelection} bereits importiert)`}
                </Text>
              )}
            </div>
            <div className="flex gap-2">
              {selectedUsernames.size > 0 && (
                <Button intent="primary" onClick={openImportDialog}>
                  <PiDownload className="mr-2 h-4 w-4" />
                  {selectedUsernames.size} importieren
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowMappingDialog(true)}>
                <PiGear className="mr-2 h-4 w-4" />
                Mapping konfigurieren
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                <PiUsers className="mr-2 h-4 w-4" />
                {showPreview ? 'Ausblenden' : 'Vorschau laden'}
              </Button>
            </div>
          </div>

          {showPreview &&
            (isLoadingPreview ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : preview ? (
              <div>
                <Text className="mb-4 text-gray-600">{preview.totalCount} Personen gefunden</Text>
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="w-12 px-4 py-2">
                          <Checkbox checked={allSelected} onChange={toggleAll} />
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Benutzername</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Mitgliedsnr.</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Qualifikationen</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.persons.map((person) => (
                        <tr
                          key={person.username}
                          tabIndex={0}
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedUsernames.has(person.username) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          onClick={() => togglePerson(person.username)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              togglePerson(person.username);
                            }
                          }}
                        >
                          <td className="px-4 py-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedUsernames.has(person.username)} onChange={() => togglePerson(person.username)} />
                          </td>
                          <td className="px-4 py-2">
                            {person.vorname} {person.nachname}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{person.username}</td>
                          <td className="px-4 py-2 text-sm">
                            {person.mitgliednr?.trim() ? (
                              <span className="text-gray-500">{person.mitgliednr}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <PiWarningCircle className="h-4 w-4" />
                                Fehlt
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{person.qualifikationenCount}</td>
                          <td className="px-4 py-2">
                            {!person.mitgliednr?.trim() ? (
                              <Badge variant="danger" size="sm">
                                <PiWarningCircle className="mr-1 h-3 w-3" />
                                Import nicht möglich
                              </Badge>
                            ) : person.isDuplicate ? (
                              <Badge variant="warning" size="sm">
                                <PiCopy className="mr-1 h-3 w-3" />
                                Bereits importiert
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm">
                                Neu
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Keine Personen gefunden</Text>
            ))}
        </Card>
      )}

      {/* Import Dialog - Two-Step Wizard (Mapping → Confirm) */}
      <Dialog isOpen={showImportDialog} onClose={closeImportDialog} size={dialogStep === 'mapping' ? 'lg' : 'md'}>
        <Dialog.Title>{dialogStep === 'mapping' ? 'Qualifikationen zuordnen' : 'Personen importieren'}</Dialog.Title>
        <Dialog.Body>
          {dialogStep === 'mapping' ? (
            <ImportMappingStep
              unmappedQualifikationen={unmappedQualifikationen}
              localQualifikationen={localQualifikationen}
              mappingValues={mappingValues}
              onMappingChange={(externalName, qualifikationId) => setMappingValues((prev) => ({ ...prev, [externalName]: qualifikationId }))}
              isLoading={isLoadingQualifikationen}
            />
          ) : (
            <div className="space-y-4">
              <Text>
                Du möchtest <strong>{selectedUsernames.size}</strong> Person{selectedUsernames.size !== 1 ? 'en' : ''} aus HiOrg-Server importieren.
              </Text>

              {missingPersonalnummerInSelection > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <PiWarningCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <Text className="font-medium text-red-800 dark:text-red-200">
                      {missingPersonalnummerInSelection} Person{missingPersonalnummerInSelection !== 1 ? 'en' : ''} ohne Personalnummer
                    </Text>
                  </div>
                  <Text className="mt-2 text-sm text-red-700 dark:text-red-300">Diese Personen können nicht importiert werden. Bitte hinterlege zuerst die Mitgliedsnummer in HiOrg-Server.</Text>
                </div>
              )}

              {duplicatesInSelection > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <Text className="font-medium text-amber-800 dark:text-amber-200">
                    {duplicatesInSelection} bereits importierte Person{duplicatesInSelection !== 1 ? 'en' : ''} in Auswahl
                  </Text>
                  <div className="mt-3 space-y-2">
                    <Text className="text-sm text-amber-700 dark:text-amber-300">Wie soll mit Duplikaten umgegangen werden?</Text>
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="duplicateStrategy"
                          value="skip"
                          checked={duplicateStrategy === 'skip'}
                          onChange={() => setDuplicateStrategy('skip')}
                          className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          <strong>Überspringen</strong> - Nur neue Personen importieren
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="duplicateStrategy"
                          value="update"
                          checked={duplicateStrategy === 'update'}
                          onChange={() => setDuplicateStrategy('update')}
                          className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          <strong>Aktualisieren</strong> - Daten überschreiben
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {duplicatesInSelection === 0 && missingPersonalnummerInSelection === 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <Text className="text-sm text-green-800 dark:text-green-200">Alle ausgewählten Personen sind neu und werden erstellt.</Text>
                </div>
              )}
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer loading={isImporting || isSavingBatchMappings}>
          {dialogStep === 'mapping' ? (
            <>
              <Button intent="secondary" appearance="ghost" onClick={closeImportDialog} disabled={isSavingBatchMappings}>
                Abbrechen
              </Button>
              <Button intent="primary" onClick={handleSaveMappingsAndContinue} loading={isSavingBatchMappings}>
                Weiter
              </Button>
            </>
          ) : (
            <>
              <Button intent="secondary" appearance="ghost" onClick={closeImportDialog} disabled={isImporting}>
                Abbrechen
              </Button>
              <Button intent="primary" onClick={handleImport} loading={isImporting}>
                <PiDownload className="mr-2 h-4 w-4" />
                Importieren
              </Button>
            </>
          )}
        </Dialog.Footer>
      </Dialog>

      {/* Import Result Dialog */}
      {importResult && (
        <Dialog.Alert
          isOpen={!!importResult}
          onClose={clearImportResult}
          title="Import abgeschlossen"
          variant={importResult.failed > 0 ? 'warning' : 'success'}
          message={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Erstellt:</span>
                <span className="font-medium text-green-600">{importResult.created}</span>
                <span>Aktualisiert:</span>
                <span className="font-medium text-blue-600">{importResult.updated}</span>
                <span>Übersprungen:</span>
                <span className="font-medium text-gray-600">{importResult.skipped}</span>
                <span>Fehlgeschlagen:</span>
                <span className="font-medium text-red-600">{importResult.failed}</span>
              </div>
              {/* Fehlerdetails anzeigen */}
              {importResult.results?.filter((r) => r.status === 'failed').length > 0 && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <Text className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">Fehlerdetails:</Text>
                  <ul className="list-inside list-disc space-y-1 text-xs text-red-700 dark:text-red-300">
                    {importResult.results
                      .filter((r) => r.status === 'failed')
                      .map((r) => (
                        <li key={r.username}>
                          {r.vorname} {r.nachname}: {r.error ?? 'Unbekannter Fehler'}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          }
        />
      )}

      {/* Qualifikation-Mapping Dialog */}
      <QualifikationMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        mappings={mappings?.mappings}
        isLoading={isLoadingMappings}
        onSaveMapping={(mappingId, qualifikationId) => saveQualifikationMapping({ mappingId, qualifikationId })}
        isSaving={isSavingMapping}
        onAutoMatch={() => autoMatchQualifikationen({ onlyUnmapped: true })}
        isAutoMatching={isAutoMatching}
      />

      {/* Disconnect Confirmation Dialog */}
      <Dialog.Alert
        isOpen={showDisconnectDialog}
        onClose={() => setShowDisconnectDialog(false)}
        title="Verbindung trennen?"
        variant="warning"
        message="Die OAuth2-Verbindung zu HiOrg-Server wird getrennt. Du musst dich anschließend erneut verbinden, um Personen zu importieren."
        confirmLabel="Verbindung trennen"
        onConfirm={() => {
          disconnect(undefined, {
            onSuccess: () => {
              setShowDisconnectDialog(false);
              authConfirmation.show('Verbindung erfolgreich getrennt', 'success');
            },
          });
        }}
      />
    </Container>
  );
}
